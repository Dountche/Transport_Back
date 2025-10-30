const { Paiement, Ticket, Trajet, Utilisateur } = require('../models');
const { createPayout, getPayout } = require('../services/paiementService');
const { validateQRToken } = require('../services/qrService');
const { emitTicketValidated } = require('../websockets/ticketWebsocket');
const { emitDashboardUpdate } = require('../websockets/dashboardWebsockets');
const { createNotification } = require('./notifications');
const Joi = require('joi');
const crypto = require('crypto');

// Créer le paiement
async function createPaiement(req, res) {
  // Validation Joi des données d'entrée
  const schema = Joi.object({
    ticket_id: Joi.number().integer().positive().required(),
    montant: Joi.number().positive().min(200).max(1000000).required(),
    mobile: Joi.string().pattern(/^[+]?[0-9]{8,15}$/).required(),
    token: Joi.string().min(10).required(),
    name: Joi.string().min(2).max(100).optional(),
    currency: Joi.string().length(3).valid('XOF', 'EUR', 'USD').default('XOF')
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Données invalides', 
      detail: error.details[0].message 
    });
  }

  try {
    const { ticket_id, montant, mobile, token, name, currency } = value;
    const utilisateur_id = req.Utilisateur?.id || null;

    console.log(`[Paiement] Création paiement - Ticket: ${ticket_id}, Montant: ${montant} ${currency}`);

    // Vérifier le ticket
    const ticket = await Ticket.findByPk(ticket_id);
    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket introuvable ou inexistant, veuillez réessayer' 
      });
    }

    // Vérifier que le ticket n'est pas déjà payé
    if (ticket.statut_payer) {
      return res.status(400).json({ 
        message: 'Ce ticket a déjà été payé',
        ticket_id: ticket.id
      });
    }

    // Vérifier que le ticket n'a pas expiré
    if (new Date() > new Date(ticket.date_expiration)) {
      return res.status(400).json({ 
        message: 'Ce ticket a expiré',
        date_expiration: ticket.date_expiration
      });
    }

    // Créer payout via Wave
    const client_reference = `ticket-${ticket_id}-${Date.now()}`;
    console.log(`[Paiement] Appel Wave API - Référence: ${client_reference}`);
    
    const payoutRes = await createPayout({
      amount: montant,
      currency,
      mobile,
      name,
      client_reference,
      payment_reason: `Paiement du ticket ${ticket_id}`
    });

    if (!payoutRes.success) {
      console.error('[Paiement] Erreur Wave:', payoutRes.error);
      return res.status(502).json({ 
        message: 'Erreur service Wave', 
        detail: payoutRes.error,
        status: payoutRes.status
      });
    }

    console.log(`[Paiement] Payout Wave créé:`, payoutRes.data?.id);

    const payout = payoutRes.data;
    
    // Enregistrer paiement en DB
    const paiement = await Paiement.create({
      montant,
      date: new Date(),
      methode: 'WAVE',
      transaction_id: payout.id || payout.transaction_id || payoutRes.idempotencyKey,
      ticket_id,
      utilisateur_id
    });

    console.log(`[Paiement] Paiement enregistré en DB:`, paiement.id);

    // marquer le ticket payé
    await ticket.update({ 
      statut_payer: true
    });

    console.log(`[Paiement] Ticket ${ticket_id} marqué comme PAYÉ`);

    // Valider le token Qr
    const validatorId = utilisateur_id ? String(utilisateur_id) : 'payment-service';
    const qrValidation = await validateQRToken(token, validatorId);

    if (!qrValidation.valid) {
      console.warn(`[Paiement] QR Token invalide après paiement:`, qrValidation.reason);
      
      // Le paiement est effectué mais le QR n'est pas valide
      return res.status(400).json({ 
        message: 'Paiement effectué mais QR Code invalide', 
        paiement_id: paiement.id,
        validation: qrValidation
      });
    }

    // Créer une notification pour l'utilisateur
    if (utilisateur_id) {
      await createNotification(
        utilisateur_id, 
        'paiement',
        'Paiement effectué',
        `Votre paiement de ${montant} ${currency} pour le ticket #${ticket_id} a été effectué avec succès.`,
        { ticket_id, montant, paiement_id: paiement.id }
      );
    }

    // Notifications WebSocket
    if (req.io) {
      if (utilisateur_id) {
        req.io.to(`user_${utilisateur_id}`).emit('paiementEffectue', {
          ticket_id: ticket.id,
          montant,
          currency,
          paiement_id: paiement.id,
          timestamp: new Date()
        });
      }

      // Notifier les chauffeurs concernés
      const trajet = await Trajet.findByPk(ticket.trajet_id, {
        include: [{ model: require('../models').ChauffeurVehicule, as: 'vehicule' }]
      });

      if (trajet && trajet.vehicule) {
        const chauffeurVehicule = await require('../models').ChauffeurVehicule.findOne({
          where: { vehicule_id: trajet.vehicule_id, actif: true }
        });

        if (chauffeurVehicule) {
          req.io.to(`user_${chauffeurVehicule.chauffeur_id}`).emit('ticketPaye', {
            ticket_id: ticket.id,
            client_id: utilisateur_id,
            montant,
            currency,
            timestamp: new Date()
          });
        }
      }

      // Notifier les admins
      emitDashboardUpdate(req.io, { 
        type: 'paiementEffectue', 
        paiementId: paiement.id, 
        ticketId: ticket.id, 
        montant, 
        currency,
        userId: utilisateur_id,
        methode: 'WAVE',
        timestamp: new Date() 
      });
    }

    return res.status(201).json({ 
      message: 'Paiement effectué avec succès', 
      paiement: {
        id: paiement.id,
        montant: paiement.montant,
        currency,
        methode: paiement.methode,
        date: paiement.date,
        ticket_id: paiement.ticket_id,
        transaction_id: paiement.transaction_id
      },
      payout: {
        id: payout.id,
        status: payout.status,
        client_reference: payout.client_reference
      },
      ticket: {
        id: ticket.id,
        statut_payer: true,
        statut_validation: ticket.statut_validation,
        date_expiration: ticket.date_expiration
      },
      instructions: "Présentez votre QR Code au chauffeur pour validation"
    });

  } catch (err) {
    console.error('[Paiement] Erreur createPaiement:', err);
    return res.status(500).json({ 
      message: 'Erreur lors de la création du paiement', 
      detail: err.message 
    });
  }
}

