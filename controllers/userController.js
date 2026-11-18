'use strict';

const { User, Etudiant } = require('../models');
const { Op } = require('sequelize');

// GET /users — Liste tous les utilisateurs
exports.getAll = async (req, res) => {
  try {
    const { role, actif } = req.query;
    const where = {};
    if (role) where.role = role;
    if (actif !== undefined) where.actif = actif === 'true';

    const users = await User.findAll({
      where,
      include: [{ association: 'etudiantProfile', attributes: ['id', 'numero_etudiant', 'nom', 'prenom'] }],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /users/:id
exports.getById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ association: 'etudiantProfile' }],
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /users — Créer un utilisateur (admin only)
exports.create = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, etudiant_id, actif } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });

    const user = await User.create({
      nom, prenom, email, password,
      role: role || 'secretaire',
      etudiant_id: etudiant_id || null,
      actif: actif !== undefined ? actif : true,
    });
    return res.status(201).json(user);
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map(e => e.message) });
    }
    return res.status(500).json({ message: err.message });
  }
};

// PUT /users/:id
exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const { nom, prenom, email, password, role, etudiant_id, actif } = req.body;
    const updateData = { nom, prenom, email, role, etudiant_id, actif };
    if (password && password.length >= 6) updateData.password = password;

    await user.update(updateData);
    return res.status(200).json(user);
  } catch (err) {
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: err.errors.map(e => e.message) });
    }
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /users/:id/actif — Activer/Désactiver
exports.toggleActif = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    await user.update({ actif: !user.actif });
    return res.status(200).json({ message: `Utilisateur ${user.actif ? 'activé' : 'désactivé'}.`, user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /users/:id
exports.remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.id === req.userId) return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    await user.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
