const Joi = require("joi");
const { insertPosition, getLastPosition, getRoute } = require('../services/positionService');
const { emitDashboardUpdate } = require('../websockets/dashboardWebsockets');


// validation avec joi
const positionSchema = Joi.object({
  vehicule_id: Joi.number().integer().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  timestamp: Joi.date().iso().optional()
});

const routeQuerySchema = Joi.object({
  start: Joi.date().iso().optional(),
  end: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).optional()
});

const idSchema = Joi.number().integer().positive().required();

async function postPosition(req, res) {
  const { error, value } = positionSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const saved = await insertPosition(value, { io: req.io });

    emitDashboardUpdate(req.io, { 
      type: 'positionUpdate', 
      vehiculeId: saved.vehicule_id, 
      lat: saved.latitude, 
      lng: saved.longitude, 
      timestamp: saved.timestamp 
    });

    return res.status(201).json({
      message: 'Position enregistrée',
      position: {
        id: saved.id,
        vehicule_id: saved.vehicule_id,
        latitude: saved.latitude,
        longitude: saved.longitude,
        timestamp: saved.timestamp
      }
    });
  } catch (err) {
    console.error('postPosition error:', err);
    return res.status(500).json({ message: 'Erreur enregistrement position', detail: err.message });
  }
}

async function getLast(req, res) {
  const { vehiculeId } = req.params;
  const { error } = idSchema.validate(vehiculeId);
  if (error) return res.status(400).json({ message: "ID de véhicule invalide" });

  try {
    const last = await getLastPosition(vehiculeId);
    if (!last) return res.status(404).json({ message: 'Aucune position trouvée' });
    return res.json(last);
  } catch (err) {
    console.error('getLast error:', err);
    return res.status(500).json({ message: 'Erreur lecture position', detail: err.message });
  }
}

async function getRouteHandler(req, res) {
  const { vehiculeId } = req.params;
  const { error: idError } = idSchema.validate(vehiculeId);
  if (idError) return res.status(400).json({ message: "ID de véhicule invalide" });

  const { error: queryError, value } = routeQuerySchema.validate(req.query);
  if (queryError) return res.status(400).json({ message: queryError.details[0].message });

  try {
    const route = await getRoute(vehiculeId, value.start, value.end, value.limit);
    return res.json({ points: route });
  } catch (err) {
    console.error('getRoute error:', err);
    return res.status(500).json({ message: 'Erreur récupération route', detail: err.message });
  }
}

module.exports = { postPosition, getLast, getRouteHandler };
