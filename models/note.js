'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Note = sequelize.define(
  'Note',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    valeur: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: { args: [0], msg: 'La note ne peut pas être négative.' },
        max: { args: [20], msg: 'La note ne peut pas dépasser 20.' },
      },
    },
    type_note: {
      type: DataTypes.ENUM('CC', 'Examen', 'Rattrapage'),
      allowNull: false,
      defaultValue: 'Examen',
      comment: 'Contrôle Continu, Examen final, Rattrapage',
    },
    statut: {
      type: DataTypes.ENUM('saisie', 'validee'),
      allowNull: false,
      defaultValue: 'saisie',
    },
    est_absent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    type_absence: {
      type: DataTypes.ENUM('ABJ', 'ABI'),
      allowNull: true,
      comment: 'ABJ = Absence Justifiée, ABI = Absence Injustifiée',
    },
    mention_note: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.getDataValue('est_absent')) {
          return this.getDataValue('type_absence') || 'ABS';
        }
        const v = parseFloat(this.getDataValue('valeur'));
        if (isNaN(v)) return 'N/A';
        if (v >= 16) return 'Très Bien';
        if (v >= 14) return 'Bien';
        if (v >= 12) return 'Assez Bien';
        if (v >= 10) return 'Passable';
        return 'Insuffisant';
      },
    },
    observation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    etudiant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'etudiant', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    matiere_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'matiere', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    annee_universitaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'annee_universitaire', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    session_examen_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'session_examen', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    enseignant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'enseignant', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'note',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['etudiant_id', 'matiere_id', 'session_examen_id', 'type_note'],
        name: 'unique_note_par_session_type',
      },
    ],
  }
);

module.exports = Note;
