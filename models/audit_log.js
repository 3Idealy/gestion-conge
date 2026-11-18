'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Ex: CREATE, UPDATE, DELETE, LOGIN, VALIDATE, DELIBERATE',
    },
    entite: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Ex: Note, Etudiant, Deliberation',
    },
    entite_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Détails supplémentaires au format JSON',
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
  },
  {
    tableName: 'audit_log',
    timestamps: true,
    underscored: true,
    updatedAt: false,
  }
);

module.exports = AuditLog;
