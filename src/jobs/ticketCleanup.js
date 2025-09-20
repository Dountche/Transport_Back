const cron = require('node-cron');
const { Ticket } = require('../models');
const { Op } = require('sequelize');

let cleanupRunning = false;

function startTicketsCleanup(io) {
    cron.schedule('*/2 * * * *', async () => {

        if (cleanupRunning) {
            console.log('[Cleanup] Tâche déjà en cours, ignore cette exécution');
            return;
        }

        cleanupRunning = true;
        const startTime = Date.now();

        try {
            const now = new Date();
            
            console.log(`[Cleanup] Début du nettoyage à ${now.toISOString()}`);
            
            // Recherche des tickets expirés et non validés
            const expiredTickets = await Ticket.findAll({
                where: {
                    date_expiration: { [Op.lt]: now },
                    statut_validation: false,
                    statut_expiration: false
                }
            });

            if (expiredTickets.length > 0) {
                await Ticket.update(
                    { statut_expiration: true },
                    { 
                        where: { 
                            id: { [Op.in]: expiredTickets.map(t => t.id) }
                        } 
                    }
                );

                const executionTime = Date.now() - startTime;
                console.log(`[Cleanup] ${expiredTickets.length} tickets expirés en ${executionTime}ms`);

                // Émission des événements WebSocket
                if (io) {
                    expiredTickets.forEach(ticket => {
                        io.emit('ticketExpired', {
                            ticketId: ticket.id,
                            utilisateur_id: ticket.utilisateur_id,
                            trajet_id: ticket.trajet_id,
                            expiredAt: now
                        });
                    });
                }
            } else {
                console.log('[Cleanup] Aucun ticket à expirer');
            }

        } catch (err) {
            console.error('[Cleanup error]', err.message);
            console.error('[Cleanup stack]', err.stack);
        } finally {
            cleanupRunning = false;
            const totalTime = Date.now() - startTime;
            console.log(`[Cleanup] Terminé en ${totalTime}ms`);
        }
    });

    console.log('[Cleanup] Service de nettoyage des tickets démarré (toutes les 5 minutes)');
}

module.exports = { startTicketsCleanup };
