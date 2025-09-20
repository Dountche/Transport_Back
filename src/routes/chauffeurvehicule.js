const express = require('express');
const router = express.Router();
const { getMesVehicules, updateStatutGPS, getTrajetsJour, envoyerPositionGPS, getHistoriqueGPS } = require('../controllers/chauffeurvehicules');
const { chauffeurMiddleware } = require('../middlewares/auth');

router.get('/mes-vehicules', chauffeurMiddleware, getMesVehicules);
router.put('/:vehiculeId/gps', chauffeurMiddleware, updateStatutGPS);
router.get('/:vehiculeId/trajets', chauffeurMiddleware, getTrajetsJour);
router.post('/:vehiculeId/position', chauffeurMiddleware, envoyerPositionGPS);
router.get('/:vehiculeId/historique-gps', chauffeurMiddleware, getHistoriqueGPS);

module.exports = router;
