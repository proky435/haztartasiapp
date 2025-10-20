const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection pool
let pool;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'haztartasi_app',
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'secure_password123',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used this many times
};

/**
 * Initialize database connection pool
 */
async function connectDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    
    logger.info('✅ PostgreSQL kapcsolat sikeresen létrehozva');
    logger.info(`📅 Aktuális idő: ${result.rows[0].current_time}`);
    logger.info(`🐘 PostgreSQL verzió: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // Pool event listeners
    pool.on('connect', (client) => {
      logger.debug('Új PostgreSQL kliens csatlakozott');
    });
    
    pool.on('error', (err, client) => {
      logger.error('PostgreSQL pool hiba:', err);
    });
    
    pool.on('remove', (client) => {
      logger.debug('PostgreSQL kliens eltávolítva a pool-ból');
    });
    
    return pool;
  } catch (error) {
    logger.error('❌ Adatbázis kapcsolat hiba:', error);
    throw error;
  }
}

/**
 * Get database pool instance
 */
function getPool() {
  if (!pool) {
    throw new Error('Adatbázis kapcsolat nincs inicializálva. Hívd meg a connectDatabase() függvényt először.');
  }
  return pool;
}

/**
 * Execute a query with automatic connection handling
 */
async function query(text, params = []) {
  const start = Date.now();
  const client = await getPool().connect();
  
  try {
    // Set the current user context for RLS
    if (params && params.userId) {
      await client.query(`SET app.current_user_id = '${params.userId}'`);
    }
    
    const queryParams = Array.isArray(params) ? params : (params && params.values ? params.values : []);
    const result = await client.query(text, queryParams);
    const duration = Date.now() - start;
    
    logger.debug('Query executed', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Query error:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('🔌 Adatbázis kapcsolat lezárva');
  }
}

/**
 * Health check for database
 */
async function healthCheck() {
  try {
    const result = await query('SELECT 1 as healthy');
    return {
      status: 'healthy',
      message: 'Database connection is working',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get database statistics
 */
async function getStats() {
  try {
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    
    const dbStats = await query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      ORDER BY schemaname, tablename
    `);
    
    return {
      pool: poolStats,
      tables: dbStats.rows
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return null;
  }
}

module.exports = {
  connectDatabase,
  getPool,
  query,
  transaction,
  closeDatabase,
  healthCheck,
  getStats
};
