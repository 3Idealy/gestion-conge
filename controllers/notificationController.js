'use strict';

const { Notification, User } = require('../models');

// GET /notifications — Mes notifications
exports.getAll = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { destinataire_id: req.userId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return res.status(200).json(notifications);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /notifications/unread-count
exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { destinataire_id: req.userId, lu: false },
    });
    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification || notification.destinataire_id !== req.userId) {
      return res.status(404).json({ message: 'Notification introuvable.' });
    }
    await notification.update({ lu: true });
    return res.status(200).json(notification);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { lu: true },
      { where: { destinataire_id: req.userId, lu: false } }
    );
    return res.status(200).json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /notifications/:id
exports.remove = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification || notification.destinataire_id !== req.userId) {
      return res.status(404).json({ message: 'Notification introuvable.' });
    }
    await notification.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── Helper : créer une notification ──────────────────────────────────────────
exports.createNotification = async ({ titre, message, type, destinataire_id, lien }) => {
  try {
    return await Notification.create({ titre, message, type, destinataire_id, lien });
  } catch (err) {
    console.error('Erreur création notification:', err.message);
    return null;
  }
};

// ── Helper : notifier plusieurs utilisateurs ─────────────────────────────────
exports.notifyUsers = async ({ titre, message, type, role, lien }) => {
  try {
    const where = {};
    if (role) where.role = role;
    where.actif = true;
    const users = await User.findAll({ where, attributes: ['id'] });
    const notifications = users.map(u => ({
      titre, message, type,
      destinataire_id: u.id,
      lien,
      lu: false,
    }));
    return await Notification.bulkCreate(notifications);
  } catch (err) {
    console.error('Erreur notification en masse:', err.message);
    return [];
  }
};
