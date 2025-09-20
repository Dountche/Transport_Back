const { PositionGPS } = require('../models');
const { redisClient } = require('../config/redis');

async function insertPosition(point, options = {}) {
  const { vehicule_id, latitude, longitude, timestamp } = point;

  // Insert en DB
  const saved = await PositionGPS.create({
    vehicule_id,
    latitude,
    longitude,
    timestamp: timestamp || new Date()
  });

  const last = {
    id: saved.id,
    vehicule_id: saved.vehicule_id,
    latitude: Number(saved.latitude),
    longitude: Number(saved.longitude),
    timestamp: saved.timestamp
  };

  // Stocker la dernière position en Redis
  try {
    await redisClient.set(`vehicule:${vehicule_id}:lastpos`, JSON.stringify(last), { EX: 60 * 60 }); // expire 1h (configurable)
  } catch (err) {
    console.error('Redis set error (lastpos):', err.message);
  }

  // Publish sur channel
  try {
    await redisClient.publish('gps_updates', JSON.stringify(last));
  } catch (err) {
    console.error('Redis publish error (gps_updates):', err.message);
  }

  if (options.io) {
    try {
      // Room du véhicule
      options.io.to(`vehicule_${vehicule_id}`).emit('positionUpdate', last);

      // Room globale
      options.io.to('gps_all').emit('gpsUpdate', last);

      // Emission globale fallback
      options.io.emit('gpsBroadcast', last);

      console.log(`[Position Service] Émis positionUpdate -> vehicule_${vehicule_id}, gpsUpdate -> gps_all, gpsBroadcast -> global`);
    } catch (err) {
      console.error('Socket emit error (position):', err.message);
    }
  }

  return saved;
}

async function getLastPosition(vehiculeId) {
  try {
    const raw = await redisClient.get(`vehicule:${vehiculeId}:lastpos`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Redis get error (lastpos):', err.message);
  }

  // Fallback DB
  const latest = await PositionGPS.findOne({
    where: { vehicule_id: vehiculeId },
    order: [['timestamp', 'DESC']]
  });

  if (!latest) return null;
  return {
    id: latest.id,
    vehicule_id: latest.vehicule_id,
    latitude: Number(latest.latitude),
    longitude: Number(latest.longitude),
    timestamp: latest.timestamp
  };
}

async function getRoute(vehiculeId, start, end, limit = 1000) {
  const { Op } = require('sequelize');
  const whereOp = { vehicule_id: vehiculeId };
  if (start || end) {
    whereOp.timestamp = {};
    if (start) whereOp.timestamp[Op.gte] = new Date(start);
    if (end) whereOp.timestamp[Op.lte] = new Date(end);
  }

  const points = await PositionGPS.findAll({
    where: whereOp,
    order: [['timestamp', 'ASC']],
    limit: parseInt(limit, 10)
  });

  return points.map(p => ({
    id: p.id,
    vehicule_id: p.vehicule_id,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    timestamp: p.timestamp
  }));
}

module.exports = { insertPosition, getLastPosition, getRoute };
