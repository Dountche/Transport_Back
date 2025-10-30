const { Ticket, Utilisateur, Role, Paiement } = require('../models');
const { generateQRForTicket, validateQRToken } = require('../services/qrService');
const { emitTicketCreated, emitTicketValidated } = require('../websockets/ticketWebsocket');
const { emitDashboardUpdate } = require('../websockets/dashboardWebsockets');
const QRCode = require('qrcode');

// création du ticket
async function createTicket(req, res) {
    try {
        const { trajet_id } = req.body;
        const userId = req.Utilisateur?.id;

        // Validations
        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }
        if (!trajet_id) {
            return res.status(400).json({ message: 'trajet_id requis' });
        }

        const now = new Date();
        const expiresAt = new Date(Date.now() + (parseInt(process.env.QR_TTL || '900', 10) * 1000));

        console.log(`[Ticket Controller] Création ticket - User: ${userId}, Trajet: ${trajet_id}`);

        // Création du ticket en base
        const ticket = await Ticket.create({
            code_qr: null,
            date_creation: now,
            date_expiration: expiresAt,
            statut_validation: false,
            statut_expiration: false,
            statut_payer: false, // par défaut non payé
            utilisateur_id: userId,
            trajet_id: trajet_id,
            validateur_id: null // pas encore validé
        });

        console.log(`[Ticket Controller] Ticket créé avec ID: ${ticket.id}`);

        // Génération du QR Code
        let qrResult;
        try {
            qrResult = await generateQRForTicket({
                ticketId: ticket.id,
                utilisateurId: userId,
                montant: null,
                type: 'ticket'
            });
        } catch (qrError) {
            console.error('[Ticket Controller] Erreur génération QR:', qrError);
            await ticket.destroy();
            return res.status(500).json({
                message: 'Erreur génération QR Code',
                detail: qrError.message
            });
        }

        if (!qrResult || !qrResult.token) {
            console.error('[Ticket Controller] QR Result invalide:', qrResult);
            await ticket.destroy();
            return res.status(500).json({
                message: 'QR Code non généré correctement',
                detail: 'Token manquant dans la réponse du service QR'
            });
        }

        // Mise à jour du ticket avec le token QR
        await ticket.update({ code_qr: qrResult.token });

        console.log(`[Ticket Controller] QR généré avec succès - Token: ${qrResult.token.substring(0, 20)}...`);

        // Notification WebSocket
        if (req.io) {
            emitTicketCreated(req.io, {
                id: ticket.id,
                utilisateur_id: userId,
                trajet_id: trajet_id,
                date_creation: now,
                date_expiration: expiresAt
            });
            console.log('[Ticket Controller] emitTicketCreated appelé');
            
            emitDashboardUpdate(req.io, { 
                type: 'ticketCreated', 
                ticketId: ticket.id, 
                userId, 
                trajetId: trajet_id, 
                timestamp: new Date() 
            });
        }
        
        return res.status(201).json({
            message: 'Ticket créé et QR généré avec succès',
            ticket: {
                id: ticket.id,
                utilisateur_id: userId,
                trajet_id: trajet_id,
                date_creation: now,
                date_expiration: expiresAt,
                statut_validation: false,
                statut_expiration: false,
                statut_payer: false,
                validateur_id: null
            },
            qr: {
                qr_id: qrResult.qr_id,
                token: qrResult.token,
                qr_png_base64: qrResult.qr_png_base64
            }
        });

    } catch (err) {
        console.error('[Ticket Controller] Erreur création ticket:', err);
        return res.status(500).json({
            message: 'Erreur création ticket',
            detail: err.message
        });
    }
}

