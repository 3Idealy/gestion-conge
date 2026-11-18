'use strict';

const sequelize = require('../config/database');

// ── Import des modèles ────────────────────────────────────────────────────────
const Mention            = require('./mention');
const Parcours           = require('./parcours');
const Niveau             = require('./niveau');
const Etudiant           = require('./etudiant');
const AnneeUniversitaire = require('./annee_universitaire');
const Module             = require('./module');
const Matiere            = require('./matiere');
const Enseignant         = require('./enseignant');
const SessionExamen      = require('./session_examen');
const Note               = require('./note');
const User               = require('./user');
const NoteHistory        = require('./note_history');
const Notification       = require('./notification');
const Deliberation       = require('./deliberation');
const DecisionJury       = require('./decision_jury');
const AuditLog           = require('./audit_log');
const EnseignantMatiere  = require('./enseignant_matiere');

// ── Associations ──────────────────────────────────────────────────────────────

// Mention ↔ Parcours
Mention.hasMany(Parcours, {
  foreignKey: 'mention_id',
  as: 'parcours',
  onDelete: 'RESTRICT',
});
Parcours.belongsTo(Mention, {
  foreignKey: 'mention_id',
  as: 'mention',
});

// Parcours ↔ Module
Parcours.hasMany(Module, {
  foreignKey: 'parcours_id',
  as: 'modules',
  onDelete: 'RESTRICT',
});
Module.belongsTo(Parcours, {
  foreignKey: 'parcours_id',
  as: 'parcours',
});

// Niveau ↔ Module
Niveau.hasMany(Module, {
  foreignKey: 'niveau_id',
  as: 'modules',
  onDelete: 'RESTRICT',
});
Module.belongsTo(Niveau, {
  foreignKey: 'niveau_id',
  as: 'niveau',
});

// Module ↔ Matiere
Module.hasMany(Matiere, {
  foreignKey: 'module_id',
  as: 'matieres',
  onDelete: 'RESTRICT',
});
Matiere.belongsTo(Module, {
  foreignKey: 'module_id',
  as: 'module',
});

// Matiere ↔ Enseignant (responsable)
Matiere.belongsTo(Enseignant, {
  foreignKey: 'enseignant_id',
  as: 'enseignant',
});
Enseignant.hasMany(Matiere, {
  foreignKey: 'enseignant_id',
  as: 'matieres_responsable',
  onDelete: 'SET NULL',
});

// Parcours ↔ Etudiant
Parcours.hasMany(Etudiant, {
  foreignKey: 'parcours_id',
  as: 'etudiants',
  onDelete: 'RESTRICT',
});
Etudiant.belongsTo(Parcours, {
  foreignKey: 'parcours_id',
  as: 'parcours',
});

// Niveau ↔ Etudiant
Niveau.hasMany(Etudiant, {
  foreignKey: 'niveau_id',
  as: 'etudiants',
  onDelete: 'RESTRICT',
});
Etudiant.belongsTo(Niveau, {
  foreignKey: 'niveau_id',
  as: 'niveau',
});

// AnneeUniversitaire ↔ SessionExamen
AnneeUniversitaire.hasMany(SessionExamen, {
  foreignKey: 'annee_universitaire_id',
  as: 'sessions',
  onDelete: 'RESTRICT',
});
SessionExamen.belongsTo(AnneeUniversitaire, {
  foreignKey: 'annee_universitaire_id',
  as: 'anneeUniversitaire',
});

// Note ↔ Etudiant
Etudiant.hasMany(Note, {
  foreignKey: 'etudiant_id',
  as: 'notes',
  onDelete: 'RESTRICT',
});
Note.belongsTo(Etudiant, {
  foreignKey: 'etudiant_id',
  as: 'etudiant',
});

// Note ↔ Matiere
Matiere.hasMany(Note, {
  foreignKey: 'matiere_id',
  as: 'notes',
  onDelete: 'RESTRICT',
});
Note.belongsTo(Matiere, {
  foreignKey: 'matiere_id',
  as: 'matiere',
});

// Note ↔ AnneeUniversitaire
AnneeUniversitaire.hasMany(Note, {
  foreignKey: 'annee_universitaire_id',
  as: 'notes',
  onDelete: 'RESTRICT',
});
Note.belongsTo(AnneeUniversitaire, {
  foreignKey: 'annee_universitaire_id',
  as: 'anneeUniversitaire',
});

// Note ↔ SessionExamen
SessionExamen.hasMany(Note, {
  foreignKey: 'session_examen_id',
  as: 'notes',
  onDelete: 'RESTRICT',
});
Note.belongsTo(SessionExamen, {
  foreignKey: 'session_examen_id',
  as: 'session',
});

