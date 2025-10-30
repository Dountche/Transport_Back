const express = require('express');
const router = express.Router();
const {chauffeurOuAdminMiddleware, authMiddleware} = require('../middlewares/auth');

const {postPosition, getLast, getRouteHandler, getRoute} = require('../controllers/positionGPS');

router.post('/', chauffeurOuAdminMiddleware, postPosition);
router.get('/last/:vehiculeId/', authMiddleware, getLast);
router.get('/route/:vehiculeId/', authMiddleware, getRouteHandler);

module.exports = router;
