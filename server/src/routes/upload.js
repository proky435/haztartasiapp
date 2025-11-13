const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Uploads mappa létrehozása ha nem létezik
const uploadsDir = path.join(__dirname, '../../uploads/recipes');

const ensureUploadsDir = async () => {
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
    logger.info('Uploads directory created:', uploadsDir);
  }
};

// Multer konfiguráció
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Egyedi fájlnév generálása
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter - csak képek engedélyezése
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Csak kép fájlok engedélyezettek (JPEG, PNG, WebP, GIF)'), false);
  }
};

// Multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Egy fájl egyszerre
  }
});

// Kép feltöltés endpoint
router.post('/recipe-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Nincs fájl feltöltve',
        details: 'Kérjük válasszon egy képfájlt'
      });
    }

    // Relatív URL generálása
    const imageUrl = `/uploads/recipes/${req.file.filename}`;
    
    logger.info(`Recipe image uploaded: ${req.file.filename} by user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Kép sikeresen feltöltve',
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    logger.error('Recipe image upload error:', error);
    
    // Töröljük a fájlt ha hiba történt
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Hiba a kép feltöltésekor',
      details: error.message
    });
  }
});

// Kép törlés endpoint
router.delete('/recipe-image/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Biztonsági ellenőrzés - csak a uploads/recipes mappából törlünk
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Érvénytelen fájlnév'
      });
    }

    const filePath = path.join(uploadsDir, filename);
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      logger.info(`Recipe image deleted: ${filename} by user ${req.user.id}`);
      
      res.status(200).json({
        success: true,
        message: 'Kép sikeresen törölve'
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: 'A fájl nem található'
        });
      }
      throw error;
    }

  } catch (error) {
    logger.error('Recipe image delete error:', error);
    res.status(500).json({
      error: 'Hiba a kép törlésekor',
      details: error.message
    });
  }
});

// Error handler multer hibákhoz
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'A fájl túl nagy',
        details: 'Maximum 5MB méretű képek engedélyezettek'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Túl sok fájl',
        details: 'Egyszerre csak egy képet lehet feltölteni'
      });
    }
  }
  
  if (error.message.includes('Csak kép fájlok')) {
    return res.status(400).json({
      error: 'Érvénytelen fájltípus',
      details: error.message
    });
  }

  next(error);
});

module.exports = router;
