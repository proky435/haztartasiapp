const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * JWT token verification middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Hozzáférés megtagadva',
        message: 'Hiányzó autentikációs token'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const userResult = await query(
      'SELECT id, email, name, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      logger.logSecurity('INVALID_TOKEN_USER_NOT_FOUND', decoded.userId);
      return res.status(401).json({
        error: 'Érvénytelen token',
        message: 'Felhasználó nem található'
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if email is verified (optional, based on your requirements)
    if (!user.email_verified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      return res.status(403).json({
        error: 'Email megerősítés szükséges',
        message: 'Kérjük, erősítsd meg az email címedet'
      });
    }
    
    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.email_verified
    };
    
    // Set user context for database RLS
    req.userContext = { userId: user.id };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.logSecurity('INVALID_JWT_TOKEN', null, { error: error.message });
      return res.status(401).json({
        error: 'Érvénytelen token',
        message: 'A token formátuma hibás'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.logSecurity('EXPIRED_JWT_TOKEN', null, { expiredAt: error.expiredAt });
      return res.status(401).json({
        error: 'Lejárt token',
        message: 'A token lejárt, kérjük jelentkezz be újra'
      });
    }
    
    logger.logError(error, req, { middleware: 'authenticateToken' });
    return res.status(500).json({
      error: 'Szerver hiba',
      message: 'Autentikáció során hiba történt'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await query(
      'SELECT id, email, name, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified
      };
      req.userContext = { userId: user.id };
    }
  } catch (error) {
    // Silently ignore token errors in optional auth
    logger.debug('Optional auth token error:', error.message);
  }
  
  next();
};

/**
 * Role-based authorization middleware
 */
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Autentikáció szükséges',
          message: 'Jelentkezz be a folytatáshoz'
        });
      }
      
      const householdId = req.params.householdId || req.body.householdId;
      
      if (!householdId) {
        return res.status(400).json({
          error: 'Hiányzó háztartás azonosító',
          message: 'A háztartás azonosító megadása kötelező'
        });
      }
      
      // Check user's role in the household
      const roleResult = await query(`
        SELECT role, permissions 
        FROM household_members 
        WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
      `, [householdId, req.user.id]);
      
      if (roleResult.rows.length === 0) {
        logger.logSecurity('UNAUTHORIZED_HOUSEHOLD_ACCESS', req.user.id, { householdId });
        return res.status(403).json({
          error: 'Hozzáférés megtagadva',
          message: 'Nem vagy tagja ennek a háztartásnak'
        });
      }
      
      const userRole = roleResult.rows[0].role;
      const permissions = roleResult.rows[0].permissions || {};
      
      // Role hierarchy: admin > member > viewer
      const roleHierarchy = { admin: 3, member: 2, viewer: 1 };
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      const userLevel = roleHierarchy[userRole] || 0;
      
      if (userLevel < requiredLevel) {
        logger.logSecurity('INSUFFICIENT_ROLE', req.user.id, { 
          householdId, 
          userRole, 
          requiredRole 
        });
        return res.status(403).json({
          error: 'Nincs megfelelő jogosultságod',
          message: `${requiredRole} jogosultság szükséges ehhez a művelethez`
        });
      }
      
      // Add household context to request
      req.household = {
        id: householdId,
        userRole,
        permissions
      };
      
      next();
    } catch (error) {
      logger.logError(error, req, { middleware: 'requireRole', requiredRole });
      return res.status(500).json({
        error: 'Szerver hiba',
        message: 'Jogosultság ellenőrzés során hiba történt'
      });
    }
  };
};

/**
 * Permission-based authorization middleware
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.household) {
        return res.status(500).json({
          error: 'Konfigurációs hiba',
          message: 'Háztartás kontextus hiányzik'
        });
      }
      
      const { userRole, permissions } = req.household;
      
      // Admins have all permissions
      if (userRole === 'admin') {
        return next();
      }
      
      // Check specific permission
      if (permissions[permission] === true) {
        return next();
      }
      
      // Default permissions based on role
      const defaultPermissions = {
        member: [
          'view_inventory',
          'add_inventory',
          'update_inventory',
          'create_shopping_list',
          'update_shopping_list'
        ],
        viewer: [
          'view_inventory',
          'view_shopping_list'
        ]
      };
      
      const rolePermissions = defaultPermissions[userRole] || [];
      
      if (!rolePermissions.includes(permission)) {
        logger.logSecurity('INSUFFICIENT_PERMISSION', req.user.id, { 
          householdId: req.household.id,
          permission,
          userRole
        });
        return res.status(403).json({
          error: 'Nincs megfelelő jogosultságod',
          message: `${permission} jogosultság szükséges ehhez a művelethez`
        });
      }
      
      next();
    } catch (error) {
      logger.logError(error, req, { middleware: 'requirePermission', permission });
      return res.status(500).json({
        error: 'Szerver hiba',
        message: 'Jogosultság ellenőrzés során hiba történt'
      });
    }
  };
};

/**
 * Generate JWT token
 */
const generateToken = (userId, expiresIn = null) => {
  const payload = { userId };
  const options = {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '15m'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  const payload = { userId, type: 'refresh' };
  const options = {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, options);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
