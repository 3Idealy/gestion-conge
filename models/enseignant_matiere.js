'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnseignantMatiere = sequelize.define(
  'EnseignantMatiere',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    enseignant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'enseignant', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    matiere_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'matiere', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    annee_universitaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'annee_universitaire', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'enseignant_matiere',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['enseignant_id', 'matiere_id', 'annee_universitaire_id'],
        name: 'unique_affectation',
      },
    ],
  }
);

module.exports = EnseignantMatiere;
