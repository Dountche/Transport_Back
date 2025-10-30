const { Vehicule, ChauffeurVehicule, Utilisateur, Role, Trajet, Ligne, PositionGPS } = require('../models');

// Récupérer les véhicules assignés au chauffeur
async function getMesVehicules(req, res) {
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
            console.log(chauffeur);
            return res.status(403).json({ 
                message: 'Seuls les chauffeurs peuvent accéder à leurs véhicules' 
            });
        }

        // Récupérer les véhicules assignés
        const assignations = await ChauffeurVehicule.findAll({
            where: { 
                chauffeur_id: chauffeurId,
                actif: true 
            },
            include: [
                { 
                    model: Vehicule, 
                    as: 'Vehicule',
                    include: [
                        {
                            model: Trajet,
                            as: 'Trajets',
                            include: [
                                { model: Ligne, as: 'Ligne' }
                            ],
                            limit: 5, // Les 5 prochains trajets
                            order: [['heure_depart', 'ASC']]
                        },
                        {
                            model: PositionGPS,
                            as: 'PositionGPs',
                            limit: 1,
                            order: [['timestamp', 'DESC']]
                        }
                    ]
                }
            ]
        });

        if (assignations.length === 0) {
            return res.status(200).json({
                message: 'Aucun véhicule assigné',
                vehicules: []
            });
        }

        // Enrichir les données avec des statistiques
        const vehiculesAvecStats = await Promise.all(assignations.map(async (assignation) => {
            const vehicule = assignation.Vehicule;
            
            // Statistiques du véhicule
            const stats = {
                trajets_total: await Trajet.count({ where: { vehicule_id: vehicule.id } }),
                position_actuelle: vehicule.PositionGPS?.[0] || null,
                derniere_position: vehicule.PositionGPS?.[0]?.timestamp || null
            };

            return {
                assignation: {
                    id: assignation.id,
                    date_assignation: assignation.date_assignation,
                    actif: assignation.actif
                },
                vehicule: {
                    id: vehicule.id,
                    immatriculation: vehicule.immatriculation,
                    type: vehicule.type,
                    capacite: vehicule.capacite,
                    statut_gps: vehicule.statut_gps,
                    createdAt: vehicule.createdAt
                },
                prochains_trajets: vehicule.Trajets || [],
                position: stats.position_actuelle,
                stats: stats
            };
        }));

        console.log(`[Vehicules Chauffeur] ${vehiculesAvecStats.length} véhicule(s) trouvé(s) pour chauffeur ${chauffeurId}`);

        return res.status(200).json({
            message: `${vehiculesAvecStats.length} véhicule(s) assigné(s)`,
            chauffeur: {
                id: chauffeur.id,
                nom: chauffeur.nom
            },
            vehicules: vehiculesAvecStats
        });

    } catch (error) {
        console.error('[Vehicules Chauffeur] Erreur récupération véhicules:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des véhicules',
            detail: error.message
        });
    }
}

// Activer / désactiver le GPS d’un véhicule
async function updateStatutGPS(req, res) {
    try {
        const { vehiculeId } = req.params;
        const chauffeurId = req.Utilisateur?.id;

        // Vérification chauffeur
        if (!chauffeurId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        // Vérifier si le véhicule est bien assigné à ce chauffeur
        const assignation = await ChauffeurVehicule.findOne({
            where: {
                chauffeur_id: chauffeurId,
                vehicule_id: vehiculeId,
                actif: true
            },
            include: [{ model: Vehicule, as: 'Vehicule' }]
        });

        if (!assignation) {
            return res.status(403).json({
                message: 'Vous n\'avez pas accès à ce véhicule'
            });
        }

        const vehicule = assignation.Vehicule;

        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule introuvable' });
        }

        const nouveauStatut = !vehicule.statut_gps;

        // Mettre à jour dans la base
        await vehicule.update({ statut_gps: nouveauStatut });

        console.log(`[Vehicules Chauffeur] GPS ${nouveauStatut ? 'activé' : 'désactivé'} pour véhicule ${vehiculeId} (chauffeur ${chauffeurId})`);

        return res.status(200).json({
            message: `GPS ${nouveauStatut ? 'activé' : 'désactivé'} avec succès`,
            vehicule: {
                id: vehicule.id,
                immatriculation: vehicule.immatriculation,
                statut_gps: nouveauStatut
            }
        });

    } catch (error) {
        console.error('[Vehicules Chauffeur] Erreur mise à jour GPS:', error);
        return res.status(500).json({
            message: 'Erreur lors de la mise à jour du statut GPS',
            detail: error.message
        });
    }
}