// Créer un paiement espèces
async function createPaiementEspeces(req, res) {
  const schema = Joi.object({
    ticket_id: Joi.number().integer().positive().required(),
    montant: Joi.number().positive().min(200).max(1000000).required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    console.log("erreur ", error)
    return res.status(400).json({ 
      message: 'Données invalides', 
      detail: error.details[0].message 
    });
  }

  try {
    const { ticket_id, montant } = value;
    const utilisateur_id = req.Utilisateur?.id;

    if (!utilisateur_id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    console.log(`[Paiement Espèces] Client ${utilisateur_id} souhaite payer le ticket ${ticket_id} en espèces`);

    // Vérifier le ticket
    const ticket = await Ticket.findByPk(ticket_id, {
      include: [
        { model: Utilisateur, as: 'client' },
        { model: Trajet, include: ['ligne', 'vehicule'] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket introuvable' });
    }

    // Vérifier que le ticket appartient bien à l'utilisateur
    if (ticket.utilisateur_id !== utilisateur_id) {
      return res.status(403).json({ 
        message: 'Ce ticket ne vous appartient pas' 
      });
    }

    if (ticket.statut_payer) {
      return res.status(400).json({ 
        message: 'Ce ticket a déjà été payé' 
      });
    }

    if (new Date() > new Date(ticket.date_expiration)) {
      return res.status(400).json({ 
        message: 'Ce ticket a expiré',
        date_expiration: ticket.date_expiration
      });
    }

    const transaction_id = `cash_${ticket_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer le paiement en espèces
    const paiement = await Paiement.create({
      montant,
      date: new Date(),
      methode: 'ESPECES',
      transaction_id,
      ticket_id,
      utilisateur_id,
    });

    console.log(`[Paiement Espèces] Paiement créé - ID: ${paiement.id}, Transaction: ${transaction_id}`);

    // Notification pour l'utilisateur
    await createNotification(
      utilisateur_id,
      'paiement',
      'Paiement en espèces enregistré',
      `Votre paiement en espèces de ${montant} FCFA a été enregistré. Présentez votre ticket au chauffeur qui confirmera le paiement.`,
      { ticket_id, montant, paiement_id: paiement.id }
    );

    // Trouver le chauffeur assigné au véhicule
    const trajet = await Trajet.findByPk(ticket.trajet_id, {
      include: ['vehicule']
    });

    if (trajet && trajet.vehicule_id) {
      const chauffeurVehicule = await require('../models').ChauffeurVehicule.findOne({
        where: { vehicule_id: trajet.vehicule_id, actif: true }
      });

      if (chauffeurVehicule) {
        if (req.io) {
          req.io.to(`user_${chauffeurVehicule.chauffeur_id}`).emit('paiementEspecesDeclaré', {
            ticket_id: ticket.id,
            client_id: utilisateur_id,
            client_nom: ticket.client?.nom,
            montant,
            reservation_id,
            timestamp: new Date()
          });
        }

        // Notification pour le chauffeur
        await createNotification(
          chauffeurVehicule.chauffeur_id,
          'paiement_especes',
          'Paiement en espèces à confirmer',
          `Le client ${ticket.client?.nom} (Ticket #${ticket_id}) souhaite payer ${montant} FCFA en espèces. Scannez son QR code pour confirmer.`,
          { ticket_id, client_id: utilisateur_id, montant }
        );
      }
    }

    // Notification Dashboard Admin
    if (req.io) {
      emitDashboardUpdate(req.io, { 
        type: 'paiementEspecesDeclare', 
        paiementId: paiement.id, 
        ticketId: ticket.id, 
        montant,
        userId: utilisateur_id,
        methode: 'ESPECES',
        timestamp: new Date() 
      });
    }

    return res.status(201).json({
      message: 'Paiement en espèces enregistré avec succès',
      paiement: {
        id: paiement.id,
        montant: paiement.montant,
        methode: 'ESPECES',
        date: paiement.date,
        statut: 'EN_ATTENTE'
      },
      ticket: {
        id: ticket.id,
        statut_payer: false,
        statut_validation: false,
        date_expiration: ticket.date_expiration
      },
      instructions: "Présentez votre QR Code au chauffeur qui confirmera le paiement en espèces lors de la validation."
    });

  } catch (error) {
    console.error('[Paiement Espèces] Erreur:', error);
    return res.status(500).json({
      message: 'Erreur lors de l\'enregistrement du paiement espèces',
      detail: error.message
    });
  }
}

/// confirmer un paiement espece (par le chauffeur)
async function confirmerPaiementEspeces(req, res) {
  try {
    const { ticket_id } = req.params;
    const chauffeur_id = req.Utilisateur?.id;

    if (!chauffeur_id) {
      return res.status(401).json({ message: 'Chauffeur non authentifié' });
    }

    const ticket = await Ticket.findByPk(ticket_id, {
      include: [{ model: Utilisateur, as: 'client' }]
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket introuvable' });
    }

    // Trouver le paiement espèces en attente
    const paiement = await Paiement.findOne({
      where: { 
        ticket_id,
        methode: 'ESPECES'
      }
    });

    if (!paiement) {
      return res.status(404).json({ 
        message: 'Aucun paiement espèces trouvé pour ce ticket' 
      });
    }

    // Marquer le ticket comme payé
    await ticket.update({ statut_payer: true });

    console.log(`[Paiement Espèces] Confirmé - Ticket ${ticket_id}, Chauffeur ${chauffeur_id}`);

    // Notification client
    if (ticket.utilisateur_id) {
      await createNotification(
        ticket.utilisateur_id,
        'paiement',
        'Paiement espèces confirmé',
        `Votre paiement en espèces de ${paiement.montant} FCFA a été confirmé par le chauffeur.`,
        { ticket_id, montant: paiement.montant, paiement_id: paiement.id }
      );
    }

    return res.status(200).json({
      message: 'Paiement espèces confirmé',
      paiement: {
        id: paiement.id,
        montant: paiement.montant,
        statut: 'CONFIRME',
        confirme_par: chauffeur_id
      }
    });

  } catch (error) {
    console.error('[Paiement Espèces] Erreur confirmation:', error);
    return res.status(500).json({
      message: 'Erreur lors de la confirmation du paiement',
      detail: error.message
    });
  }
}

// liste des paiements
async function listPaiements(req, res) {
  try {
    const rows = await Paiement.findAll({ 
      order: [['date', 'DESC']],
      include: [
        { model: Ticket, include: [{ model: Utilisateur, as: 'client', attributes: ['nom', 'email'] }] }
      ]
    });
    return res.json({ message: "Liste des paiements", data: rows });
  } catch (err) {
    console.error('listPaiements error', err);
    return res.status(500).json({ message: 'Erreur listPaiements', detail: err.message });
  }
}

//paiements d'un user
async function listUserPaiements(req, res) {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ message: 'id utilisateur invalide' });

    const rows = await Paiement.findAll({ 
      where: { utilisateur_id: userId }, 
      order: [['date', 'DESC']],
      include: [{ model: Ticket }]
    });

    return res.json({message : `Liste des paiements de l'utilisateur ${userId}`, data : rows});
  } catch (err) {
    console.error('listUserPaiements error', err);
    return res.status(500).json({ message: 'Erreur listUserPaiements', detail: err.message });
  }
}

//last paiement
async function lastPaymentForUser(req, res) {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ message: 'id utilisateur invalide' });

    const paiement = await Paiement.findOne({ 
      where: { utilisateur_id: userId }, 
      order: [['date', 'DESC']],
      include: [{ model: Ticket, include: [{ model: Trajet }] }]
    });
    
    if (!paiement) return res.status(404).json({ message: 'Aucun paiement trouvé' });

    const ticket = paiement.Ticket;
    const trajet = ticket?.Trajet;

    return res.json({ 
      message :`Dernier paiement de l'utilisateur ${userId}`, 
      paiement, 
      ticket, 
      trajet 
    });
  } catch (err) {
    console.error('lastPaymentForUser error', err);
    return res.status(500).json({ message: 'Erreur lastPaymentForUser', detail: err.message });
  }
}

