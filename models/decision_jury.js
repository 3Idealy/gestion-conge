'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DecisionJury = sequelize.define(
  'DecisionJury',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    deliberation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'deliberation', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    etudiant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'etudiant', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    moyenne_generale: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    total_credits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    total_credits_requis: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    decision: {
      type: DataTypes.ENUM('admis', 'autoriser_a_passer', 'redoubler'),
      allowNull: false,
      defaultValue: 'redoubler',
    },
    mention: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    rang: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'decision_jury',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['deliberation_id', 'etudiant_id'],
        name: 'unique_decision_etudiant',
      },
    ],
  }
);

module.exports = DecisionJury;
