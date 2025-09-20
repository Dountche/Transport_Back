const express = require('express');
const router = express.Router();
const {getProfile, updateProfile, deleteProfile } = require('../controllers/users');
const {authMiddleware} = require('../middlewares/auth');

// profil
router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.delete('/me', authMiddleware, deleteProfile);


module.exports = router;
