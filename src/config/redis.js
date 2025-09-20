const { createClient } = require('redis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

console.log(`[Redis Config] Tentative de connexion à: ${REDIS_URL}`);

const redisClient = createClient({ 
    url: REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
});

redisClient.on('error', (err) => {
    console.error('[Redis] Erreur de connexion:', err);
});

redisClient.on('connect', () => {
    console.log('[Redis] Client connecté avec succès');
});

redisClient.on('ready', () => {
    console.log('[Redis] Client prêt à recevoir des commandes');
});

redisClient.on('end', () => {
    console.log('[Redis] Connexion fermée');
});


async function ValidatedRedistConnection() {
    try {
        if (!redisClient.isOpen) {
            console.log('[Redis] Tentative de connexion...');
            await redisClient.connect();
            console.log('[Redis] Connexion établie avec succès');
        }
        return true;
    } catch (error) {
        console.error('[Redis] Échec de connexion:', error);
        throw new Error(`Redis connection failed: ${error.message}`);
    }
}


async function closeRedisConnection() {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('[Redis] Connexion fermée proprement');
        }
    } catch (error) {
        console.error('[Redis] Erreur lors de la fermeture:', error);
    }
}

module.exports = { 
    redisClient, 
    ValidatedRedistConnection, 
    closeRedisConnection 
};