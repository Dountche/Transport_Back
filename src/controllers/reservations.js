const Joi = require('joi');
const { Reservation, Ticket, Trajet, Vehicule, Ligne, Utilisateur, Role, ChauffeurVehicule } = require('../models');
const { generateQRForTicket } = require('../services/qrService');
const { emitDashboardUpdate } = require('../websockets/dashboardWebsockets');

// Créer une réservation
async function createReservation(req, res) {
    const schema = Joi.object({
        trajet_id: Joi.number().integer().positive().required(),
        vehicule_id: Joi.number().integer().positive().required(),
        arret_depart: Joi.string().min(2).max(200).required(),
        arret_arrivee: Joi.string().min(2).max(200).required(),
        date_prise_en_charge: Joi.date().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            message: 'Données invalides', 
            detail: error.details[0].message 
        });
    }

    try {
        const { trajet_id, vehicule_id, arret_depart, arret_arrivee, date_prise_en_charge  } = value;
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        // Vérifier que l'utilisateur est bien un client
        const utilisateur = await Utilisateur.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!utilisateur || utilisateur.role?.nom !== 'client') {
            return res.status(403).json({ 
                message: 'Seuls les clients peuvent faire des réservations' 
            });
        }

        // Vérifier que le trajet et le véhicule existent et sont cohérents
        const trajet = await Trajet.findByPk(trajet_id, {
            include: [
                { model: Ligne, as: 'Ligne' },
                { model: Vehicule, as: 'Vehicule' }
            ]
        });

        if (!trajet) {
            return res.status(404).json({ message: 'Trajet introuvable' });
        }

        if (trajet.vehicule_id !== vehicule_id) {
            return res.status(400).json({ 
                message: 'Le véhicule sélectionné ne correspond pas à ce trajet' 
            });
        }

        // Vérifier qu'il n'y a pas déjà une réservation active pour cet utilisateur sur ce trajet
        const existingReservation = await Reservation.findOne({
            where: {
                utilisateur_id: userId,
                trajet_id: trajet_id,
                statut: ['en_attente', 'confirmee', 'en_cours']
            }
        });

        if (existingReservation) {
            return res.status(400).json({ 
                message: 'Vous avez déjà une réservation active pour ce trajet' 
            });
        }

        // Créer la réservation
        const reservation = await Reservation.create({
            utilisateur_id: userId,
            trajet_id,
            vehicule_id,
            arret_depart,
            arret_arrivee,
            statut: 'en_attente',
            date_reservation: new Date(),
            date_prise_en_charge  : date_prise_en_charge 
        });

        // Créer automatiquement le ticket associé
        const now = new Date();
        const expiresAt = new Date(Date.now() + (parseInt(process.env.QR_TTL || '900', 10) * 1000));

        const ticket = await Ticket.create({
            code_qr: null,
            date_creation: now,
            date_expiration: expiresAt,
            statut_validation: false,
            statut_expiration: false,
            statut_payer: false,
            utilisateur_id: userId,
            trajet_id: trajet_id
        });

        // Générer le QR Code
        const qrResult = await generateQRForTicket({
            ticketId: ticket.id,
            utilisateurId: userId,
            montant: null,
            type: 'reservation'
        });

        // Mettre à jour le ticket avec le QR et lier à la réservation
        await ticket.update({ code_qr: qrResult.token });
        await reservation.update({ ticket_id: ticket.id });

        // Notifier le chauffeur du véhicule
        const chauffeurVehicule = await ChauffeurVehicule.findOne({
            where: { vehicule_id, actif: true },
            include: [{ model: Utilisateur, as: 'chauffeur' }]
        });

        if (chauffeurVehicule && req.io) {
            req.io.to(`user_${chauffeurVehicule.chauffeur_id}`).emit('nouvelleReservation', {
                reservation_id: reservation.id,
                client: utilisateur.nom,
                arret_depart,
                arret_arrivee,
                trajet: trajet.ligne?.nom,
                heure_depart: trajet.heure_depart,
                timestamp: new Date()
            });

            // Notifier les admins
            emitDashboardUpdate(req.io, {
                type: 'reservationCreated',
                reservationId: reservation.id,
                clientId: userId,
                chauffeurId: chauffeurVehicule.chauffeur_id,
                vehiculeId: vehicule_id,
                timestamp: new Date()
            });
        }

        console.log(`[Reservation] Nouvelle réservation créée - ID: ${reservation.id}, Client: ${userId}`);

        return res.status(201).json({
            message: 'Réservation créée avec succès',
            reservation: {
                id: reservation.id,
                trajet_id,
                vehicule_id,
                arret_depart,
                arret_arrivee,
                statut: reservation.statut,
                date_reservation: reservation.date_reservation
            },
            ticket: {
                id: ticket.id,
                date_expiration: ticket.date_expiration,
                statut_payer: ticket.statut_payer
            },
            qr: {
                qr_id: qrResult.qr_id,
                token: qrResult.token,
                qr_png_base64: qrResult.qr_png_base64
            }
        });

    } catch (error) {
        console.error('[Reservation] Erreur création réservation:', error);
        return res.status(500).json({
            message: 'Erreur lors de la création de la réservation',
            detail: error.message
        });
    }
}

