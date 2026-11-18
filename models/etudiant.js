'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Etudiant = sequelize.define(
  'Etudiant',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    numero_etudiant: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Le numéro étudiant est requis.' },
        is: { args: /^\d+$/, msg: 'Le numéro étudiant ne doit contenir que des chiffres.' },
      },
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le nom est requis.' },
        is: { args: /^[A-Za-zÀ-ÿ\s'-]+$/i, msg: 'Le nom ne doit contenir que des lettres.' },
      },
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le prénom est requis.' },
        is: { args: /^[A-Za-zÀ-ÿ\s'-]+$/i, msg: 'Le prénom ne doit contenir que des lettres.' },
      },
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: { msg: 'La date de naissance doit être une date valide.' },
      },
    },
    lieu_naissance: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    genre: {
      type: DataTypes.ENUM('M', 'F'),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: { msg: 'L\'adresse email n\'est pas valide.' },
      },
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: { args: /^[\d\s+().-]{6,20}$/, msg: 'Le téléphone ne doit contenir que des chiffres et caractères téléphoniques.' },
      },
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
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'etudiant',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Etudiant;
