const express = require('express');
const router = express.Router();
const {chauffeurOuAdminMiddleware} = require('../middlewares/auth');

const {postPosition, getLast, getRouteHandler, getRoute} = require('../controllers/positionGPS');

router.post('/', chauffeurOuAdminMiddleware, postPosition);
router.get('/last/:vehiculeId/', chauffeurOuAdminMiddleware, getLast);
router.get('/route/:vehiculeId/', chauffeurOuAdminMiddleware, getRouteHandler);

module.exports = router;
