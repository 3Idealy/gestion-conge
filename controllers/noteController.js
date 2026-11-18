'use strict';

const { Note, NoteHistory, Etudiant, Matiere, AnneeUniversitaire, SessionExamen, Enseignant, Module, User, Notification } = require('../models');
const { Op } = require('sequelize');
const { createNotification, notifyUsers } = require('./notificationController');
const { validateDecimal } = require('../utils/validators');
const multer = require('multer');

async function resolveEnseignantId(matiere_id, enseignant_id) {
  if (enseignant_id) return enseignant_id;
  const matiere = await Matiere.findByPk(matiere_id);
  if (matiere?.enseignant_id) return matiere.enseignant_id;
  return null;
}

function validateNotePayload({ valeur, est_absent, type_note }) {
  if (!est_absent) {
    const err = validateDecimal(valeur, 'La note', { min: 0, max: 20 });
    if (err) return [err];
  }
  if (type_note && !['CC', 'Examen', 'Rattrapage'].includes(type_note)) {
    return ['Type de note invalide.'];
  }
  return [];
}
const XLSX = require('xlsx');
const path = require('path');

// ── Multer config pour import de fichiers ────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
exports.upload = upload.single('file');

// GET /notes
exports.getAll = async (req, res) => {
  try {
    const { etudiant_id, matiere_id, session_examen_id, annee_universitaire_id, statut, type_note } = req.query;
    const where = {};
    if (etudiant_id) where.etudiant_id = etudiant_id;
    if (matiere_id) where.matiere_id = matiere_id;
    if (session_examen_id) where.session_examen_id = session_examen_id;
    if (annee_universitaire_id) where.annee_universitaire_id = annee_universitaire_id;
    if (statut) where.statut = statut;
    if (type_note) where.type_note = type_note;

    const notes = await Note.findAll({
      where,
      include: [
        { association: 'etudiant', attributes: ['id', 'numero_etudiant', 'nom', 'prenom'] },
        { association: 'matiere', include: [{ association: 'module' }] },
        { association: 'anneeUniversitaire', attributes: ['id', 'libelle'] },
        { association: 'session', attributes: ['id', 'libelle', 'type_session'] },
        { association: 'enseignant', attributes: ['id', 'nom', 'prenom'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(notes);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /notes/:id
exports.getById = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id, {
      include: [
        { association: 'etudiant' },
        { association: 'matiere', include: [{ association: 'module' }] },
        { association: 'anneeUniversitaire' },
        { association: 'session' },
        { association: 'enseignant' },
        { association: 'historique', include: [{ association: 'modificateur', attributes: ['nom', 'prenom'] }], order: [['created_at', 'DESC']] },
      ],
    });
    if (!note) return res.status(404).json({ message: 'Note introuvable.' });
    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /notes/:id/historique
exports.getHistorique = async (req, res) => {
  try {
    const historique = await NoteHistory.findAll({
      where: { note_id: req.params.id },
      include: [{ association: 'modificateur', attributes: ['nom', 'prenom', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(historique);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /notes
exports.create = async (req, res) => {
  try {
    const { valeur, observation, etudiant_id, matiere_id, annee_universitaire_id, session_examen_id, enseignant_id, type_note, est_absent, type_absence } = req.body;

    const valErrors = validateNotePayload({ valeur, est_absent, type_note: type_note || 'Examen' });
    if (valErrors.length) return res.status(400).json({ message: valErrors });

    const resolvedEnseignant = await resolveEnseignantId(matiere_id, enseignant_id);

    const note = await Note.create({
      valeur: est_absent ? null : valeur,
      observation, etudiant_id, matiere_id,
      annee_universitaire_id, session_examen_id,
      enseignant_id: resolvedEnseignant,
      type_note: type_note || 'Examen',
      statut: 'saisie',
      est_absent: est_absent || false,
      type_absence: est_absent ? (type_absence || 'ABI') : null,
    });

    // Historique initial
    await NoteHistory.create({
      note_id: note.id,
      ancienne_valeur: null,
      nouvelle_valeur: est_absent ? 0 : valeur,
      ancien_statut: null,
      nouveau_statut: 'saisie',
      modifie_par: req.userId,
      motif: 'Saisie initiale',
    });

    return res.status(201).json(note);
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map(e => e.message) });
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Une note existe déjà pour cet étudiant dans cette matière et cette session.' });
    }
    return res.status(500).json({ message: err.message });
  }
};

// PUT /notes/:id
exports.update = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note introuvable.' });

    const { valeur, observation, etudiant_id, matiere_id, annee_universitaire_id, session_examen_id, enseignant_id, type_note, est_absent, type_absence } = req.body;

    const valErrors = validateNotePayload({ valeur, est_absent, type_note: type_note || note.type_note });
    if (valErrors.length) return res.status(400).json({ message: valErrors });

    const resolvedEnseignant = await resolveEnseignantId(matiere_id, enseignant_id ?? note.enseignant_id);

    const ancienneValeur = note.valeur;
    const ancienStatut = note.statut;

    await note.update({
      valeur: est_absent ? null : valeur,
      observation, etudiant_id, matiere_id, annee_universitaire_id, session_examen_id,
      enseignant_id: resolvedEnseignant,
      type_note: type_note || note.type_note,
      est_absent: est_absent || false,
      type_absence: est_absent ? (type_absence || 'ABI') : null,
    });

    // Historique de modification
    await NoteHistory.create({
      note_id: note.id,
      ancienne_valeur: ancienneValeur,
      nouvelle_valeur: est_absent ? 0 : valeur,
      ancien_statut: ancienStatut,
      nouveau_statut: note.statut,
      modifie_par: req.userId,
      motif: observation || 'Modification',
    });

    return res.status(200).json(note);
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map(e => e.message) });
    }
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /notes/validate — Valider un lot de notes
exports.validateNotes = async (req, res) => {
  try {
    const { note_ids } = req.body;
    if (!note_ids || !Array.isArray(note_ids) || note_ids.length === 0) {
      return res.status(400).json({ message: 'Liste de notes requise.' });
    }

    await Note.update(
      { statut: 'validee' },
      { where: { id: { [Op.in]: note_ids }, statut: 'saisie' } }
    );

    // Historique pour chaque note
    for (const id of note_ids) {
      await NoteHistory.create({
        note_id: id,
        ancienne_valeur: null,
        nouvelle_valeur: null,
        ancien_statut: 'saisie',
        nouveau_statut: 'validee',
        modifie_par: req.userId,
        motif: 'Validation par responsable pédagogique',
      });
    }

    // Notifier les enseignants
    await notifyUsers({
      titre: '✅ Notes validées',
      message: `${note_ids.length} note(s) ont été validées par le responsable pédagogique.`,
      type: 'note_publiee',
      role: 'enseignant',
      lien: '/notes',
    });

    return res.status(200).json({ message: `${note_ids.length} note(s) validée(s).` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /notes/import — Import en masse CSV/Excel
exports.importBulk = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier requis.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) return res.status(400).json({ message: 'Le fichier est vide.' });

    const errors = [];
    const created = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 car ligne 1 = en-tête

      try {
        const etdField = row.numero_etudiant || row['Numéro Étudiant'] || row['N° Étudiant'];
        const matField = row.code_matiere || row['Code Matière'] || row['Matière'];
        const noteVal = row.note || row.valeur || row['Note'];
        const typeNote = row.type_note || row['Type'] || 'Examen';
        const sessionId = row.session_examen_id || row['Session ID'];
        const anneeId = row.annee_universitaire_id || row['Année ID'];
        const enseignantId = row.enseignant_id || row['Enseignant ID'];

        if (!etdField || !matField || noteVal === undefined) {
          errors.push(`Ligne ${rowNum}: données manquantes (numero_etudiant, code_matiere, note).`);
          continue;
        }

        const etudiant = await Etudiant.findOne({ where: { numero_etudiant: String(etdField) } });
        if (!etudiant) { errors.push(`Ligne ${rowNum}: étudiant ${etdField} introuvable.`); continue; }

        const matiere = await Matiere.findOne({ where: { code: String(matField) } });
        if (!matiere) { errors.push(`Ligne ${rowNum}: matière ${matField} introuvable.`); continue; }

        const isAbsent = String(noteVal).toUpperCase() === 'ABJ' || String(noteVal).toUpperCase() === 'ABI';
        const absenceType = isAbsent ? String(noteVal).toUpperCase() : null;

        const note = await Note.create({
          valeur: isAbsent ? null : parseFloat(noteVal),
          etudiant_id: etudiant.id,
          matiere_id: matiere.id,
          session_examen_id: parseInt(sessionId),
          annee_universitaire_id: parseInt(anneeId),
          enseignant_id: parseInt(enseignantId),
          type_note: typeNote,
          statut: 'saisie',
          est_absent: isAbsent,
          type_absence: absenceType,
        });

        await NoteHistory.create({
          note_id: note.id,
          ancienne_valeur: null,
          nouvelle_valeur: isAbsent ? 0 : parseFloat(noteVal),
          modifie_par: req.userId,
          motif: 'Import en masse',
        });

        created.push(note.id);
      } catch (lineErr) {
        errors.push(`Ligne ${rowNum}: ${lineErr.message}`);
      }
    }

    return res.status(200).json({
      message: `Import terminé. ${created.length} note(s) créée(s), ${errors.length} erreur(s).`,
      created_count: created.length,
      error_count: errors.length,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /notes/:id
exports.remove = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note introuvable.' });
    await note.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /notes/releve/:etudiant_id — relevé de notes complet structuré par module
exports.releve = async (req, res) => {
  try {
    const { etudiant_id } = req.params;
    const { annee_universitaire_id } = req.query;

    const etudiant = await Etudiant.findByPk(etudiant_id, {
      include: [
        { association: 'parcours', include: [{ association: 'mention' }] },
        { association: 'niveau' },
      ],
    });
    if (!etudiant) return res.status(404).json({ message: 'Étudiant introuvable.' });

    // 1. Chercher tous les modules et matières du niveau/parcours de l'étudiant
    const allModules = await Module.findAll({
      where: { niveau_id: etudiant.niveau_id, parcours_id: etudiant.parcours_id },
      include: [{ association: 'matieres' }],
      order: [['semestre', 'ASC'], ['code', 'ASC']]
    });

    const whereNote = { etudiant_id };
    if (annee_universitaire_id) whereNote.annee_universitaire_id = annee_universitaire_id;

    const notes = await Note.findAll({
      where: whereNote,
      include: [
        { association: 'matiere' },
        { association: 'anneeUniversitaire' },
        { association: 'session' },
      ],
    });

    const noteMap = {}; // matiere_id -> note object
    notes.forEach(n => {
       // On garde la meilleure note ou la plus récente ? 
       // On privilégie Examen sur Rattrapage si Examen est meilleur ? 
       // Pour l'instant on prend la dernière trouvée ou on gère par type.
       if (!noteMap[n.matiere_id] || n.type_note === 'Rattrapage' || parseFloat(n.valeur) > parseFloat(noteMap[n.matiere_id].valeur)) {
         noteMap[n.matiere_id] = n;
       }
    });

    // 2. Construire la structure basée sur TOUS les modules/matières
    const modules = allModules.map(mod => {
      const matieresStructure = mod.matieres.map(mat => {
        const n = noteMap[mat.id];
        return {
          id: n ? n.id : null,
          matiere: mat.libelle,
          code: mat.code,
          matiere_id: mat.id,
          session_examen_id: n ? n.session_examen_id : null,
          annee_universitaire_id: n ? n.annee_universitaire_id : null,
          enseignant_id: n ? n.enseignant_id : null,
          coefficient: parseFloat(mat.coefficient || 1),
          note: n ? (n.est_absent ? '0.00' : parseFloat(n.valeur).toFixed(2)) : '0.00',
          absent: n ? n.est_absent : false,
          type_absence: n ? n.type_absence : null,
          type_note: n ? n.type_note : 'Examen',
          statut: n ? n.statut : 'non_saisie',
        };
      });

      let totalP = 0, totalC = 0;
      matieresStructure.forEach(m => {
        totalP += parseFloat(m.note) * m.coefficient;
        totalC += m.coefficient;
      });

      return {
        id: mod.id,
        code: mod.code,
        libelle: mod.libelle,
        semestre: mod.semestre,
        credits: mod.credits,
        moyenne_module: totalC > 0 ? (totalP / totalC).toFixed(2) : '0.00',
        matieres: matieresStructure
      };
    });

    let totalCreditsValides = 0, sommeCredits = 0, sommePoints = 0;
    modules.forEach(mod => {
      const moy = parseFloat(mod.moyenne_module);
      const cred = parseInt(mod.credits) || 0;
      sommePoints += moy * cred;
      sommeCredits += cred;
      if (moy >= 10) totalCreditsValides += cred;
    });

    const moyenneGenerale = sommeCredits > 0 ? (sommePoints / sommeCredits).toFixed(2) : '0.00';
    const moy = parseFloat(moyenneGenerale);
    let mentionGenerale = 'Insuffisant';
    if (moy >= 16) mentionGenerale = 'Très Bien';
    else if (moy >= 14) mentionGenerale = 'Bien';
    else if (moy >= 12) mentionGenerale = 'Assez Bien';
    else if (moy >= 10) mentionGenerale = 'Passable';

    return res.status(200).json({
      etudiant: {
        id: etudiant.id,
        nom: etudiant.nom, prenom: etudiant.prenom,
        numero_etudiant: etudiant.numero_etudiant,
        niveau: etudiant.niveau?.libelle || 'N/A',
        parcours: etudiant.parcours?.libelle || 'N/A',
        mention: etudiant.parcours?.mention?.libelle || 'N/A',
      },
      modules,
      moyenne_generale: moyenneGenerale,
      mention_generale: mentionGenerale,
      decision: moy >= 10 ? 'Admis' : 'Ajourné',
      total_credits_valides: totalCreditsValides,
      total_credits: sommeCredits,
      date_generation: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
