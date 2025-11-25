const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./database/connection');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const cronScheduler = require('./services/cronScheduler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const householdRoutes = require('./routes/households');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const shoppingListRoutes = require('./routes/shoppingLists');
const notificationRoutes = require('./routes/notifications');
const utilitiesRoutes = require('./routes/utilities');
const utilitySettingsRoutes = require('./routes/utility-settings');
const utilityPricingRoutes = require('./routes/utility-pricing');
const utilityCalculatorRoutes = require('./routes/utility-calculator');
const householdCostsRoutes = require('./routes/household-costs');
const otherExpensesRoutes = require('./routes/other-expenses');
const recipesRoutes = require('./routes/recipes');
const uploadRoutes = require('./routes/upload');
const publicRecipesRoutes = require('./routes/public-recipes');
const recipeImportRoutes = require('./routes/recipe-import');
const statisticsRoutes = require('./routes/statistics');
const consumptionRoutes = require('./routes/consumption');
const householdSettingsRoutes = require('./routes/household-settings');
const userSettingsRoutes = require('./routes/user-settings');
const pushNotificationRoutes = require('./routes/push-notifications');
const notificationSchedulerRoutes = require('./routes/notification-scheduler');
const systemSettingsRoutes = require('./routes/system-settings');
const inAppNotificationsRoutes = require('./routes/in-app-notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// =====================================================
// MIDDLEWARE SETUP
// =====================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        'https://127.0.0.1:3000',
        'https://192.168.0.19:3000',
        'http://192.168.0.19:3000'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Current-Household'],
  exposedHeaders: ['X-Total-Count'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
};

// Enable pre-flight for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Túl sok kérés érkezett. Próbáld újra később.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.LOG_FORMAT || 'combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Redis session store setup
let redisClient;
if (process.env.NODE_ENV !== 'test') {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });
  
  redisClient.on('connect', () => {
    logger.info('Redis Client Connected');
  });
}

// Session configuration
 /* 
app.use(session({
  store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
*/
// haztartasiapp/server/src/server.js - JAVÍTOTT BLOKK
app.use(session({
  store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // KÖTELEZŐ IGAZ-ra állítani, mert HTTPS-t használsz,
    // függetlenül attól, hogy dev vagy prod.
    secure: true, 
    
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 óra
    
    // KÖTELEZŐ a cross-origin (:3000 -> :3001) kérésekhez
    sameSite: 'none' 
  },
}));

