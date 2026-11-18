'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Matiere = sequelize.define(
  'Matiere',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Le code de la matière est requis.' },
        is: { args: /^[A-Za-z0-9_-]+$/, msg: 'Le code ne doit contenir que des lettres, chiffres, tirets ou underscores.' },
      },
    },
    libelle: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le libellé de la matière est requis.' },
      },
    },
    coefficient: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: { args: [0.5], msg: 'Le coefficient minimum est 0.5.' },
        max: { args: [10], msg: 'Le coefficient maximum est 10.' },
      },
    },
    volume_horaire: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Volume horaire en heures',
      validate: {
        isInt: { msg: 'Le volume horaire doit être un nombre entier.' },
        min: { args: [1], msg: 'Le volume horaire doit être supérieur à 0.' },
      },
    },
    type_matiere: {
      type: DataTypes.ENUM('CM', 'TD', 'TP', 'PROJET'),
      allowNull: false,
      defaultValue: 'CM',
      comment: 'Cours Magistral, Travaux Dirigés, Travaux Pratiques, Projet',
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'module', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    enseignant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'enseignant', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Enseignant responsable de la matière',
    },
  },
  {
    tableName: 'matiere',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Matiere;