// Note ↔ Enseignant
Enseignant.hasMany(Note, {
  foreignKey: 'enseignant_id',
  as: 'notes',
  onDelete: 'RESTRICT',
});
Note.belongsTo(Enseignant, {
  foreignKey: 'enseignant_id',
  as: 'enseignant',
});

// ── Nouvelles associations ────────────────────────────────────────────────────

// User ↔ Etudiant
User.belongsTo(Etudiant, {
  foreignKey: 'etudiant_id',
  as: 'etudiantProfile',
});
Etudiant.hasOne(User, {
  foreignKey: 'etudiant_id',
  as: 'compte',
});

// Note ↔ NoteHistory
Note.hasMany(NoteHistory, {
  foreignKey: 'note_id',
  as: 'historique',
  onDelete: 'CASCADE',
});
NoteHistory.belongsTo(Note, {
  foreignKey: 'note_id',
  as: 'note',
});

// User ↔ NoteHistory (modifié par)
User.hasMany(NoteHistory, {
  foreignKey: 'modifie_par',
  as: 'modifications',
});
NoteHistory.belongsTo(User, {
  foreignKey: 'modifie_par',
  as: 'modificateur',
});

// User ↔ Notification
User.hasMany(Notification, {
  foreignKey: 'destinataire_id',
  as: 'notifications',
  onDelete: 'CASCADE',
});
Notification.belongsTo(User, {
  foreignKey: 'destinataire_id',
  as: 'destinataire',
});

// Deliberation ↔ AnneeUniversitaire
AnneeUniversitaire.hasMany(Deliberation, {
  foreignKey: 'annee_universitaire_id',
  as: 'deliberations',
});
Deliberation.belongsTo(AnneeUniversitaire, {
  foreignKey: 'annee_universitaire_id',
  as: 'anneeUniversitaire',
});

// Deliberation ↔ Niveau
Niveau.hasMany(Deliberation, {
  foreignKey: 'niveau_id',
  as: 'deliberations',
});
Deliberation.belongsTo(Niveau, {
  foreignKey: 'niveau_id',
  as: 'niveau',
});

// Deliberation ↔ Parcours
Parcours.hasMany(Deliberation, {
  foreignKey: 'parcours_id',
  as: 'deliberations',
});
Deliberation.belongsTo(Parcours, {
  foreignKey: 'parcours_id',
  as: 'parcours',
});

// Deliberation ↔ SessionExamen
SessionExamen.hasMany(Deliberation, {
  foreignKey: 'session_examen_id',
  as: 'deliberations',
});
Deliberation.belongsTo(SessionExamen, {
  foreignKey: 'session_examen_id',
  as: 'session',
});

// Deliberation ↔ DecisionJury
Deliberation.hasMany(DecisionJury, {
  foreignKey: 'deliberation_id',
  as: 'decisions',
  onDelete: 'CASCADE',
});
DecisionJury.belongsTo(Deliberation, {
  foreignKey: 'deliberation_id',
  as: 'deliberation',
});

// DecisionJury ↔ Etudiant
Etudiant.hasMany(DecisionJury, {
  foreignKey: 'etudiant_id',
  as: 'decisions',
});
DecisionJury.belongsTo(Etudiant, {
  foreignKey: 'etudiant_id',
  as: 'etudiant',
});

// User ↔ AuditLog
User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'auditLogs',
});
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// EnseignantMatiere (Many-to-Many via pivot)
Enseignant.belongsToMany(Matiere, {
  through: EnseignantMatiere,
  foreignKey: 'enseignant_id',
  otherKey: 'matiere_id',
  as: 'matieres_enseignees',
});
Matiere.belongsToMany(Enseignant, {
  through: EnseignantMatiere,
  foreignKey: 'matiere_id',
  otherKey: 'enseignant_id',
  as: 'enseignants_affectes',
});
EnseignantMatiere.belongsTo(AnneeUniversitaire, {
  foreignKey: 'annee_universitaire_id',
  as: 'anneeUniversitaire',
});
EnseignantMatiere.belongsTo(Enseignant, {
  foreignKey: 'enseignant_id',
  as: 'enseignant',
});
EnseignantMatiere.belongsTo(Matiere, {
  foreignKey: 'matiere_id',
  as: 'matiere',
});

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  Mention,
  Parcours,
  Niveau,
  Etudiant,
  AnneeUniversitaire,
  Module,
  Matiere,
  Enseignant,
  SessionExamen,
  Note,
  User,
  NoteHistory,
  Notification,
  Deliberation,
  DecisionJury,
  AuditLog,
  EnseignantMatiere,
};