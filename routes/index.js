'use strict';

const express = require('express');
const router = express.Router();

// ── Controllers ───────────────────────────────────────────────────────────────
const authCtrl       = require('../controllers/authController');
const passwordResetCtrl = require('../controllers/passwordResetController');
const mentionCtrl    = require('../controllers/mentionController');
const parcoursCtrl   = require('../controllers/parcoursController');
const niveauCtrl     = require('../controllers/niveauController');
const etudiantCtrl   = require('../controllers/etudiantController');
const moduleCtrl     = require('../controllers/moduleController');
const noteCtrl       = require('../controllers/noteController');
const adminCtrl      = require('../controllers/adminController');
const userCtrl       = require('../controllers/userController');
const deliberationCtrl = require('../controllers/deliberationController');
const notificationCtrl = require('../controllers/notificationController');
const statsCtrl      = require('../controllers/statsController');
const exportCtrl     = require('../controllers/exportController');
const promotionCtrl  = require('../controllers/promotionController');

// ── Middleware ─────────────────────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// ── AUTH (routes publiques) ───────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login',    authCtrl.login);
router.post('/auth/forgot-password', passwordResetCtrl.forgotPassword);
router.post('/auth/reset-password',  passwordResetCtrl.resetPassword);

// ── Protection : toutes les routes ci-dessous nécessitent un token JWT ────────
router.use(authMiddleware);

// ── AUTH (protégée) ───────────────────────────────────────────────────────────
router.get('/auth/me', authCtrl.me);

// ── UTILISATEURS (admin uniquement) ───────────────────────────────────────────
router.get   ('/users',             requireRole('admin'), userCtrl.getAll);
router.get   ('/users/:id',         requireRole('admin'), userCtrl.getById);
router.post  ('/users',             requireRole('admin'), userCtrl.create);
router.put   ('/users/:id',         requireRole('admin'), userCtrl.update);
router.patch ('/users/:id/actif',   requireRole('admin'), userCtrl.toggleActif);
router.delete('/users/:id',         requireRole('admin'), userCtrl.remove);

// ── MENTIONS (admin seulement pour ajout/modif) ──────────────────────────────
router.get   ('/mentions',      mentionCtrl.getAll);
router.get   ('/mentions/:id',  mentionCtrl.getById);
router.post  ('/mentions',      requireRole('admin'), mentionCtrl.create);
router.put   ('/mentions/:id',  requireRole('admin'), mentionCtrl.update);
router.delete('/mentions/:id',  requireRole('admin'), mentionCtrl.remove);

// ── PARCOURS (admin seulement pour ajout/modif) ──────────────────────────────
router.get   ('/parcours',      parcoursCtrl.getAll);
router.get   ('/parcours/:id',  parcoursCtrl.getById);
router.post  ('/parcours',      requireRole('admin'), parcoursCtrl.create);
router.put   ('/parcours/:id',  requireRole('admin'), parcoursCtrl.update);
router.delete('/parcours/:id',  requireRole('admin'), parcoursCtrl.remove);

// ── NIVEAUX (admin seulement pour ajout/modif) ───────────────────────────────
router.get   ('/niveaux',       niveauCtrl.getAll);
router.get   ('/niveaux/:id',   niveauCtrl.getById);
router.post  ('/niveaux',       requireRole('admin'), niveauCtrl.create);
router.put   ('/niveaux/:id',   requireRole('admin'), niveauCtrl.update);
router.delete('/niveaux/:id',   requireRole('admin'), niveauCtrl.remove);

// ── ETUDIANTS ─────────────────────────────────────────────────────────────────
router.get   ('/etudiants',              etudiantCtrl.getAll);
router.get   ('/etudiants/:id',          etudiantCtrl.getById);
router.get   ('/etudiants/:id/notes',    etudiantCtrl.getNotes);
router.post  ('/etudiants',              requireRole('admin', 'secretaire'), etudiantCtrl.create);
router.put   ('/etudiants/:id',          requireRole('admin', 'secretaire'), etudiantCtrl.update);
router.patch ('/etudiants/:id/actif',    requireRole('admin', 'secretaire'), etudiantCtrl.toggleActif);
router.delete('/etudiants/:id',          requireRole('admin'), etudiantCtrl.remove);

// ── MODULES ───────────────────────────────────────────────────────────────────
router.get   ('/modules',       moduleCtrl.getAllModules);
router.get   ('/modules/:id',   moduleCtrl.getModuleById);
router.post  ('/modules',       requireRole('admin', 'secretaire'), moduleCtrl.createModule);
router.put   ('/modules/:id',   requireRole('admin', 'secretaire'), moduleCtrl.updateModule);
router.delete('/modules/:id',   requireRole('admin'), moduleCtrl.deleteModule);

// ── MATIERES ──────────────────────────────────────────────────────────────────
router.get   ('/matieres',      moduleCtrl.getAllMatieres);
router.get   ('/matieres/:id',  moduleCtrl.getMatiereById);
router.post  ('/matieres',      requireRole('admin', 'secretaire'), moduleCtrl.createMatiere);
router.put   ('/matieres/:id',  requireRole('admin', 'secretaire'), moduleCtrl.updateMatiere);
router.delete('/matieres/:id',  requireRole('admin'), moduleCtrl.deleteMatiere);

