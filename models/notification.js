'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    titre: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('note_publiee', 'delai_saisie', 'deliberation', 'systeme', 'info'),
      allowNull: false,
      defaultValue: 'info',
    },
    destinataire_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    lu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lien: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Lien de redirection (ex: /notes, /deliberations)',
    },
  },
  {
    tableName: 'notification',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Notification;
