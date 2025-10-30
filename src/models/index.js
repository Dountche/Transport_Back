const Utilisateur = require("./Utilisateur");
const Ticket = require("./Ticket");
const Paiement = require("./Paiement");
const Vehicule = require("./Vehicule");
const Trajet = require("./Trajet");
const PositionGPS = require("./PositionGPS");
const Ligne = require("./Ligne");
const Role = require("./Role");
const Reservation = require("./Reservation");
const ChauffeurVehicule = require("./ChauffeurVehicule");

// =====================
// RELATIONS
// =====================

// Utilisateur - Ticket (client qui crée le ticket)
Utilisateur.hasMany(Ticket, { 
    foreignKey: "utilisateur_id",
    as: "tickets" // Client qui possède les tickets
});
Ticket.belongsTo(Utilisateur, { 
    foreignKey: "utilisateur_id",
    as: "client" // Le client propriétaire du ticket
});

// Ticket - Paiement
Ticket.hasOne(Paiement, { foreignKey: "ticket_id" });
Paiement.belongsTo(Ticket, { foreignKey: "ticket_id" });

// Ticket - Trajet
Trajet.hasMany(Ticket, { foreignKey: "trajet_id" });
Ticket.belongsTo(Trajet, { foreignKey: "trajet_id" });

// Trajet - Vehicule
Vehicule.hasMany(Trajet, { foreignKey: "vehicule_id" });
Trajet.belongsTo(Vehicule, { foreignKey: "vehicule_id" });

// Vehicule - PositionGPS
Vehicule.hasMany(PositionGPS, { foreignKey: "vehicule_id" });
PositionGPS.belongsTo(Vehicule, { foreignKey: "vehicule_id" });

// Ligne - Trajet
Ligne.hasMany(Trajet, { foreignKey: "ligne_id" });
Trajet.belongsTo(Ligne, { foreignKey: "ligne_id" });

// Role - Utilisateur
Role.hasMany(Utilisateur, { 
    foreignKey: "role_id",
    as: "utilisateurs" 
});
Utilisateur.belongsTo(Role, { 
    foreignKey: "role_id",
    as: "role" 
});

// Utilisateur - Ticket (chauffeur qui valide le ticket)
Utilisateur.hasMany(Ticket, { 
    foreignKey: "validateur_id",
    as: "tickets_valides" // Chauffeur qui valide les tickets
});
Ticket.belongsTo(Utilisateur, { 
    foreignKey: "validateur_id",
    as: "validateur" // Le chauffeur qui a validé le ticket
});

// Utilisateur - Reservation (client qui fait la réservation)
Utilisateur.hasMany(Reservation, { 
    foreignKey: "utilisateur_id",
    as: "reservations" 
});
Reservation.belongsTo(Utilisateur, { 
    foreignKey: "utilisateur_id",
    as: "client" 
});

// Trajet - Reservation
Trajet.hasMany(Reservation, { 
    foreignKey: "trajet_id",
    as: "reservations" 
});
Reservation.belongsTo(Trajet, { 
    foreignKey: "trajet_id",
    as: "trajet" 
});

// Vehicule - Reservation
Vehicule.hasMany(Reservation, { 
    foreignKey: "vehicule_id",
    as: "reservations" 
});
Reservation.belongsTo(Vehicule, { 
    foreignKey: "vehicule_id",
    as: "vehicule" 
});

// Ticket - Reservation (un ticket est lié à une réservation)
Ticket.hasOne(Reservation, { 
    foreignKey: "ticket_id",
    as: "reservation" 
});
Reservation.belongsTo(Ticket, { 
    foreignKey: "ticket_id",
    as: "ticket" 
});

// Utilisateur - ChauffeurVehicule (chauffeur assigné à un véhicule)
Utilisateur.hasMany(ChauffeurVehicule, { 
    foreignKey: "chauffeur_id",
    as: "vehicules_assignes" 
});
ChauffeurVehicule.belongsTo(Utilisateur, { 
    foreignKey: "chauffeur_id",
    as: "chauffeur" 
});

// Vehicule - ChauffeurVehicule
Vehicule.hasMany(ChauffeurVehicule, { 
    foreignKey: "vehicule_id",
    as: "chauffeurs_assignes" 
});
ChauffeurVehicule.belongsTo(Vehicule, { 
    foreignKey: "vehicule_id",
    as: "Vehicule" 
});

/*
 =====================
 RELATIONS INDIRECTES UTILES
 =====================

 Permet de récupérer facilement tous les chauffeurs
 Utilisateur.scope('chauffeurs', {
     include: [{
         model: Role,
         as: 'role',
         where: { nom: 'chauffeur' }
     }]
 });
/ Permet de récupérer facilement tous les clients
 Utilisateur.scope('clients', {
     include: [{
         model: Role,
         as: 'role',
         where: { nom: 'client' }
     }]
 });

*/

module.exports = {
  Utilisateur,
  Ticket,
  Paiement,
  Vehicule,
  Trajet,
  PositionGPS,
  Ligne,  
  Role,
  Reservation,
  ChauffeurVehicule
};