// ── NOTES ─────────────────────────────────────────────────────────────────────
router.get   ('/notes',                       noteCtrl.getAll);
router.get   ('/notes/releve/:etudiant_id',   noteCtrl.releve);
router.get   ('/notes/:id',                   noteCtrl.getById);
router.get   ('/notes/:id/historique',         noteCtrl.getHistorique);
router.post  ('/notes',                       requireRole('admin', 'enseignant', 'secretaire'), noteCtrl.create);
router.post  ('/notes/import',                requireRole('admin', 'enseignant', 'secretaire'), noteCtrl.upload, noteCtrl.importBulk);
router.patch ('/notes/validate',              requireRole('admin'), noteCtrl.validateNotes);
router.put   ('/notes/:id',                   requireRole('admin', 'enseignant', 'secretaire'), noteCtrl.update);
router.delete('/notes/:id',                   requireRole('admin'), noteCtrl.remove);

// ── ANNEES UNIVERSITAIRES (admin seulement pour ajout/modif) ──────────────────
router.get   ('/annees',        adminCtrl.getAllAnnees);
router.get   ('/annees/vides',  promotionCtrl.getAnneesVides);
router.get   ('/annees/:id',    adminCtrl.getAnneeById);
router.post  ('/annees',        requireRole('admin'), adminCtrl.createAnnee);
router.put   ('/annees/:id',    requireRole('admin'), adminCtrl.updateAnnee);
router.delete('/annees/:id',    requireRole('admin'), adminCtrl.deleteAnnee);

// ── PROMOTION / CLOTURE ───────────────────────────────────────────────────────
router.post  ('/annees/cloturer',          requireRole('admin'), promotionCtrl.cloturerAnnee);
router.post  ('/annees/set-nouvelle-annee', requireRole('admin'), promotionCtrl.setNouvelleAnnee);

// ── SESSIONS EXAMEN (admin seulement pour ajout/modif) ────────────────────────
router.get   ('/sessions',      adminCtrl.getAllSessions);
router.get   ('/sessions/:id',  adminCtrl.getSessionById);
router.post  ('/sessions',      requireRole('admin'), adminCtrl.createSession);
router.put   ('/sessions/:id',  requireRole('admin'), adminCtrl.updateSession);
router.delete('/sessions/:id',  requireRole('admin'), adminCtrl.deleteSession);

// ── ENSEIGNANTS ───────────────────────────────────────────────────────────────
router.get   ('/enseignants',       adminCtrl.getAllEnseignants);
router.get   ('/enseignants/:id',   adminCtrl.getEnseignantById);
router.post  ('/enseignants',       requireRole('admin', 'secretaire'), adminCtrl.createEnseignant);
router.put   ('/enseignants/:id',   requireRole('admin', 'secretaire'), adminCtrl.updateEnseignant);
router.delete('/enseignants/:id',   requireRole('admin'), adminCtrl.deleteEnseignant);

// ── DELIBERATIONS ─────────────────────────────────────────────────────────────
router.get   ('/deliberations',                          deliberationCtrl.getAll);
router.get   ('/deliberations/:id',                      deliberationCtrl.getById);
router.post  ('/deliberations',                          requireRole('admin'), deliberationCtrl.create);
router.put   ('/deliberations/:id',                      requireRole('admin'), deliberationCtrl.update);
router.patch ('/deliberations/:id/valider',              requireRole('admin'), deliberationCtrl.valider);
router.patch ('/deliberations/:id/decision/:decisionId', requireRole('admin'), deliberationCtrl.updateDecision);
router.post  ('/deliberations/:id/recalculer',           requireRole('admin'), deliberationCtrl.recalculer);
router.delete('/deliberations/:id',                      requireRole('admin'), deliberationCtrl.remove);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get   ('/notifications',              notificationCtrl.getAll);
router.get   ('/notifications/unread-count', notificationCtrl.unreadCount);
router.patch ('/notifications/read-all',     notificationCtrl.markAllAsRead);
router.patch ('/notifications/:id/read',     notificationCtrl.markAsRead);
router.delete('/notifications/:id',          notificationCtrl.remove);

// ── STATISTIQUES ──────────────────────────────────────────────────────────────
router.get('/stats/dashboard',                  statsCtrl.dashboard);
router.get('/stats/mentions-par-niveau-parcours', statsCtrl.mentionsParNiveauParcours);
router.get('/stats/analyse-echecs',             statsCtrl.analyseEchecs);
router.get('/stats/taux-reussite',              statsCtrl.tauxReussite);
router.get('/stats/classement',                 statsCtrl.classement);

// ── EXPORT PDF ────────────────────────────────────────────────────────────────
router.get('/export/bulletin/:etudiant_id',      exportCtrl.bulletinPDF);
router.get('/export/pv-deliberation/:id',        exportCtrl.pvDeliberationPDF);
router.get('/export/recap-notes-niveau/:niveau_id', exportCtrl.recapitulatifNotesNiveauPDF);
router.get('/export/rapport-admission/:niveau_id', exportCtrl.rapportAdmissionPDF);
router.get('/export/rapport-absences/:niveau_id', exportCtrl.rapportAbsencesPDF);
router.get('/export/rapport-matiere/:matiere_id', exportCtrl.rapportMatierePDF);
router.get('/export/certificat-scolarite/:etudiant_id', exportCtrl.certificatScolaritePDF);
router.get('/export/releve-notes/:etudiant_id', exportCtrl.releveNotesPDF);
router.get('/export/liste-etudiants/:niveau_id', exportCtrl.listeEtudiantsPDF);
router.get('/export/rapport-statistique/niveau/:niveau_id', exportCtrl.rapportStatistiqueNiveauPDF);
router.get('/export/rapport-statistique/global', exportCtrl.rapportStatistiqueGlobalPDF);

module.exports = router;
