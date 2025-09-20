const { Ticket, Paiement, Reservation, Utilisateur, Role, Vehicule, ChauffeurVehicule, Trajet, Ligne } = require('../models');
const { Op } = require('sequelize');

// Dashboard pour chauffeur
async function getDashboardChauffeur(req, res) {
    try {
        const chauffeurId = req.Utilisateur?.id;

        if (!chauffeurId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        const chauffeur = await Utilisateur.findByPk(chauffeurId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!chauffeur || chauffeur.role?.nom !== 'chauffeur') {
            return res.status(403).json({ 
                message: 'Seuls les chauffeurs peuvent accéder à ce dashboard' 
            });
        }

        // Récupérer les véhicules assignés
        const vehiculesAssignes = await ChauffeurVehicule.findAll({
            where: { chauffeur_id: chauffeurId, actif: true },
            include: [{ model: Vehicule, as: 'vehicule' }]
        });

        const vehiculeIds = vehiculesAssignes.map(cv => cv.vehicule_id);

        if (vehiculeIds.length === 0) {
            return res.status(200).json({
                message: 'Aucun véhicule assigné',
                stats: {
                    vehicules_assignes: 0,
                    reservations_total: 0,
                    reservations_jour: 0,
                    tickets_valides: 0,
                    paiements_wave: 0,
                    paiements_especes: 0,
                    tickets_expires: 0,
                    tentatives_fraude: 0,
                    gain_total: 0,
                    gain_jour: 0
                }
            });
        }

        // Définir les périodes
        const maintenant = new Date();
        const debutJour = new Date();
        debutJour.setHours(0, 0, 0, 0);
        const finJour = new Date();
        finJour.setHours(23, 59, 59, 999);

        // RÉSERVATIONS
        const reservationsTotal = await Reservation.count({
            where: { vehicule_id: vehiculeIds }
        });

        const reservationsJour = await Reservation.count({
            where: {
                vehicule_id: vehiculeIds,
                date_reservation: {
                    [Op.between]: [debutJour, finJour]
                }
            }
        });

        // TICKETS VALIDÉS 
        const ticketsValides = await Ticket.count({
            where: {
                validateur_id: chauffeurId,
                statut_validation: true
            }
        });

        const ticketsValidesJour = await Ticket.count({
            where: {
                validateur_id: chauffeurId,
                statut_validation: true,
                updatedAt: {
                    [Op.between]: [debutJour, finJour]
                }
            }
        });

        // PAIEMENTS
        const ticketsValidesPourPaiements = await Ticket.findAll({
            where: {
                validateur_id: chauffeurId,
                statut_validation: true,
                statut_payer: true
            },
            include: [{
                model: Paiement,
                required: true
            }]
        });

        let paiementsWave = 0;
        let paiementsEspeces = 0;
        let gainTotal = 0;

        ticketsValidesPourPaiements.forEach(ticket => {
            if (ticket.Paiement) {
                if (ticket.Paiement.methode === 'WAVE') {
                    paiementsWave++;
                } else if (ticket.Paiement.methode === 'ESPECE') {
                    paiementsEspeces++;
                }
                gainTotal += parseFloat(ticket.Paiement.montant || 0);
            }
        });

        // Gain du jour seulement
        const ticketsValidesJourPourPaiements = await Ticket.findAll({
            where: {
                validateur_id: chauffeurId,
                statut_validation: true,
                statut_payer: true,
                updatedAt: {
                    [Op.between]: [debutJour, finJour]
                }
            },
            include: [{
                model: Paiement,
                required: true
            }]
        });

        let gainJour = 0;
        ticketsValidesJourPourPaiements.forEach(ticket => {
            if (ticket.Paiement) {
                gainJour += parseFloat(ticket.Paiement.montant || 0);
            }
        });

        // TICKETS EXPIRÉS
        const trajetsVehicules = await Trajet.findAll({
            where: { vehicule_id: vehiculeIds },
            attributes: ['id']
        });
        const trajetIds = trajetsVehicules.map(t => t.id);

        const ticketsExpires = await Ticket.count({
            where: {
                trajet_id: trajetIds,
                statut_expiration: true
            }
        });

        // TENTATIVES DE FRAUDE
        const tentativesFraude = await Ticket.count({
            where: {
                validateur_id: chauffeurId,
                [Op.or]: [
                    { statut_expiration: true },
                    { 
                        statut_validation: true,
                        createdAt: { [Op.ne]: Op.col('updatedAt') }
                    }
                ]
            }
        });

        const stats = {
            // Informations générales
            vehicules_assignes: vehiculesAssignes.length,
            vehicules: vehiculesAssignes.map(cv => ({
                id: cv.vehicule.id,
                immatriculation: cv.vehicule.immatriculation,
                type: cv.vehicule.type
            })),

            // Réservations
            reservations_total: reservationsTotal,
            reservations_jour: reservationsJour,

            // Tickets validés
            tickets_valides_total: ticketsValides,
            tickets_valides_jour: ticketsValidesJour,

            // Paiements
            paiements_wave: paiementsWave,
            paiements_especes: paiementsEspeces,
            paiements_total: paiementsWave + paiementsEspeces,

            // Problèmes
            tickets_expires: ticketsExpires,
            tentatives_fraude: Math.max(0, tentativesFraude),

            // Gains
            gain_total: parseFloat(gainTotal.toFixed(2)),
            gain_jour: parseFloat(gainJour.toFixed(2))
        };

        console.log(`[Dashboard Chauffeur] Stats générées pour ${chauffeur.nom}`);

        return res.status(200).json({
            message: 'Statistiques chauffeur récupérées',
            chauffeur: {
                id: chauffeur.id,
                nom: chauffeur.nom
            },
            stats: stats,
            periode: {
                debut_jour: debutJour,
                maintenant: maintenant
            }
        });

    } catch (error) {
        console.error('[Dashboard Chauffeur] Erreur:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des statistiques',
            detail: error.message
        });
    }
}