// Validation ticket
async function validateTicket(req, res) {
    try {
        const { token } = req.body;
        const validatorId = req.Utilisateur?.id;

        if (!token) {
            return res.status(400).json({ message: 'token requis' });
        }

        if (!validatorId) {
            return res.status(401).json({ message: 'Validateur non authentifié' });
        }

        // Vérifier que le validateur est bien un chauffeur
        const validateur = await Utilisateur.findByPk(validatorId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!validateur || validateur.role?.nom !== 'chauffeur') {
            return res.status(403).json({ 
                message: 'Seuls les chauffeurs peuvent valider les tickets' 
            });
        }

        console.log(`[Ticket Controller] Validation ticket - Token: ${token.substring(0, 20)}... par chauffeur ID: ${validatorId}`);

        const result = await validateQRToken(token, String(validatorId));

        if (!result.valid) {
            console.log(`[Ticket Controller] Validation échouée: ${result.reason}`);
            
            // Gestion des cas spécifiques pour les chauffeurs
            let userMessage = result.reason;
            let alertType = 'error';
            
            switch (result.reason) {
                case 'EXPIRED':
                    userMessage = 'Ce ticket a expiré et ne peut plus être utilisé';
                    alertType = 'warning';
                    break;
                case 'ALREADY_USED':
                    userMessage = 'Ce ticket a déjà été validé précédemment';
                    alertType = 'info';
                    break;
                case 'INVALID_TOKEN':
                    userMessage = 'QR Code invalide ou corrompu';
                    alertType = 'error';
                    break;
            }

            return res.status(400).json({
                valid: false,
                reason: result.reason,
                message: userMessage,
                alertType: alertType,
                detail: result.detail || null
            });
        }

        const ticketDb = await Ticket.findByPk(result.payload.ticket_id, {
            include: [
                { model: Utilisateur, as: 'client', attributes: ['id', 'nom', 'email', 'telephone'] },
                { model: Utilisateur, as: 'validateur', attributes: ['id', 'nom'] }
            ]
        });

        if (!ticketDb) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        // Vérifier le statut de paiement et gérer la validation
        let validationStatus = 'success';
        let validationMessage = '';
        let requiresConfirmation = false;

        if (ticketDb.statut_payer) {
            // Ticket déjà payé - validation directe
            validationMessage = 'Ticket validé avec succès. Paiement électronique confirmé.';
        } else {
            // Ticket pas encore payé - demander confirmation pour paiement espèces
            validationStatus = 'payment_required';
            validationMessage = 'Le paiement électronique n\'a pas encore été effectué. Le paiement sera-t-il effectué en espèces ?';
            requiresConfirmation = true;
        }

        // Dans tous les cas, on marque le ticket comme validé et on enregistre le validateur
        await ticketDb.update({ 
            statut_validation: true,
            validateur_id: validatorId
        });

        console.log(`[Ticket Controller] Ticket ${ticketDb.id} validé par chauffeur ${validatorId}`);

        // Notification WebSocket
        if (req.io) {
            emitTicketValidated(req.io, {
                id: ticketDb.id,
                utilisateur_id: ticketDb.utilisateur_id,
                trajet_id: ticketDb.trajet_id,
                validateur_id: validatorId,
                validatedAt: new Date()
            });

            // Notifier les admins
            emitDashboardUpdate(req.io, { 
                type: 'ticketValidated', 
                ticketId: ticketDb.id, 
                userId: ticketDb.utilisateur_id, 
                trajetId: ticketDb.trajet_id,
                validateurId: validatorId,
                paiementStatut: ticketDb.statut_payer ? 'paye' : 'non_paye',
                timestamp: new Date() 
            });
        }

        return res.status(200).json({
            valid: true,
            status: validationStatus,
            message: validationMessage,
            requiresConfirmation: requiresConfirmation,
            ticket: {
                id: ticketDb.id,
                statut_validation: ticketDb.statut_validation,
                statut_payer: ticketDb.statut_payer,
                client: ticketDb.client,
                validateur_id: validatorId
            },
            client: {
                nom: ticketDb.client?.nom,
                telephone: ticketDb.client?.telephone
            },
            qr: result.qr
        });

    } catch (err) {
        console.error('[Ticket Controller] Erreur validation ticket:', err);
        return res.status(500).json({
            message: 'Erreur validation ticket',
            detail: err.message
        });
    }
}