// =====================================================
// ROUTES
// =====================================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/households', householdRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/shopping-lists', shoppingListRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/utilities', utilitiesRoutes);
apiRouter.use('/utility-settings', utilitySettingsRoutes);
apiRouter.use('/utility-pricing', utilityPricingRoutes);
apiRouter.use('/utility-calculator', utilityCalculatorRoutes);
apiRouter.use('/household-costs', householdCostsRoutes);
apiRouter.use('/other-expenses', otherExpensesRoutes);
apiRouter.use('/recipes', recipesRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/shared-recipes', publicRecipesRoutes);
apiRouter.use('/recipe-import', recipeImportRoutes);
apiRouter.use('/statistics', statisticsRoutes);
apiRouter.use('/households/:householdId/consumption', consumptionRoutes);
apiRouter.use('/households', householdSettingsRoutes);
apiRouter.use('/users', userSettingsRoutes);
apiRouter.use('/push', pushNotificationRoutes);
apiRouter.use('/scheduler', notificationSchedulerRoutes);
apiRouter.use('/system-settings', systemSettingsRoutes);
apiRouter.use('/in-app-notifications', inAppNotificationsRoutes);

app.use(`/api/${process.env.API_VERSION || 'v1'}`, apiRouter);

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API documentation (development only)
if (process.env.ENABLE_API_DOCS === 'true' && process.env.NODE_ENV === 'development') {
  app.get('/api/docs', (req, res) => {
    res.json({
      title: 'Háztartási App API Documentation',
      version: '1.0.0',
      baseUrl: `http://localhost:${PORT}/api/v1`,
      endpoints: {
        auth: {
          'POST /auth/register': 'Felhasználó regisztráció',
          'POST /auth/login': 'Bejelentkezés',
          'POST /auth/logout': 'Kijelentkezés',
          'POST /auth/refresh': 'Token frissítés',
          'GET /auth/me': 'Aktuális felhasználó adatai'
        },
        households: {
          'GET /households': 'Felhasználó háztartásai',
          'POST /households': 'Új háztartás létrehozása',
          'GET /households/:id': 'Háztartás részletei',
          'PUT /households/:id': 'Háztartás módosítása',
          'POST /households/:id/invite': 'Meghívó generálása',
          'POST /households/join/:code': 'Csatlakozás háztartáshoz'
        },
        products: {
          'GET /products/search': 'Termék keresés',
          'GET /products/barcode/:barcode': 'Termék keresés vonalkód alapján',
          'POST /products': 'Egyedi termék létrehozása'
        },
        inventory: {
          'GET /households/:id/inventory': 'Háztartási készlet',
          'POST /households/:id/inventory': 'Termék hozzáadása készlethez',
          'PUT /inventory/:id': 'Készlet tétel módosítása',
          'DELETE /inventory/:id': 'Termék eltávolítása készletből'
        },
        utilities: {
          'GET /utilities/types': 'Közműtípusok listája',
          'GET /utilities': 'Háztartás közműfogyasztásai',
          'POST /utilities': 'Új mérőóra állás rögzítése',
          'PUT /utilities/:id': 'Mérőóra állás módosítása',
          'DELETE /utilities/:id': 'Mérőóra állás törlése',
          'GET /utilities/stats/:household_id': 'Fogyasztási statisztikák'
        },
        'utility-settings': {
          'GET /utility-settings/:household_id': 'Háztartás közműbeállításai',
          'POST /utility-settings/:household_id': 'Közműbeállítás létrehozása/frissítése',
          'PUT /utility-settings/:household_id/:utility_type_id': 'Közműbeállítás módosítása',
          'DELETE /utility-settings/:household_id/:utility_type_id': 'Közműbeállítás letiltása',
          'GET /utility-settings/:household_id/calculate/:utility_type_id': 'Költségkalkulátor'
        }
      }
    });
  });
}

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// =====================================================
// SERVER STARTUP
// =====================================================

async function startServer() {
  try {
    // Connect to Redis
    if (redisClient) {
      await redisClient.connect();
    }

    // Connect to database
    await connectDatabase();
    
    // Start server (HTTP vagy HTTPS)
    let server;
    
    if (process.env.HTTPS_ENABLED === 'true') {
      // HTTPS szerver
      try {
        const keyPath = path.resolve(process.env.SSL_KEY_PATH || './certs/key.pem');
        const certPath = path.resolve(process.env.SSL_CERT_PATH || './certs/cert.pem');
        
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
          const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
          
          server = https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', async () => {
            logger.info(`🚀 Háztartási App Backend elindult! (HTTPS)`);
            logger.info(`📍 Port: ${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
            logger.info(`📚 API Docs: https://192.168.0.19:${PORT}/api/docs`);
            logger.info(`❤️  Health Check: https://192.168.0.19:${PORT}/health`);
            
            // Cron scheduler indítása (csak ha engedélyezve van)
            if (process.env.ENABLE_CRON_SCHEDULER === 'true') {
              try {
                await cronScheduler.startCronJobs();
                logger.info('✅ Cron scheduler elindítva');
              } catch (error) {
                logger.error('Failed to start cron jobs:', error);
              }
            } else {
              logger.info('⏸️  Cron scheduler letiltva (ENABLE_CRON_SCHEDULER=false)');
            }
          });
        } else {
          logger.warn('SSL tanúsítványok nem találhatók, HTTP módra váltás...');
          server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Háztartási App Backend elindult! (HTTP)`);
            logger.info(`📍 Port: ${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
            logger.info(`📚 API Docs: http://192.168.0.19:${PORT}/api/docs`);
            logger.info(`❤️  Health Check: http://192.168.0.19:${PORT}/health`);
          });
        }
      } catch (error) {
        logger.error('HTTPS szerver indítási hiba:', error);
        server = app.listen(PORT, '0.0.0.0', () => {
          logger.info(`🚀 Háztartási App Backend elindult! (HTTP fallback)`);
          logger.info(`📍 Port: ${PORT}`);
        });
      }
    } else {
      // HTTP szerver
      server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Háztartási App Backend elindult! (HTTP)`);
        logger.info(`📍 Port: ${PORT}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
        logger.info(`📚 API Docs: http://192.168.0.19:${PORT}/api/docs`);
        logger.info(`❤️  Health Check: http://192.168.0.19:${PORT}/health`);
      });
    }

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      if (process.env.ENABLE_CRON_SCHEDULER === 'true') {
        cronScheduler.stopCronJobs();
      }
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      if (process.env.ENABLE_CRON_SCHEDULER === 'true') {
        cronScheduler.stopCronJobs();
      }
      if (redisClient) {
        await redisClient.quit();
      }
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