// Récupérer les réservations pour un chauffeur
async function getReservationsChauffeur(req, res) {
    try {
        const chauffeurId = req.Utilisateur?.id;

        if (!chauffeurId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        // Vérifier que l'utilisateur est bien un chauffeur
        const chauffeur = await Utilisateur.findByPk(chauffeurId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!chauffeur || chauffeur.role?.nom !== 'chauffeur') {
            return res.status(403).json({ 
                message: 'Seuls les chauffeurs peuvent voir les réservations' 
            });
        }

        // Récupérer les véhicules assignés au chauffeur
        const chauffeurVehicules = await ChauffeurVehicule.findAll({
            where: { chauffeur_id: chauffeurId, actif: true },
            include: [{ model: Vehicule, as: 'Vehicule' }]
        });

        if (chauffeurVehicules.length === 0) {
            return res.status(200).json({
                message: 'Aucun véhicule assigné',
                reservations: []
            });
        }

        const vehiculeIds = chauffeurVehicules.map(cv => cv.vehicule_id);

        // Récupérer toutes les réservations pour les véhicules du chauffeur
        const reservations = await Reservation.findAll({
            where: {
                vehicule_id: vehiculeIds,
                statut: ['en_attente', 'confirmee', 'en_cours']
            },
            include: [
                { 
                    model: Utilisateur, 
                    as: 'client',
                    attributes: ['id', 'nom', 'telephone', 'email']
                },
                { 
                    model: Trajet, 
                    as: 'trajet',
                    include: [
                        { model: Ligne, as: 'Ligne', attributes: ['nom'] }
                    ]
                },
                { 
                    model: Vehicule, 
                    as: 'vehicule',
                    attributes: ['id', 'immatriculation', 'type']
                },
                {
                    model: Ticket,
                    as: 'ticket',
                    attributes: ['id', 'statut_payer', 'statut_validation', 'date_expiration']
                }
            ],
            order: [
                ['date_reservation', 'ASC'],
                ['arret_depart', 'ASC']
            ]
        });

        // Grouper par trajet et trier par proximité des arrêts
        const reservationsGroupees = reservations.reduce((acc, reservation) => {
            const trajetId = reservation.trajet_id;
            if (!acc[trajetId]) {
                acc[trajetId] = {
                    trajet: reservation.trajet,
                    vehicule: reservation.vehicule,
                    reservations: []
                };
            }
            acc[trajetId].reservations.push(reservation);
            return acc;
        }, {});

        console.log(`[Reservation] ${reservations.length} réservations trouvées pour chauffeur ${chauffeurId}`);

        return res.status(200).json({
            message: `${reservations.length} réservation(s) trouvée(s)`,
            data: reservationsGroupees,
            total: reservations.length
        });

    } catch (error) {
        console.error('[Reservation] Erreur récupération réservations chauffeur:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des réservations',
            detail: error.message
        });
    }
}

