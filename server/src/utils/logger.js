const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// File transports
transports.push(
  // Error logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    handleExceptions: true,
    handleRejections: true
  }),
  
  // Combined logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d'
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports,
  exitOnError: false
});

// Add request logging helper
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || 'anonymous'
  };
  
  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

// Add error logging helper
logger.logError = (error, req = null, additionalInfo = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...additionalInfo
  };
  
  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?.id
    };
  }
  
  logger.error('Application Error', errorData);
};

// Add database logging helper
logger.logQuery = (query, params, duration, error = null) => {
  const logData = {
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    params: params ? JSON.stringify(params).substring(0, 100) : null,
    duration: `${duration}ms`
  };
  
  if (error) {
    logger.error('Database Query Error', { ...logData, error: error.message });
  } else {
    logger.debug('Database Query', logData);
  }
};

// Add performance logging helper
logger.logPerformance = (operation, duration, metadata = {}) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...metadata
  };
  
  if (duration > 1000) {
    logger.warn('Slow Operation', logData);
  } else {
    logger.debug('Performance', logData);
  }
};

// Add security logging helper
logger.logSecurity = (event, userId, details = {}) => {
  logger.warn('Security Event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
});

module.exports = logger;
