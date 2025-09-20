const bcrypt = require('bcrypt');
const {Utilisateur} = require('../models');
const { Op } = require('sequelize');

async function getProfile(req, res) {
  try {
    const id = req.Utilisateur?.id;
    if (!id) return res.status(401).json({ message: 'Non authentifié' });

    const user = await Utilisateur.findByPk(id, { attributes: { exclude: ['mot_de_passe_hash'] } });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    return res.json({ utilisateur: user });
  } catch (err) {
    console.error('getProfile error', err);
    return res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const id = req.Utilisateur?.id;
    if (!id) return res.status(401).json({ message: 'Non authentifié' });

    const { nom, telephone, email, password } = req.body;
    const user = await Utilisateur.findByPk(id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const toUpdate = {};
    if (nom) toUpdate.nom = nom;
    if (telephone) toUpdate.telephone = telephone;
    if (email) toUpdate.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      toUpdate.mot_de_passe_hash = await bcrypt.hash(password, salt);
    }

    await user.update(toUpdate);
    const safe = await Utilisateur.findByPk(id, { attributes: { exclude: ['mot_de_passe_hash'] } });

    return res.json({ message: 'Profil mis à jour', utilisateur: safe });
  } catch (err) {
    console.error('updateProfile error', err);

    return res.status(500).json({ message: 'Erreur mise à jour', detail: err.message });
  }
}

async function deleteProfile(req, res) {
  try {
    const id = req.Utilisateur?.id;
    if (!id) return res.status(401).json({ message: 'Non authentifié' });

    await Utilisateur.destroy({ where: { id } });

    return res.json({ message: 'Compte supprimé' });
  } catch (err) {
    console.error('deleteProfile error', err);
    return res.status(500).json({ message: 'Erreur suppression', detail: err.message });
  }
}

module.exports = { getProfile, updateProfile, deleteProfile };
