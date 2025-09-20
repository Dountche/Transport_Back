
const express = require('express');
const router = express.Router();
const { createReservation, getReservationsChauffeur, updateReservationStatus, getClientReservations } = require('../controllers/reservations');
const { clientMiddleware, chauffeurMiddleware, authMiddleware } = require('../middlewares/auth');

// Routes clients
router.post('/', clientMiddleware, createReservation);
router.get('/mes-reservations', clientMiddleware, getClientReservations);

// Routes chauffeurs
router.get('/chauffeur', chauffeurMiddleware, getReservationsChauffeur);

// Routes partagées
router.put('/:id/statut', authMiddleware, updateReservationStatus);

module.exports = router;