// Webhook Wave
async function waveWebhookHandler(req, res) {
  try {
    const header = req.get('Wave-Signature') || req.get('wave-signature') || '';
    const secret = process.env.WAVE_WEBHOOK_SECRET || 'secret_webhook_wave';
    const rawBody = req.rawBody || req.bodyRaw || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);

    if (!header) {
      console.warn('[Wave Webhook] Missing Wave-Signature header');
      return res.status(400).send('absence de signature');
    }

    // Validation signature
    const parts = header.split(',').map(p => p.trim());
    const map = {};
    parts.forEach(p => {
      const [k, v] = p.split('=');
      map[k] = v;
    });
    const t = map.t;
    const signatures = [];
    Object.keys(map).forEach(k => { if (k.startsWith('v')) signatures.push(map[k]); });

    const payloadForSig = (t || '') + (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody);
    const hmac = crypto.createHmac('sha256', secret).update(payloadForSig).digest('hex');

    const matched = signatures.some(sig => sig === hmac);
    if (!matched) {
      console.warn('[Wave Webhook] signature mismatch');
      return res.status(400).send('signature invalide');
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('[Wave Webhook] événement reçu', event);

    const type = event.type || event.event || null;
    if (type && type.includes('payout')) {
      const payout = event.data || event.object || null;

      if (payout && payout.id) {
        const payment = await Paiement.findOne({ where: { transaction_id: payout.id } });
        if (payment) {
          console.log('[Wave Webhook] paiement trouvé pour le versement', payment.id, payout.status);

          emitDashboardUpdate(req.io, { 
            type: 'payoutWebhook', 
            paiementId: payment.id, 
            payoutStatus: payout.status, 
            timestamp: new Date() 
          });
        }
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('waveWebhookHandler error', err);
    return res.status(500).send('error');
  }
}

module.exports = { 
  createPaiement, 
  createPaiementEspeces,
  confirmerPaiementEspeces,
  listPaiements, 
  listUserPaiements, 
  lastPaymentForUser, 
  waveWebhookHandler 
};