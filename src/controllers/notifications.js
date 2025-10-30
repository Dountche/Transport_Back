const { redisClient, ValidatedRedistConnection } = require('../config/redis');

// Récupérer la liste des notifications pour un utilisateur
async function getNotifications(req, res) {
    try {
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        await ValidatedRedistConnection();

        // Récupérer les notifications depuis Redis
        const notificationKey = `notifications:${userId}`;
        const notifications = await redisClient.lRange(notificationKey, 0, -1);

        // Parser les notifications JSON
        const parsedNotifications = notifications.map(notif => {
            try {
                return JSON.parse(notif);
            } catch (e) {
                return null;
            }
        }).filter(n => n !== null);

        // Trier par timestamp décroissant
        parsedNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`[Notifications] ${parsedNotifications.length} notification(s) récupérée(s) pour utilisateur ${userId}`);

        return res.status(200).json({
            message: `${parsedNotifications.length} notification(s)`,
            notifications: parsedNotifications,
            non_lues: parsedNotifications.filter(n => !n.lu).length
        });

    } catch (error) {
        console.error('[Notifications] Erreur récupération:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des notifications',
            detail: error.message
        });
    }
}

// Marquer des notifications comme lues
async function markAsRead(req, res) {
    try {
        const userId = req.Utilisateur?.id;
        const { notification_ids } = req.body; // Array d'IDs de notifications

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
            return res.status(400).json({ message: 'IDs de notifications requis' });
        }

        await ValidatedRedistConnection();

        const notificationKey = `notifications:${userId}`;
        
        // Récupérer toutes les notifications
        const notifications = await redisClient.lRange(notificationKey, 0, -1);
        
        let updatedCount = 0;
        const updatedNotifications = notifications.map(notifStr => {
            try {
                const notif = JSON.parse(notifStr);
                if (notification_ids.includes(notif.id)) {
                    notif.lu = true;
                    notif.date_lecture = new Date().toISOString();
                    updatedCount++;
                }
                return JSON.stringify(notif);
            } catch (e) {
                return notifStr;
            }
        });

        // Remettre les notifications mises à jour dans Redis
        if (updatedCount > 0) {
            await redisClient.del(notificationKey);
            if (updatedNotifications.length > 0) {
                await redisClient.lPush(notificationKey, ...updatedNotifications);
                // Expiration après 30 jours
                await redisClient.expire(notificationKey, 30 * 24 * 60 * 60);
            }
        }

        console.log(`[Notifications] ${updatedCount} notification(s) marquée(s) comme lue(s) pour utilisateur ${userId}`);

        return res.status(200).json({
            message: `${updatedCount} notification(s) marquée(s) comme lue(s)`,
            notifications_mises_a_jour: updatedCount
        });

    } catch (error) {
        console.error('[Notifications] Erreur marquage lu:', error);
        return res.status(500).json({
            message: 'Erreur lors du marquage des notifications',
            detail: error.message
        });
    }
}

// Créer une nouvelle notification (fonction utilitaire)
async function createNotification(userId, type, titre, message, data = null) {
    try {
        await ValidatedRedistConnection();

        const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            user_id: userId,
            type: type, // 'reservation', 'paiement', 'validation', 'fraude', etc.
            titre: titre,
            message: message,
            data: data, // Données supplémentaires (ID ticket, réservation, etc.)
            lu: false,
            timestamp: new Date().toISOString()
        };

        const notificationKey = `notifications:${userId}`;
        
        // Ajouter la notification
        await redisClient.lPush(notificationKey, JSON.stringify(notification));
        
        // Garder seulement les 100 dernières notifications
        await redisClient.lTrim(notificationKey, 0, 99);
        
        // Expiration après 30 jours
        await redisClient.expire(notificationKey, 30 * 24 * 60 * 60);

        console.log(`[Notifications] Notification créée pour utilisateur ${userId}: ${titre}`);

        return notification;

    } catch (error) {
        console.error('[Notifications] Erreur création notification:', error);
        return null;
    }
}

// Supprimer toutes les notifications d'un utilisateur
async function clearAllNotifications(req, res) {
    try {
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        await ValidatedRedistConnection();

        const notificationKey = `notifications:${userId}`;
        const deleted = await redisClient.del(notificationKey);

        console.log(`[Notifications] Toutes les notifications supprimées pour utilisateur ${userId}`);

        return res.status(200).json({
            message: 'Toutes les notifications ont été supprimées',
            supprimees: deleted > 0
        });

    } catch (error) {
        console.error('[Notifications] Erreur suppression:', error);
        return res.status(500).json({
            message: 'Erreur lors de la suppression des notifications',
            detail: error.message
        });
    }
}

// Compter les notifications non lues
async function getUnreadCount(req, res) {
    try {
        const userId = req.Utilisateur?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        await ValidatedRedistConnection();

        const notificationKey = `notifications:${userId}`;
        const notifications = await redisClient.lRange(notificationKey, 0, -1);

        const unreadCount = notifications.filter(notifStr => {
            try {
                const notif = JSON.parse(notifStr);
                return !notif.lu;
            } catch (e) {
                return false;
            }
        }).length;

        return res.status(200).json({
            non_lues: unreadCount,
            total: notifications.length
        });

    } catch (error) {
        console.error('[Notifications] Erreur comptage non lues:', error);
        return res.status(500).json({
            message: 'Erreur lors du comptage des notifications',
            detail: error.message
        });
    }
}

module.exports = {
    getNotifications,
    markAsRead,
    createNotification,
    clearAllNotifications,
    getUnreadCount
};