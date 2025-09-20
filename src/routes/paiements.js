const express = require('express');
const router = express.Router();
const {createPaiement, listPaiements, listUserPaiements, lastPaymentForUser, createPaiementEspeces, waveWebhookHandler } = require('../controllers/paiements');
const { clientMiddleware, adminMiddleware, chauffeurMiddleware, authMiddleware } = require('../middlewares/auth');

// Middleware raw body pour le webhook
router.use('/webhook/wave', express.raw({ type: 'application/json' }));

// Routes clients
router.post('/', clientMiddleware, createPaiement);
router.get('/user/:userId', authMiddleware, listUserPaiements);
router.get('/user/:userId/last', authMiddleware, lastPaymentForUser);

// Routes admin
router.get('/', adminMiddleware, listPaiements);

//routes chauffeur
router.post('/especes', chauffeurMiddleware, createPaiementEspeces);

// Webhook Wave (public)
router.post('/webhook/wave', (req, res) => {
  req.rawBody = req.body;
  waveWebhookHandler(req, res);
});

module.exports = router;