// Changer le statut d'une réservation
async function updateReservationStatus(req, res) {
    const schema = Joi.object({
        statut: Joi.string().valid('en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee').required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            message: 'Statut invalide', 
            detail: error.details[0].message 
        });
    }

    try {
        const { id } = req.params;
        const { statut } = value;
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        const reservation = await Reservation.findByPk(id, {
            include: [
                { model: Utilisateur, as: 'client' },
                { model: Vehicule, as: 'Vehicule' },
                { model: Ticket, as: 'ticket' }
            ]
        });

        if (!reservation) {
            return res.status(404).json({ message: 'Réservation introuvable' });
        }

        // Vérifier que l'utilisateur a le droit de modifier cette réservation
        const utilisateur = await Utilisateur.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        const isClient = utilisateur.role?.nom === 'client' && reservation.utilisateur_id === userId;
        const isChauffeur = utilisateur.role?.nom === 'chauffeur';
        const isAdmin = utilisateur.role?.nom === 'admin';

        if (!isClient && !isChauffeur && !isAdmin) {
            return res.status(403).json({ 
                message: 'Vous n\'avez pas le droit de modifier cette réservation' 
            });
        }

        // Logique métier selon le statut
        const updates = { statut };

        if (statut === 'en_cours') {
            updates.date_prise_en_charge = new Date();
        }

        await reservation.update(updates);

        // Notifications WebSocket
        if (req.io) {
            // Notifier le client
            req.io.to(`user_${reservation.utilisateur_id}`).emit('reservationStatusUpdate', {
                reservation_id: reservation.id,
                nouveau_statut: statut,
                timestamp: new Date()
            });

            // Notifier les admins
            emitDashboardUpdate(req.io, {
                type: 'reservationStatusChanged',
                reservationId: reservation.id,
                nouveauStatut: statut,
                userId: userId,
                timestamp: new Date()
            });
        }

        console.log(`[Reservation] Statut mis à jour - ID: ${id}, Nouveau statut: ${statut}`);

        return res.status(200).json({
            message: 'Statut de la réservation mis à jour',
            reservation: {
                id: reservation.id,
                statut: statut,
                date_prise_en_charge: updates.date_prise_en_charge || reservation.date_prise_en_charge
            }
        });

    } catch (error) {
        console.error('[Reservation] Erreur mise à jour statut:', error);
        return res.status(500).json({
            message: 'Erreur lors de la mise à jour du statut',
            detail: error.message
        });
    }
}

// Récupérer les réservations d'un client
async function getClientReservations(req, res) {
    try {
        const clientId = req.Utilisateur?.id;

        if (!clientId) {
            return res.status(401).json({ message: 'Client non authentifié' });
        }

        const reservations = await Reservation.findAll({
            where: { utilisateur_id: clientId },
            include: [
                { 
                    model: Trajet, 
                    as: 'trajet',
                    include: [
                        { model: Ligne, as: 'Ligne' },
                        { model: Vehicule, as: 'Vehicule' }
                    ]
                },
                {
                    model: Ticket,
                    as: 'ticket'
                }
            ],
            order: [['date_reservation', 'DESC']]
        });

        return res.status(200).json({
            message: 'Réservations récupérées avec succès',
            reservations: reservations
        });

    } catch (error) {
        console.error('[Reservation] Erreur récupération réservations client:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des réservations',
            detail: error.message
        });
    }
}

module.exports = {
    createReservation,
    getReservationsChauffeur,
    updateReservationStatus,
    getClientReservations
};