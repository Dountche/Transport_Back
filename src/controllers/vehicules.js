const Joi = require('joi');
const { Vehicule } = require('../models');

const vehiculeSchema = Joi.object({
  immatriculation: Joi.string().min(4).required(),
  type: Joi.string().min(2).required(),
  statut_gps: Joi.boolean().required()
});

async function createVehicule(req, res) {
  const { error, value } = vehiculeSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const vehicule = await Vehicule.create(value);
    return res.status(201).json({ message: "Véhicule créé avec succès", vehicule });
  } catch (err) {
    console.error("createVehicule error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function listVehicules(req, res) {
  try {
    const vehicules = await Vehicule.findAll();
    return res.json({message: "listes des vehicules", vehicules});
  } catch (err) {
    console.error("listVehicules error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function updateVehicule(req, res) {
  const { error, value } = vehiculeSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { id } = req.params;
    const vehicule = await Vehicule.findByPk(id);
    if (!vehicule) return res.status(404).json({ message: "Véhicule non trouvé." });

    await vehicule.update(value);
    return res.json({ message: "Véhicule mis à jour avec succès.", vehicule });
  } catch (err) {
    console.error("updateVehicule error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function deleteVehicule(req, res) {
  try {
    const { id } = req.params;
    const vehicule = await Vehicule.findByPk(id);
    if (!vehicule) return res.status(404).json({ message: "Véhicule non trouvé." });

    await vehicule.destroy();
    return res.json({ message: "Véhicule supprimé avec succès." });
  } catch (err) {
    console.error("deleteVehicule error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function getVehiculeById(req, res) {
  try {
    const vehicule = await Vehicule.findByPk(req.params.id);
    if (!vehicule) return res.status(404).json({ message: "Véhicule non trouvé" });
    return res.json({message : "Voici le vehicule que vous avez recherché",vehicule});
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

module.exports = { createVehicule, listVehicules, updateVehicule, deleteVehicule, getVehiculeById };