// Dashboard pour admin
async function getDashboardAdmin(req, res) {
    try {
        const userId = req.Utilisateur?.id;

        const utilisateur = await Utilisateur.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!utilisateur || utilisateur.role?.nom !== 'admin') {
            return res.status(403).json({ 
                message: 'Seuls les administrateurs peuvent accéder à ce dashboard' 
            });
        }

        // Périodes
        const maintenant = new Date();
        const debutJour = new Date();
        debutJour.setHours(0, 0, 0, 0);
        const finJour = new Date();
        finJour.setHours(23, 59, 59, 999);

        // UTILISATEURS
        const [totalUsers, totalClients, totalChauffeurs] = await Promise.all([
            Utilisateur.count(),
            Utilisateur.count({
                include: [{ 
                    model: Role, 
                    as: 'role', 
                    where: { nom: 'client' },
                    required: true
                }]
            }),
            Utilisateur.count({
                include: [{ 
                    model: Role, 
                    as: 'role', 
                    where: { nom: 'chauffeur' },
                    required: true
                }]
            })
        ]);

        // Utilisateurs actifs aujourd'hui
        const utilisateursActifsJour = await Utilisateur.count({
            where: {
                [Op.or]: [
                    { '$tickets.date_creation$': { [Op.between]: [debutJour, finJour] } },
                    { '$reservations.date_reservation$': { [Op.between]: [debutJour, finJour] } }
                ]
            },
            include: [
                { model: Ticket, as: 'tickets', required: false },
                { model: Reservation, as: 'reservations', required: false }
            ],
            distinct: true
        });

        // TICKETS
        const [totalTickets, ticketsJour, ticketsValides, ticketsExpires, ticketsPayes] = await Promise.all([
            Ticket.count(),
            Ticket.count({ where: { date_creation: { [Op.between]: [debutJour, finJour] } } }),
            Ticket.count({ where: { statut_validation: true } }),
            Ticket.count({ where: { statut_expiration: true } }),
            Ticket.count({ where: { statut_payer: true } })
        ]);

        // PAIEMENTS
        const [montantTotal, montantJour, totalTransactions, paiem_wave, paiem_especes] = await Promise.all([
            Paiement.sum('montant') || 0,
            Paiement.sum('montant', { 
                where: { date: { [Op.between]: [debutJour, finJour] } }
            }) || 0,
            Paiement.count(),
            Paiement.count({ where: { methode: 'WAVE' } }),
            Paiement.count({ where: { methode: 'ESPECE' } })
        ]);

        // RÉSERVATIONS
        const [totalReservations, reservationsJour, resEnAttente, resEnCours, resTerminees] = await Promise.all([
            Reservation.count(),
            Reservation.count({ where: { date_reservation: { [Op.between]: [debutJour, finJour] } } }),
            Reservation.count({ where: { statut: 'en_attente' } }),
            Reservation.count({ where: { statut: 'en_cours' } }),
            Reservation.count({ where: { statut: 'terminee' } })
        ]);

        // VÉHICULES
        const [totalVehicules, vehiculesGPS, vehiculesAssignes] = await Promise.all([
            Vehicule.count(),
            Vehicule.count({ where: { statut_gps: true } }),
            ChauffeurVehicule.count({ where: { actif: true } })
        ]);

        // TOP CHAUFFEURS
        const topChauffeurs = await Utilisateur.findAll({
            attributes: [
                'id', 
                'nom',
                [require('sequelize').fn('COUNT', require('sequelize').col('tickets_valides.id')), 'tickets_count']
            ],
            include: [
                { 
                    model: Role, 
                    as: 'role', 
                    where: { nom: 'chauffeur' },
                    attributes: []
                },
                { 
                    model: Ticket, 
                    as: 'tickets_valides',
                    attributes: [],
                    required: false
                }
            ],
            group: ['Utilisateur.id', 'role.id'],
            having: require('sequelize').where(
                require('sequelize').fn('COUNT', require('sequelize').col('tickets_valides.id')), 
                '>', 0
            ),
            order: [[require('sequelize').literal('tickets_count'), 'DESC']],
            limit: 5
        });

        const dashboard = {
            utilisateurs: {
                total: totalUsers,
                clients: totalClients,
                chauffeurs: totalChauffeurs,
                actifs_aujourdhui: utilisateursActifsJour
            },
            tickets: {
                total: totalTickets,
                crees_aujourdhui: ticketsJour,
                valides: ticketsValides,
                expires: ticketsExpires,
                payes: ticketsPayes,
                taux_validation: totalTickets > 0 ? ((ticketsValides / totalTickets) * 100).toFixed(1) + '%' : '0%'
            },
            paiements: {
                montant_total: parseFloat(montantTotal.toFixed(2)),
                montant_aujourdhui: parseFloat(montantJour.toFixed(2)),
                transactions_total: totalTransactions,
                paiements_wave: paiem_wave,
                paiements_especes: paiem_especes
            },
            reservations: {
                total: totalReservations,
                aujourdhui: reservationsJour,
                en_attente: resEnAttente,
                en_cours: resEnCours,
                terminees: resTerminees
            },
            vehicules: {
                total: totalVehicules,
                gps_actif: vehiculesGPS,
                assignes: vehiculesAssignes,
                disponibles: totalVehicules - vehiculesAssignes
            },
            top_chauffeurs: topChauffeurs.map(c => ({
                id: c.id,
                nom: c.nom,
                tickets_valides: parseInt(c.get('tickets_count'))
            }))
        };

        console.log(`[Dashboard Admin] Stats générées pour ${utilisateur.nom}`);

        return res.status(200).json({
            message: 'Statistiques administrateur récupérées',
            admin: {
                id: utilisateur.id,
                nom: utilisateur.nom
            },
            dashboard: dashboard,
            periode: {
                debut_jour: debutJour,
                maintenant: maintenant
            }
        });

    } catch (error) {
        console.error('[Dashboard Admin] Erreur:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des statistiques',
            detail: error.message
        });
    }
}

