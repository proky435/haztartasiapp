const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../database/connection');
const { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  authenticateToken 
} = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/v1/auth/register
 * Felhasználó regisztráció
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Érvényes email cím megadása kötelező'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('A jelszónak legalább 8 karakter hosszúnak kell lennie')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('A jelszónak tartalmaznia kell kis- és nagybetűt, valamint számot'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('A név 2-100 karakter hosszú lehet'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('A jelszavak nem egyeznek');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Validation errors check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        message: 'A megadott adatok nem megfelelőek',
        details: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      logger.logSecurity('REGISTRATION_ATTEMPT_EXISTING_EMAIL', null, { email });
      return res.status(409).json({
        error: 'Felhasználó már létezik',
        message: 'Ez az email cím már regisztrálva van'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in transaction
    const result = await transaction(async (client) => {
      // Insert user
      const userResult = await client.query(`
        INSERT INTO users (email, password_hash, name, email_verified)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, name, email_verified, created_at
      `, [email, passwordHash, name, false]);

      const user = userResult.rows[0];

      // Create default user settings
      await client.query(`
        INSERT INTO user_settings (user_id, notification_preferences, ui_preferences, language)
        VALUES ($1, $2, $3, $4)
      `, [
        user.id,
        JSON.stringify({
          email: true,
          push: true,
          expiry_warnings: true,
          low_stock: true,
          shopping_list_updates: true
        }),
        JSON.stringify({
          theme: 'light',
          language: 'hu',
          compact_view: false,
          show_welcome: true
        }),
        'hu'
      ]);

      // Create default household for new user
      const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const householdResult = await client.query(`
        INSERT INTO households (name, description, invite_code, invite_code_expires)
        VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
        RETURNING *
      `, [`${user.name} háztartása`, 'Az első háztartásom', inviteCode]);

      const household = householdResult.rows[0];

      // Add user as admin to the new household
      await client.query(`
        INSERT INTO household_members (household_id, user_id, role, invited_by_user_id)
        VALUES ($1, $2, 'admin', $2)
      `, [household.id, user.id]);

      // Create default household settings
      await client.query(`
        INSERT INTO household_settings (
          household_id, auto_shopping_enabled, expiry_warning_days, 
          low_stock_threshold, preferred_stores, budget_settings
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        household.id,
        true,
        3,
        1.0,
        JSON.stringify([]),
        JSON.stringify({ monthly_limit: null, categories: {} })
      ]);

      // Add household info to user object
      user.defaultHousehold = {
        id: household.id,
        name: household.name,
        role: 'admin'
      };

      return user;
    });

    // Generate tokens
    const accessToken = generateToken(result.id);
    const refreshToken = generateRefreshToken(result.id);

    logger.info('User registered successfully', {
      userId: result.id,
      email: result.email
    });

    res.status(201).json({
      message: 'Regisztráció sikeres',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        emailVerified: result.email_verified,
        createdAt: result.created_at,
        defaultHousehold: result.defaultHousehold
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'register' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Regisztráció során hiba történt'
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Felhasználó bejelentkezés
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Érvényes email cím megadása kötelező'),
  body('password')
    .notEmpty()
    .withMessage('Jelszó megadása kötelező')
], async (req, res) => {
  try {
    // Validation errors check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        message: 'A megadott adatok nem megfelelőek',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get user from database
    const userResult = await query(`
      SELECT id, email, password_hash, name, email_verified, last_login
      FROM users 
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      logger.logSecurity('LOGIN_ATTEMPT_INVALID_EMAIL', null, { email });
      return res.status(401).json({
        error: 'Hibás bejelentkezési adatok',
        message: 'Email cím vagy jelszó helytelen'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      logger.logSecurity('LOGIN_ATTEMPT_INVALID_PASSWORD', user.id, { email });
      return res.status(401).json({
        error: 'Hibás bejelentkezési adatok',
        message: 'Email cím vagy jelszó helytelen'
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Get user's households
    const householdsResult = await query(`
      SELECT h.id, h.name, hm.role
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
      ORDER BY hm.joined_at ASC
    `, [user.id]);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      householdsCount: householdsResult.rows.length
    });

    // JWT tokenek használata esetén nincs session cookie
    console.log('--- JWT TOKENEK GENERÁLVA ---');
    console.log('Access Token:', accessToken ? 'Generated' : 'Failed');
    console.log('Refresh Token:', refreshToken ? 'Generated' : 'Failed');
    console.log('------------------------------');

    res.json({
      message: 'Bejelentkezés sikeres',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        households: householdsResult.rows
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'login' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Bejelentkezés során hiba történt'
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Token frissítés
 */
router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token megadása kötelező')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if user still exists
    const userResult = await query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      logger.logSecurity('REFRESH_TOKEN_INVALID_USER', decoded.userId);
      return res.status(401).json({
        error: 'Érvénytelen token',
        message: 'Felhasználó nem található'
      });
    }

    // Generate new tokens
    const newAccessToken = generateToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    logger.debug('Tokens refreshed successfully', { userId: decoded.userId });

    res.json({
      message: 'Token frissítés sikeres',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.logSecurity('INVALID_REFRESH_TOKEN', null, { error: error.message });
      return res.status(401).json({
        error: 'Érvénytelen refresh token',
        message: 'Kérjük jelentkezz be újra'
      });
    }

    logger.logError(error, req, { operation: 'refresh' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Token frissítés során hiba történt'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Kijelentkezés
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated setup, you would invalidate the token
    // For now, we just log the logout event
    logger.info('User logged out', { userId: req.user.id });

    res.json({
      message: 'Kijelentkezés sikeres'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'logout' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Kijelentkezés során hiba történt'
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Aktuális felhasználó adatai
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Get detailed user info with settings
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.name, u.email_verified, u.last_login, u.created_at,
        us.notification_preferences, us.ui_preferences, us.language
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Felhasználó nem található'
      });
    }

    const user = userResult.rows[0];

    // Get user's households
    const householdsResult = await query(`
      SELECT h.id, h.name, h.description, hm.role, hm.joined_at
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
      ORDER BY hm.joined_at ASC
    `, [req.user.id]);

    // Get unread notifications count
    const notificationsResult = await query(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND read_at IS NULL
    `, [req.user.id]);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        settings: {
          notifications: user.notification_preferences || {},
          ui: user.ui_preferences || {},
          language: user.language || 'hu'
        },
        households: householdsResult.rows,
        unreadNotifications: parseInt(notificationsResult.rows[0].unread_count)
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getMe' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Felhasználói adatok lekérése során hiba történt'
    });
  }
});

/**
 * Demo login endpoint (development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/demo-login', async (req, res) => {
    try {
      // Get demo user
      const userResult = await query(`
        SELECT id, email, name, email_verified
        FROM users 
        WHERE email = 'demo@haztartasi.app'
        LIMIT 1
      `);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Demo felhasználó nem található',
          message: 'Futtasd le az adatbázis seed scriptet'
        });
      }

      const user = userResult.rows[0];

      // Generate tokens
      const accessToken = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Get households
      const householdsResult = await query(`
        SELECT h.id, h.name, hm.role
        FROM households h
        JOIN household_members hm ON h.id = hm.household_id
        WHERE hm.user_id = $1 AND hm.left_at IS NULL
      `, [user.id]);

      logger.info('Demo login successful', { userId: user.id });

      res.json({
        message: 'Demo bejelentkezés sikeres',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.email_verified,
          households: householdsResult.rows
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '15m'
        }
      });

    } catch (error) {
      logger.logError(error, req, { operation: 'demoLogin' });
      res.status(500).json({
        error: 'Szerver hiba',
        message: 'Demo bejelentkezés során hiba történt'
      });
    }
  });
}

module.exports = router;
