'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NoteHistory = sequelize.define(
  'NoteHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    note_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'note', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    ancienne_valeur: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    nouvelle_valeur: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    ancien_statut: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    nouveau_statut: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    modifie_par: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    motif: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'note_history',
    timestamps: true,
    underscored: true,
  }
);

module.exports = NoteHistory;
