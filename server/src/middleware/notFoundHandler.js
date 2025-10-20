const logger = require('../utils/logger');

/**
 * 404 Not Found handler middleware
 */
const notFoundHandler = (req, res, next) => {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  res.status(404).json({
    error: 'Nem található',
    message: `A kért erőforrás (${req.method} ${req.originalUrl}) nem található`,
    timestamp: new Date().toISOString(),
    availableEndpoints: process.env.NODE_ENV === 'development' ? {
      auth: [
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'POST /api/v1/auth/logout',
        'GET /api/v1/auth/me'
      ],
      households: [
        'GET /api/v1/households',
        'POST /api/v1/households',
        'GET /api/v1/households/:id',
        'PUT /api/v1/households/:id'
      ],
      products: [
        'GET /api/v1/products/search',
        'GET /api/v1/products/barcode/:barcode',
        'POST /api/v1/products/custom'
      ],
      other: [
        'GET /health',
        'GET /api/docs'
      ]
    } : undefined
  });
};

module.exports = notFoundHandler;
