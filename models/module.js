'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Module = sequelize.define(
  'Module',
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
        notEmpty: { msg: 'Le code du module est requis.' },
        is: { args: /^[A-Za-z0-9_-]+$/, msg: 'Le code ne doit contenir que des lettres, chiffres, tirets ou underscores.' },
      },
    },
    libelle: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le libellé du module est requis.' },
      },
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        isInt: { msg: 'Les crédits doivent être un nombre entier.' },
        min: { args: [1], msg: 'Les crédits doivent être supérieurs à 0.' },
        max: { args: [30], msg: 'Les crédits ne peuvent pas dépasser 30.' },
      },
    },
    semestre: {
      type: DataTypes.ENUM('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'),
      allowNull: false,
    },
    parcours_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'parcours', key: 'id' },
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
  },
  {
    tableName: 'module',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Module;
