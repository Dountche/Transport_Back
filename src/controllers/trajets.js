const Joi = require('joi');
const { Trajet } = require('../models');

const trajetSchema = Joi.object({
    ligne_id: Joi.number().integer().required(),
    vehicule_id: Joi.number().integer().required(),
    heure_depart: Joi.date().iso().required(),
    heure_arrivee: Joi.date().iso().greater(Joi.ref('heure_depart')).required()
});

async function createTrajet(req, res) {
    const { error, value } = trajetSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        const trajet = await Trajet.create(value);
        return res.status(201).json({ message: "Trajet créé avec succès", trajet });
    } catch (err) {
        console.error("createTrajet error:", err);
        return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
}

async function listTrajets(req, res) {
    try {
        const trajets = await Trajet.findAll({ include: ['Ligne', 'Vehicule'] });
        return res.json({message: "listes des trajets recherché", trajets});
    } catch (err) {
        console.error("listTrajets error:", err);
        return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
}

async function updateTrajet(req, res) {
    const { error, value } = trajetSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        const { id } = req.params;
        const trajet = await Trajet.findByPk(id);
        if (!trajet) return res.status(404).json({ message: "Le trajet spécifié est introuvable." });

        await trajet.update(value);
        return res.json({ message: "Trajet mis à jour avec succès", trajet });
    } catch (err) {
        console.error("updateTrajet error:", err);
        return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
}

async function deleteTrajet(req, res) {
    try {
        const { id } = req.params;
        const trajet = await Trajet.findByPk(id);
        if (!trajet) return res.status(404).json({ message: "Trajet non trouvé." });

        await trajet.destroy();
        return res.json({ message: "Trajet supprimé avec succès." });
    } catch (err) {
        console.error("deleteTrajet error:", err);
        return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
}

async function getTrajetById(req, res) {
  try {
    const trajet = await Trajet.findByPk(req.params.id);
    if (!trajet) return res.status(404).json({ message: "Trajet non trouvé" });
    return res.json({message: "reponse du trajet recherché", trajet});
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}


module.exports = { createTrajet, listTrajets, updateTrajet, deleteTrajet, getTrajetById };