// Fonction stats des chauffeur
async function getStatsChauffeurs(req, res) {
    try {
        const userId = req.Utilisateur?.id;

        const utilisateur = await Utilisateur.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!utilisateur || utilisateur.role?.nom !== 'admin') {
            return res.status(403).json({ 
                message: 'Seuls les administrateurs peuvent accéder à ces statistiques' 
            });
        }

        // Récupérer tous les chauffeurs
        const chauffeurs = await Utilisateur.findAll({
            include: [
                { model: Role, as: 'role', where: { nom: 'chauffeur' } },
                {
                    model: ChauffeurVehicule,
                    as: 'vehicules_assignes',
                    where: { actif: true },
                    required: false,
                    include: [{ model: Vehicule, as: 'vehicule' }]
                }
            ]
        });

        const statsChauffeurs = await Promise.all(chauffeurs.map(async (chauffeur) => {
            const [ticketsValides, gainTotal, paiementsWave, paiementsEspeces] = await Promise.all([
                Ticket.count({
                    where: { validateur_id: chauffeur.id, statut_validation: true }
                }),
                Paiement.sum('montant', {
                    include: [{
                        model: Ticket,
                        where: { validateur_id: chauffeur.id },
                        required: true
                    }]
                }) || 0,
                Paiement.count({
                    where: { methode: 'WAVE' },
                    include: [{
                        model: Ticket,
                        where: { validateur_id: chauffeur.id },
                        required: true
                    }]
                }),
                Paiement.count({
                    where: { methode: 'ESPECE' },
                    include: [{
                        model: Ticket,
                        where: { validateur_id: chauffeur.id },
                        required: true
                    }]
                })
            ]);

            return {
                chauffeur: {
                    id: chauffeur.id,
                    nom: chauffeur.nom,
                    email: chauffeur.email
                },
                vehicule: chauffeur.vehicules_assignes[0]?.vehicule || null,
                stats: {
                    tickets_valides: ticketsValides,
                    paiements_wave: paiementsWave,
                    paiements_especes: paiementsEspeces,
                    paiements_total: paiementsWave + paiementsEspeces,
                    gain_total: parseFloat(gainTotal.toFixed(2))
                }
            };
        }));

        return res.status(200).json({
            message: `Statistiques de ${chauffeurs.length} chauffeur(s)`,
            chauffeurs: statsChauffeurs
        });

    } catch (error) {
        console.error('[Dashboard Stats Chauffeurs] Erreur:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des statistiques',
            detail: error.message
        });
    }
}

