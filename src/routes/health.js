const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const redisClient = require('../config/redisClient');

/**
 * @route GET /api/health
 * @desc Endpoint de santé pour Render.com
 */
router.get('/', async (req, res) => {
  try {
    // Vérifier la connexion PostgreSQL
    await sequelize.authenticate();
    
    // Vérifier la connexion Redis
    const redisStatus = redisClient.status === 'ready' ? 'connected' : 'disconnected';
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        database: 'connected',
        redis: redisStatus
      },
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;