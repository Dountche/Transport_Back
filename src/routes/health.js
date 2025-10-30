const express = require('express');
const router = express.Router();
const { ValidatedRedistConnection } = require('../config/redis'); // Redis

router.get('/', async (req, res) => {
  try {
    // Vérifier Redis
    await ValidatedRedistConnection();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        redis: 'connected'
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        redis: 'disconnected'
      },
      error: error.message
    });
  }
});

module.exports = router;
