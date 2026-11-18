'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Deliberation = sequelize.define(
  'Deliberation',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    annee_universitaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'annee_universitaire', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    niveau_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'niveau', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    parcours_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'parcours', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    session_examen_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'session_examen', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    date_deliberation: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'terminee', 'annulee'),
      allowNull: false,
      defaultValue: 'en_cours',
    },
    president_jury: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'deliberation',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['annee_universitaire_id', 'niveau_id', 'parcours_id', 'session_examen_id'],
        name: 'unique_deliberation',
      },
    ],
  }
);

module.exports = Deliberation;
