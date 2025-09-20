const express = require('express');
const router = express.Router();
const { getDashboardChauffeur, getDashboardAdmin, getStatsChauffeurs, getDashboardRealtime } = require('../controllers/dashboard');
const { chauffeurMiddleware, adminMiddleware, roleMiddleware, chauffeurOuAdminMiddleware } = require('../middlewares/auth');

// Dashboard chauffeur
router.get('/chauffeur', chauffeurMiddleware, getDashboardChauffeur);

// Dashboard admin
router.get('/admin', adminMiddleware, getDashboardAdmin);
router.get('/admin/chauffeurs', adminMiddleware, getStatsChauffeurs);

// Données temps réel
router.get('/realtime', chauffeurOuAdminMiddleware, getDashboardRealtime);

module.exports = router;
