const express = require("express");
const router = express.Router();
const { requestEmailVerification, verifyAndRegister, login, requestPasswordReset, verifyPasswordResetToken, resetPassword } = require("../controllers/auth");

const rateLimit = require("express-rate-limit");

// === Rate limiters ===
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  limit: 5,                // max 5 requêtes
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de tentatives, veuillez réessayer plus tard"
});

const emailLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  limit: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop d'emails envoyés, attendez avant de réessayer"
});

// === INSCRIPTION ===
//Demander la vérification email
router.post("/register/requestVerification", emailLimiter, requestEmailVerification);

//Vérifier le code et créer le compte
router.post("/register/verify", authLimiter, verifyAndRegister);

// === CONNEXION ===
router.post("/login", authLimiter, login);


// === RESET MOT DE PASSE ===

// Demander un lien de reset
router.post("/password/forgot", emailLimiter, requestPasswordReset);
// Vérifier que le token de reset est valide
router.get("/password/verify/:token", verifyPasswordResetToken);
//Réinitialiser le mot de passe
router.post("/password/reset", authLimiter, resetPassword);

module.exports = router;