// Obtenir les trajets du jour pour un véhicule
async function getTrajetsJour(req, res) {
    try {
        const { vehiculeId } = req.params;
        const chauffeurId = req.Utilisateur?.id;

        if (!chauffeurId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        // Vérifier l'accès au véhicule
        const assignation = await ChauffeurVehicule.findOne({
            where: {
                chauffeur_id: chauffeurId,
                vehicule_id: vehiculeId,
                actif: true
            }
        });

        if (!assignation) {
            return res.status(403).json({ 
                message: 'Vous n\'avez pas accès à ce véhicule' 
            });
        }

        // Récupérer les trajets du jour
        const trajets = await Trajet.findAll({
            where: { vehicule_id: vehiculeId },
            include: [
                {
                    model: Ligne,
                    as: 'ligne'
                },
                {
                    model: Vehicule,
                    as: 'vehicule',
                    attributes: ['id', 'immatriculation', 'type']
                }
            ],
            order: [['heure_depart', 'ASC']]
        });

        // Ajouter des infos sur les réservations pour chaque trajet
        const trajetsAvecReservations = await Promise.all(trajets.map(async (trajet) => {
            const reservationsCount = await require('../models').Reservation.count({
                where: { 
                    trajet_id: trajet.id,
                    statut: ['en_attente', 'confirmee', 'en_cours']
                }
            });

            return {
                ...trajet.toJSON(),
                reservations_count: reservationsCount
            };
        }));

        return res.status(200).json({
            message: `${trajets.length} trajet(s) trouvé(s)`,
            vehicule_id: vehiculeId,
            trajets: trajetsAvecReservations
        });

    } catch (error) {
        console.error('[Vehicules Chauffeur] Erreur récupération trajets:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des trajets',
            detail: error.message
        });
    }
}

// Envoyer la position GPS du véhicule
async function envoyerPositionGPS(req, res) {
    try {
        const { vehiculeId } = req.params;
        const { latitude, longitude } = req.body;
        const chauffeurId = req.Utilisateur?.id;

        if (!chauffeurId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        // Validation des coordonnées
        if (!latitude || !longitude || 
            typeof latitude !== 'number' || typeof longitude !== 'number' ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180) {
            return res.status(400).json({ 
                message: 'Coordonnées GPS invalides' 
            });
        }

        // Vérifier l'accès au véhicule
        const assignation = await ChauffeurVehicule.findOne({
            where: {
                chauffeur_id: chauffeurId,
                vehicule_id: vehiculeId,
                actif: true
            },
            include: [{ model: Vehicule, as: 'vehicule' }]
        });

        if (!assignation) {
            return res.status(403).json({ 
                message: 'Vous n\'avez pas accès à ce véhicule' 
            });
        }

        // Vérifier que le GPS est activé
        if (!assignation.vehicule.statut_gps) {
            return res.status(400).json({ 
                message: 'GPS désactivé pour ce véhicule' 
            });
        }

        // Enregistrer la position
        const position = await PositionGPS.create({
            vehicule_id: vehiculeId,
            latitude,
            longitude,
            timestamp: new Date()
        });

        // Notifier les clients et admins en temps réel
        if (req.io) {
            // Diffuser la position aux clients qui suivent ce véhicule
            req.io.emit('positionUpdate', {
                vehicule_id: vehiculeId,
                latitude,
                longitude,
                timestamp: position.timestamp,
                immatriculation: assignation.vehicule.immatriculation
            });

            // Notifier les admins
            req.io.emit('dashboardUpdate', {
                type: 'gpsUpdate',
                vehiculeId: vehiculeId,
                position: { latitude, longitude },
                chauffeurId: chauffeurId,
                timestamp: new Date()
            });
        }

        console.log(`[Vehicules Chauffeur] Position GPS enregistrée - Véhicule: ${vehiculeId}, Coordonnées: ${latitude}, ${longitude}`);

        return res.status(201).json({
            message: 'Position GPS enregistrée avec succès',
            position: {
                id: position.id,
                vehicule_id: vehiculeId,
                latitude: position.latitude,
                longitude: position.longitude,
                timestamp: position.timestamp
            }
        });

    } catch (error) {
        console.error('[Vehicules Chauffeur] Erreur envoi position GPS:', error);
        return res.status(500).json({
            message: 'Erreur lors de l\'enregistrement de la position GPS',
            detail: error.message
        });
    }
}

// Obtenir l'historique des positions GPS
async function getHistoriqueGPS(req, res) {
    try {
        const { vehiculeId } = req.params;
        const { limite = 50 } = req.query;
        const chauffeurId = req.Utilisateur?.id;

        if (!chauffeurId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        // Vérifier l'accès au véhicule
        const assignation = await ChauffeurVehicule.findOne({
            where: {
                chauffeur_id: chauffeurId,
                vehicule_id: vehiculeId,
                actif: true
            }
        });

        if (!assignation) {
            return res.status(403).json({ 
                message: 'Vous n\'avez pas accès à ce véhicule' 
            });
        }

        // Récupérer l'historique
        const positions = await PositionGPS.findAll({
            where: { vehicule_id: vehiculeId },
            order: [['timestamp', 'DESC']],
            limit: parseInt(limite)
        });

        return res.status(200).json({
            message: `${positions.length} position(s) trouvée(s)`,
            vehicule_id: vehiculeId,
            positions: positions
        });

    } catch (error) {
        console.error('[Vehicules Chauffeur] Erreur historique GPS:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération de l\'historique GPS',
            detail: error.message
        });
    }
}

module.exports = {
    getMesVehicules,
    updateStatutGPS,
    getTrajetsJour,
    envoyerPositionGPS,
    getHistoriqueGPS
};