const jwt = require("jsonwebtoken");
const { Utilisateur, Role } = require('../models');

// Middleware de base pour l'authentification
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Token manquant ou utilisateur non connecté" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Format du token invalide" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer l'utilisateur avec son rôle
    const utilisateur = await Utilisateur.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'role'
      }]
    });

    if (!utilisateur) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    req.Utilisateur = {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      role_id: utilisateur.role_id,
      role: utilisateur.role?.nom || null
    };

    next();
  } catch (err) {
    return res.status(403).json({ message: "Token invalide ou expiré" });
  }
};

// Middleware pour clients uniquement
const clientMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.Utilisateur && req.Utilisateur.role === 'client') {
      next();
    } else {
      return res.status(403).json({ 
        message: "Accès refusé. Cette action est réservée aux clients." 
      });
    }
  });
};

// Middleware pour chauffeurs uniquement
const chauffeurMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.Utilisateur && req.Utilisateur.role === 'chauffeur') {
      next();
    } else {
      return res.status(403).json({ 
        message: "Accès refusé. Cette action est réservée aux chauffeurs." 
      });
    }
  });
};

// Middleware pour administrateurs uniquement
const adminMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.Utilisateur && req.Utilisateur.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        message: "Accès refusé. Cette action est réservée aux administrateurs." 
      });
    }
  });
};

// Middleware flexible pour plusieurs rôles
const roleMiddleware = (...allowedRoles) => {
  return async (req, res, next) => {
    await authMiddleware(req, res, () => {
      if (req.Utilisateur && allowedRoles.includes(req.Utilisateur.role)) {
        next();
      } else {
        return res.status(403).json({ 
          message: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}` 
        });
      }
    });
  };
};

// Middleware pour clients ET chauffeurs (pour certaines actions partagées)
const clientOuChauffeurMiddleware = roleMiddleware('client', 'chauffeur');

// Middleware pour chauffeurs ET admins (pour gestion véhicules)
const chauffeurOuAdminMiddleware = roleMiddleware('chauffeur', 'admin');

module.exports = {
  authMiddleware,           // Authentification de base
  clientMiddleware,        // Client uniquement
  chauffeurMiddleware,     // Chauffeur uniquement  
  adminMiddleware,         // Admin uniquement
  roleMiddleware,          // Flexible
  clientOuChauffeurMiddleware,  // Client OU Chauffeur
  chauffeurOuAdminMiddleware,   // Chauffeur OU Admin
};