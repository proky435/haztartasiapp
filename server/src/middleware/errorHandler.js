const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.logError(error, req, {
    middleware: 'errorHandler',
    stack: error.stack
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Szerver hiba',
    message: 'Váratlan hiba történt',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validációs hiba',
      message: 'A megadott adatok nem megfelelőek',
      details: error.details || error.message
    };
  }

  if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      error: 'Hitelesítési hiba',
      message: 'Érvénytelen vagy hiányzó hitelesítési token'
    };
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      error: 'Token lejárt',
      message: 'A hitelesítési token lejárt, kérjük jelentkezz be újra'
    };
  }

  if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse = {
      error: 'Hozzáférés megtagadva',
      message: 'Nincs jogosultságod ehhez a művelethez'
    };
  }

  if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse = {
      error: 'Nem található',
      message: 'A keresett erőforrás nem található'
    };
  }

  // PostgreSQL specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        statusCode = 409;
        errorResponse = {
          error: 'Adatütközés',
          message: 'Az adat már létezik az adatbázisban'
        };
        break;
      
      case '23503': // Foreign key violation
        statusCode = 400;
        errorResponse = {
          error: 'Hivatkozási hiba',
          message: 'Hivatkozott adat nem található'
        };
        break;
      
      case '23502': // Not null violation
        statusCode = 400;
        errorResponse = {
          error: 'Hiányzó kötelező adat',
          message: 'Kötelező mező nem lehet üres'
        };
        break;
      
      case '42P01': // Undefined table
        statusCode = 500;
        errorResponse = {
          error: 'Adatbázis hiba',
          message: 'Adatbázis séma hiba'
        };
        break;
    }
  }

  // Rate limiting error
  if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    errorResponse = {
      error: 'Túl sok kérés',
      message: 'Túl sok kérés érkezett. Próbáld újra később.',
      retryAfter: error.retryAfter
    };
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorResponse = {
      error: 'Fájl túl nagy',
      message: 'A feltöltött fájl mérete meghaladja a megengedett limitet'
    };
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    errorResponse = {
      error: 'Érvénytelen fájl',
      message: 'Nem várt fájl típus'
    };
  }

  // Network/API errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    errorResponse = {
      error: 'Szolgáltatás nem elérhető',
      message: 'Külső szolgáltatás jelenleg nem elérhető'
    };
  }

  if (error.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorResponse = {
      error: 'Időtúllépés',
      message: 'A kérés feldolgozása túl sokáig tartott'
    };
  }

  // Custom application errors
  if (error.isOperational) {
    statusCode = error.statusCode || 400;
    errorResponse = {
      error: error.name || 'Alkalmazás hiba',
      message: error.message
    };
  }

  // Add request ID for tracking (if available)
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      name: error.name,
      code: error.code,
      originalError: error.message
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