// Données temps réel simplifiées
async function getDashboardRealtime(req, res) {
    try {
        const maintenant = new Date();
        const dixMinutesAgo = new Date(maintenant.getTime() - 10 * 60 * 1000);

        const [ticketsCrees, reservationsFaites, paiementsEffectues, ticketsValides, vehiculesActifs] = await Promise.all([
            Ticket.count({ where: { date_creation: { [Op.gte]: dixMinutesAgo } } }),
            Reservation.count({ where: { date_reservation: { [Op.gte]: dixMinutesAgo } } }),
            Paiement.count({ where: { date: { [Op.gte]: dixMinutesAgo } } }),
            Ticket.count({ 
                where: { 
                    updatedAt: { [Op.gte]: dixMinutesAgo },
                    statut_validation: true
                }
            }),
            Vehicule.count({ where: { statut_gps: true } })
        ]);

        return res.status(200).json({
            message: 'Données temps réel (10 dernières minutes)',
            timestamp: maintenant,
            activite: {
                tickets_crees: ticketsCrees,
                reservations_faites: reservationsFaites,
                paiements_effectues: paiementsEffectues,
                tickets_valides: ticketsValides
            },
            vehicules_actifs: vehiculesActifs
        });

    } catch (error) {
        console.error('[Dashboard Realtime] Erreur:', error);
        return res.status(500).json({
            message: 'Erreur données temps réel',
            detail: error.message
        });
    }
}

module.exports = {
    getDashboardChauffeur,
    getDashboardAdmin,
    getStatsChauffeurs,
    getDashboardRealtime
};