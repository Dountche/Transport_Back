const Joi = require('joi');
const { Ligne } = require('../models');

// Validation schema avec Joi
const ligneSchema = Joi.object({
  nom: Joi.string().min(2).required(),
  arrets: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(),
      Joi.object().unknown()
    )
  ).required()
});

async function createLigne(req, res) {
  const { error, value } = ligneSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const ligne = await Ligne.create(value);
    return res.status(201).json({ message: "Votre ligne a été créée avec succès", ligne });
  } catch (err) {
    console.error("createLigne error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function listLignes(req, res) {
  try {
    const lignes = await Ligne.findAll();
    return res.json({message: "Listes de toutes les lignes", lignes});
  } catch (err) {
    console.error("listLignes error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function updateLigne(req, res) {
  const { error, value } = ligneSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { id } = req.params;
    const ligne = await Ligne.findByPk(id);
    if (!ligne) return res.status(404).json({ message: "Ligne non trouvée" });

    await ligne.update(value);
    return res.json({ message: "Ligne mise à jour avec succès", ligne });
  } catch (err) {
    console.error("updateLigne error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function deleteLigne(req, res) {
  try {
    const { id } = req.params;
    const ligne = await Ligne.findByPk(id);
    if (!ligne) return res.status(404).json({ message: "Ligne non trouvée" });

    await ligne.destroy();
    return res.json({ message: "Ligne supprimée avec succès" });
  } catch (err) {
    console.error("deleteLigne error:", err);
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

async function getLigneById(req, res) {
  try {
    const ligne = await Ligne.findByPk(req.params.id);
    if (!ligne) return res.status(404).json({ message: "Ligne non trouvé" });
    return res.json({message: "resultat pour la ligne recherchée", ligne});
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
}

module.exports = { createLigne, listLignes, updateLigne, deleteLigne, getLigneById };