// Confirmer paiement espèces par le chauffeur
async function confirmCashPayment(req, res) {
    try {
        const { ticketId } = req.params;
        const validatorId = req.Utilisateur?.id;

        if (!validatorId) {
            return res.status(401).json({ message: 'Chauffeur non authentifié' });
        }

        // Vérifier que le validateur est bien un chauffeur
        const validateur = await Utilisateur.findByPk(validatorId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!validateur || validateur.role?.nom !== 'chauffeur') {
            return res.status(403).json({ 
                message: 'Seuls les chauffeurs peuvent confirmer les paiements espèces' 
            });
        }

        const ticket = await Ticket.findByPk(ticketId, {
            include: [{ model: Utilisateur, as: 'client' }]
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        // Vérifier que ce chauffeur a bien validé ce ticket
        if (ticket.validateur_id !== validatorId) {
            return res.status(403).json({ 
                message: 'Vous ne pouvez confirmer que les tickets que vous avez validés' 
            });
        }

        if (ticket.statut_payer) {
            return res.status(400).json({ 
                message: 'Ce ticket a déjà été payé électroniquement' 
            });
        }

        // Créer un paiement en espèces
        // NOTE: Cette logique sera ajoutée dans le service de paiement
        
        // Pour l'instant, on marque juste le ticket comme payé
        await ticket.update({ statut_payer: true });

        console.log(`[Ticket Controller] Paiement espèces confirmé - Ticket ${ticketId} par chauffeur ${validatorId}`);

        // Notification WebSocket
        if (req.io) {
            emitDashboardUpdate(req.io, { 
                type: 'paiementEspeces', 
                ticketId: ticket.id, 
                chauffeurId: validatorId,
                clientId: ticket.utilisateur_id,
                timestamp: new Date() 
            });
        }

        return res.status(200).json({
            message: 'Paiement en espèces confirmé avec succès',
            ticket: {
                id: ticket.id,
                statut_payer: true,
                statut_validation: ticket.statut_validation,
                client: ticket.client?.nom
            }
        });

    } catch (err) {
        console.error('[Ticket Controller] Erreur confirmation paiement espèces:', err);
        return res.status(500).json({
            message: 'Erreur confirmation paiement',
            detail: err.message
        });
    }
}

// Retourner la liste des tickets d'un user
async function getUserTickets(req, res) {
    try {
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        const tickets = await Ticket.findAll({
            where: { utilisateur_id: userId },
            include: [
                { 
                    model: Utilisateur, 
                    as: 'validateur', 
                    attributes: ['id', 'nom'] 
                }
            ],
            order: [['date_creation', 'DESC']]
        });

        return res.status(200).json({
            message: 'Tickets récupérés avec succès',
            tickets: tickets
        });
    } catch (err) {
        console.error('[Ticket Controller] Erreur récupération tickets:', err);
        return res.status(500).json({
            message: 'Erreur récupération tickets',
            detail: err.message
        });
    }
}

// Récupérer les tickets validés par un chauffeur
async function getTicketsValidatedByDriver(req, res) {
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
                message: 'Accès réservé aux  v',  data : chauffeur.role?.nom
            });
        }

        const tickets = await Ticket.findAll({
            where: { 
                validateur_id: chauffeurId,
                statut_validation: true 
            },
            include: [
                { 
                    model: Utilisateur, 
                    as: 'client', 
                    attributes: ['id', 'nom', 'telephone'] 
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        // Calculer statistiques
        const stats = {
            total_valides: tickets.length,
            payes_electronique: tickets.filter(t => t.statut_payer).length,
            payes_especes: tickets.filter(t => !t.statut_payer).length,
            tentatives_fraude: 0 // À calculer avec logs de validation échouées
        };

        return res.status(200).json({
            message: 'Tickets validés récupérés avec succès',
            tickets: tickets,
            statistiques: stats
        });
    } catch (err) {
        console.error('[Ticket Controller] Erreur récupération tickets chauffeur:', err);
        return res.status(500).json({
            message: 'Erreur récupération tickets',
            detail: err.message
        });
    }
}

async function getTicketById(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
        include: [{ model: Paiement, as: 'Paiement' }]
    });
    if (!ticket) return res.status(404).json({ message: "Ticket non trouvé" });
    return res.json({message: "reponse du Ticket recherché", ticket});
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

// Afficher le PNG d'un ticket
async function getTicketQR(req, res) {
    try {
        const { ticketId } = req.params;
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        // Récupérer le ticket
        const ticket = await Ticket.findOne({
            where: { 
                id: ticketId,
                utilisateur_id: userId
            }
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        if (!ticket.code_qr) {
            return res.status(400).json({ message: 'QR Code non généré pour ce ticket' });
        }

        // Vérifier si le ticket est encore valide pour affichage
        const now = new Date();
        if (ticket.statut_validation && new Date(ticket.date_expiration) < now) {
            return res.status(400).json({ 
                message: 'Ce ticket ne peut plus être affiché (validé ou expiré)' 
            });
        }

        // Générer l'image QR en buffer PNG avec watermark anti-screenshot
        const qrImageBuffer = await QRCode.toBuffer(ticket.code_qr, {
            type: 'png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Headers pour image PNG avec protection
        res.set({
            'Content-Type': 'image/png',
            'Content-Length': qrImageBuffer.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': `inline; filename="ticket-${ticketId}-qr.png"`
        });

        console.log(`[Ticket Controller] QR PNG généré pour ticket ${ticketId}`);
        res.send(qrImageBuffer);

    } catch (error) {
        console.error('[Ticket Controller] Erreur génération QR PNG:', error);
        res.status(500).json({ 
            message: 'Erreur génération QR visuel', 
            detail: error.message 
        });
    }
}

// Afficher la page HTML du QR
async function getTicketQRPage(req, res) {
    try {
        const { ticketId } = req.params;
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).send(`
                <html>
                    <head><title>Non autorisé</title></head>
                    <body><h1>Utilisateur non authentifié</h1></body>
                </html>
            `);
        }

        const ticket = await Ticket.findOne({
            where: { 
                id: ticketId,
                utilisateur_id: userId 
            },
            include: [
                { model: Utilisateur, as: 'validateur', attributes: ['nom'] }
            ]
        });

        if (!ticket) {
            return res.status(404).send(`
                <html>
                    <head><title>Ticket non trouvé</title></head>
                    <body><h1>Ticket non trouvé</h1></body>
                </html>
            `);
        }

        // Vérifier si le ticket peut être affiché
        const now = new Date();
        const isExpired = new Date(ticket.date_expiration) < now;
        const isValidated = ticket.statut_validation;

        if (isValidated || isExpired) {
            return res.status(400).send(`
                <html>
                    <head><title>Ticket non disponible</title></head>
                    <body>
                        <h1>QR Code non disponible</h1>
                        <p>${isValidated ? 'Ce ticket a déjà été validé' : 'Ce ticket a expiré'}</p>
                    </body>
                </html>
            `);
        }

        if (!ticket.code_qr) {
            return res.status(400).send(`
                <html>
                    <head><title>QR non disponible</title></head>
                    <body><h1>QR Code non généré pour ce ticket</h1></body>
                </html>
            `);
        }

        // Générer l'image QR en base64
        const qrBase64 = await QRCode.toDataURL(ticket.code_qr, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Page HTML avec protection anti-screenshot
        const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <title>Ticket #${ticket.id} - Transport</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: 'Segoe UI', sans-serif;
                    text-align: center; 
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    /* Protection anti-screenshot */
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 500px;
                    width: 100%;
                    position: relative;
                }
                .header {
                    margin-bottom: 30px;
                }
                .qr-code {
                    margin: 30px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 15px;
                    position: relative;
                    /* Watermark pour décourager screenshots */
                    background-image: 
                        repeating-linear-gradient(45deg, 
                            transparent, 
                            transparent 35px, 
                            rgba(255,0,0,0.1) 35px, 
                            rgba(255,0,0,0.1) 70px);
                }
                .qr-code img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 10px;
                    /* Protection supplémentaire */
                    -webkit-user-drag: none;
                    -khtml-user-drag: none;
                    -moz-user-drag: none;
                    -o-user-drag: none;
                    user-drag: none;
                }
                .watermark {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 48px;
                    color: rgba(255,0,0,0.1);
                    font-weight: bold;
                    pointer-events: none;
                    z-index: 10;
                }
                .ticket-info {
                    margin-top: 30px;
                    text-align: left;
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                }
                .status {
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: bold;
                    background: #d4edda;
                    color: #155724;
                }
                .warning {
                    color: #856404;
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 20px;
                    padding: 15px;
                    background: #fff3cd;
                    border-radius: 5px;
                }
            </style>
            <script>
                // Protection anti-screenshot JavaScript
                document.addEventListener('keydown', function(e) {
                    // Bloquer F12, Ctrl+Shift+I, Ctrl+U, etc.
                    if (e.key === 'F12' || 
                        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                        (e.ctrlKey && e.key === 'u')) {
                        e.preventDefault();
                        return false;
                    }
                });
                
                // Détecter tentative de screenshot (mobile)
                document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                        // Masquer temporairement le contenu
                        document.body.style.visibility = 'hidden';
                        setTimeout(() => {
                            document.body.style.visibility = 'visible';
                        }, 100);
                    }
                });
                
                // Désactiver menu contextuel
                document.addEventListener('contextmenu', e => e.preventDefault());
            </script>
        </head>
        <body>
            <div class="container">
                <div class="watermark">PERSONNEL</div>
                <div class="header">
                    <h1>🎫 Ticket de Transport</h1>
                    <div>Ticket #${ticket.id}</div>
                </div>
                
                <div class="qr-code">
                    <img src="${qrBase64}" alt="QR Code" draggable="false" />
                </div>
                
                <div class="ticket-info">
                    <p><strong>Trajet :</strong> #${ticket.trajet_id}</p>
                    <p><strong>Expire le :</strong> ${new Date(ticket.date_expiration).toLocaleString('fr-FR')}</p>
                    <p><strong>Statut :</strong> 
                        <span class="status">Valide - Non payé</span>
                    </p>
                </div>
                
                <div class="warning">
                    ⚠️ ATTENTION: Ce QR code est personnel et ne doit pas être partagé. 
                    Toute tentative de fraude sera détectée et signalée.
                </div>
            </div>
        </body>
        </html>
        `;

        console.log(`[Ticket Controller] Page QR protégée générée pour ticket ${ticketId}`);
        res.set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Frame-Options': 'DENY', // Empêcher iframe
            'X-Content-Type-Options': 'nosniff'
        });
        res.send(html);

    } catch (error) {
        console.error('[Ticket Controller] Erreur génération page QR:', error);
        res.status(500).send('<h1>Erreur génération page</h1>');
    }
}

module.exports = { 
    createTicket, 
    validateTicket, 
    confirmCashPayment,
    getUserTickets,
    getTicketById,
    getTicketsValidatedByDriver,
    getTicketQR,
    getTicketQRPage
};