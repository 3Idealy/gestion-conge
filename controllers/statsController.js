'use strict';

const { Note, Etudiant, Matiere, Module, Niveau, Parcours, Mention, AnneeUniversitaire, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { parseQueryIds } = require('../utils/validators');

// GET /stats/mentions-par-niveau-parcours
exports.mentionsParNiveauParcours = async (req, res) => {
  try {
    const { annee_universitaire_id, niveau_ids, parcours_ids } = req.query;
    const whereNote = {};
    if (annee_universitaire_id) whereNote.annee_universitaire_id = annee_universitaire_id;

    const whereEtd = {};
    if (niveau_ids && niveau_ids.length > 0) whereEtd.niveau_id = { [Op.in]: niveau_ids };
    if (parcours_ids && parcours_ids.length > 0) whereEtd.parcours_id = { [Op.in]: parcours_ids };

    const notes = await Note.findAll({
      where: whereNote,
      attributes: ['valeur', 'est_absent'],
      include: [
        {
          association: 'etudiant',
          attributes: ['id'],
          where: whereEtd,
          include: [
            { association: 'niveau', attributes: ['id', 'libelle'] },
            { association: 'parcours', attributes: ['id', 'libelle'] },
          ],
        },
      ],
    });

    // Grouper par niveau + parcours
    const grouped = {};
    notes.forEach(n => {
      const niv = n.etudiant?.niveau?.libelle || 'N/A';
      const parc = n.etudiant?.parcours?.libelle || 'N/A';
      const key = `${niv}|||${parc}`;

      if (!grouped[key]) {
        grouped[key] = { niveau: niv, parcours: parc, 'Très Bien': 0, 'Bien': 0, 'Assez Bien': 0, 'Passable': 0, 'Insuffisant': 0 };
      }

      if (n.est_absent) {
        grouped[key]['Insuffisant']++;
        return;
      }

      const v = parseFloat(n.valeur);
      if (v >= 16) grouped[key]['Très Bien']++;
      else if (v >= 14) grouped[key]['Bien']++;
      else if (v >= 12) grouped[key]['Assez Bien']++;
      else if (v >= 10) grouped[key]['Passable']++;
      else grouped[key]['Insuffisant']++;
    });

    return res.status(200).json(Object.values(grouped));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /stats/analyse-echecs
exports.analyseEchecs = async (req, res) => {
  try {
    const { annee_universitaire_id, niveau_ids, parcours_ids } = req.query;
    const whereNote = {};
    if (annee_universitaire_id) whereNote.annee_universitaire_id = annee_universitaire_id;

    const whereEtd = {};
    if (niveau_ids && niveau_ids.length > 0) whereEtd.niveau_id = { [Op.in]: niveau_ids };
    if (parcours_ids && parcours_ids.length > 0) whereEtd.parcours_id = { [Op.in]: parcours_ids };

    const notes = await Note.findAll({
      where: whereNote,
      include: [
        { association: 'matiere', attributes: ['id', 'code', 'libelle'] },
        {
          association: 'etudiant',
          attributes: ['id', 'nom', 'prenom', 'numero_etudiant'],
          include: [
            { association: 'niveau', attributes: ['id', 'libelle'] },
            { association: 'parcours', attributes: ['id', 'libelle'] },
          ],
        },
      ],
    });

    // 1. Matières avec le plus fort taux d'échec
    const matiereStats = {};
    notes.forEach(n => {
      const matId = n.matiere_id;
      const matLib = n.matiere ? `${n.matiere.code} - ${n.matiere.libelle}` : 'N/A';
      if (!matiereStats[matId]) {
        matiereStats[matId] = { matiere: matLib, total: 0, echecs: 0 };
      }
      matiereStats[matId].total++;
      const v = parseFloat(n.valeur);
      if (n.est_absent || isNaN(v) || v < 10) {
        matiereStats[matId].echecs++;
      }
    });

    const matiereEchecs = Object.values(matiereStats)
      .map(m => ({ ...m, taux_echec: m.total > 0 ? Math.round((m.echecs / m.total) * 100) : 0 }))
      .sort((a, b) => b.taux_echec - a.taux_echec)
      .slice(0, 10);

    // 2. Étudiants en situation de rattrapage (au moins une note < 10)
    const etudiantNotes = {};
    notes.forEach(n => {
      const etdId = n.etudiant_id;
      if (!etudiantNotes[etdId]) {
        etudiantNotes[etdId] = {
          etudiant: n.etudiant,
          notes_total: 0,
          notes_echec: 0,
          notes_reussite: 0,
          somme: 0,
        };
      }
      etudiantNotes[etdId].notes_total++;
      const v = parseFloat(n.valeur);
      if (!n.est_absent && !isNaN(v)) {
        etudiantNotes[etdId].somme += v;
        if (v >= 10) etudiantNotes[etdId].notes_reussite++;
        else etudiantNotes[etdId].notes_echec++;
      } else {
        etudiantNotes[etdId].notes_echec++;
      }
    });

    // Étudiants en rattrapage (ont au moins une note < 10)
    const etudiantsRattrapage = Object.values(etudiantNotes)
      .filter(e => e.notes_echec > 0)
      .map(e => ({
        nom: e.etudiant?.nom,
        prenom: e.etudiant?.prenom,
        numero_etudiant: e.etudiant?.numero_etudiant,
        niveau: e.etudiant?.niveau?.libelle || 'N/A',
        parcours: e.etudiant?.parcours?.libelle || 'N/A',
        nb_echecs: e.notes_echec,
        moyenne: e.notes_total > 0 ? (e.somme / e.notes_total).toFixed(2) : '0.00',
      }));

    // 3. Étudiants à risque de redoublement (moyenne < 10)
    const etudiantsRedoublement = Object.values(etudiantNotes)
      .filter(e => {
        const moy = e.notes_total > 0 ? e.somme / e.notes_total : 0;
        return moy < 10 && e.notes_total > 0;
      })
      .map(e => ({
        nom: e.etudiant?.nom,
        prenom: e.etudiant?.prenom,
        numero_etudiant: e.etudiant?.numero_etudiant,
        niveau: e.etudiant?.niveau?.libelle || 'N/A',
        parcours: e.etudiant?.parcours?.libelle || 'N/A',
        nb_echecs: e.notes_echec,
        moyenne: e.notes_total > 0 ? (e.somme / e.notes_total).toFixed(2) : '0.00',
      }));

    // 4. Grouper par niveau et parcours
    const parNiveauParcours = {};
    Object.values(etudiantNotes).forEach(e => {
      const niv = e.etudiant?.niveau?.libelle || 'N/A';
      const parc = e.etudiant?.parcours?.libelle || 'N/A';
      const key = `${niv} - ${parc}`;
      if (!parNiveauParcours[key]) {
        parNiveauParcours[key] = { niveau: niv, parcours: parc, total: 0, en_rattrapage: 0, a_risque: 0 };
      }
      parNiveauParcours[key].total++;
      if (e.notes_echec > 0) parNiveauParcours[key].en_rattrapage++;
      const moy = e.notes_total > 0 ? e.somme / e.notes_total : 0;
      if (moy < 10 && e.notes_total > 0) parNiveauParcours[key].a_risque++;
    });

    return res.status(200).json({
      matieres_echecs: matiereEchecs,
      etudiants_rattrapage: etudiantsRattrapage.sort((a, b) => a.moyenne - b.moyenne).slice(0, 20),
      etudiants_redoublement: etudiantsRedoublement.sort((a, b) => a.moyenne - b.moyenne).slice(0, 20),
      synthese_par_niveau_parcours: Object.values(parNiveauParcours),
      totaux: {
        total_etudiants: Object.keys(etudiantNotes).length,
        en_rattrapage: etudiantsRattrapage.length,
        a_risque_redoublement: etudiantsRedoublement.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /stats/taux-reussite
exports.tauxReussite = async (req, res) => {
  try {
    const { annee_universitaire_id, niveau_ids, parcours_ids } = req.query;
    const whereNote = {};
    if (annee_universitaire_id) whereNote.annee_universitaire_id = annee_universitaire_id;

    const nivIds = parseQueryIds(niveau_ids);
    const parcIds = parseQueryIds(parcours_ids);

    const notes = await Note.findAll({
      where: whereNote,
      include: [
        {
          association: 'etudiant',
          attributes: ['id', 'niveau_id', 'parcours_id'],
          where: {
            ...(nivIds.length ? { niveau_id: { [Op.in]: nivIds } } : {}),
            ...(parcIds.length ? { parcours_id: { [Op.in]: parcIds } } : {}),
          },
          required: nivIds.length > 0 || parcIds.length > 0,
        },
        { association: 'matiere', attributes: ['id', 'code', 'libelle'], include: [{ association: 'module', include: [{ association: 'parcours', include: [{ association: 'mention' }] }] }] },
      ],
    });

    // Par matière
    const parMatiere = {};
    let totalRattrapage = 0;
    notes.forEach(n => {
      const k = n.matiere_id;
      if (!parMatiere[k]) parMatiere[k] = { matiere: `${n.matiere?.code} - ${n.matiere?.libelle}`, total: 0, reussi: 0, rattrapage: 0, manquantes: 0 };
      parMatiere[k].total++;
      const v = parseFloat(n.valeur);
      if (n.est_absent || isNaN(v)) return;
      if (v >= 10) parMatiere[k].reussi++;
      else {
        parMatiere[k].rattrapage++;
        totalRattrapage++;
      }
    });

    // Par filière (mention)
    const parFiliere = {};
    notes.forEach(n => {
      const mention = n.matiere?.module?.parcours?.mention?.libelle || 'N/A';
      if (!parFiliere[mention]) parFiliere[mention] = { filiere: mention, total: 0, reussi: 0, rattrapage: 0 };
      parFiliere[mention].total++;
      const v = parseFloat(n.valeur);
      if (!n.est_absent && !isNaN(v)) {
        if (v >= 10) parFiliere[mention].reussi++;
        else parFiliere[mention].rattrapage++;
      }
    });

    // Notes manquantes : étudiants actifs × matières attendues − notes saisies
    let notesManquantes = 0;
    const whereEtd = { actif: true };
    if (nivIds.length) whereEtd.niveau_id = { [Op.in]: nivIds };
    if (parcIds.length) whereEtd.parcours_id = { [Op.in]: parcIds };

    const etudiants = await Etudiant.findAll({ where: whereEtd, attributes: ['id', 'niveau_id', 'parcours_id'] });
    for (const etd of etudiants) {
      const matieresCount = await Matiere.count({
        include: [{
          association: 'module',
          where: { niveau_id: etd.niveau_id, parcours_id: etd.parcours_id },
          required: true,
        }],
      });
      const notesCount = await Note.count({
        where: {
          etudiant_id: etd.id,
          ...(annee_universitaire_id ? { annee_universitaire_id } : {}),
        },
      });
      notesManquantes += Math.max(0, matieresCount - notesCount);
    }

    return res.status(200).json({
      par_matiere: Object.values(parMatiere).map(m => ({
        ...m,
        taux: m.total > 0 ? Math.round((m.reussi / m.total) * 100) : 0,
      })).sort((a, b) => b.taux - a.taux),
      par_filiere: Object.values(parFiliere).map(f => ({
        ...f,
        taux: f.total > 0 ? Math.round((f.reussi / f.total) * 100) : 0,
      })).sort((a, b) => b.taux - a.taux),
      notes_manquantes: notesManquantes,
      total_rattrapage: totalRattrapage,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /stats/classement
exports.classement = async (req, res) => {
  try {
    const { niveau_id, parcours_id, niveau_ids, parcours_ids, annee_universitaire_id } = req.query;

    const nivIds = parseQueryIds(niveau_ids || niveau_id);
    const parcIds = parseQueryIds(parcours_ids || parcours_id);

    const whereEtd = { actif: true };
    if (nivIds.length === 1) whereEtd.niveau_id = nivIds[0];
    else if (nivIds.length > 1) whereEtd.niveau_id = { [Op.in]: nivIds };
    if (parcIds.length === 1) whereEtd.parcours_id = parcIds[0];
    else if (parcIds.length > 1) whereEtd.parcours_id = { [Op.in]: parcIds };

    const etudiants = await Etudiant.findAll({
      where: whereEtd,
      include: [
        { association: 'niveau', attributes: ['libelle'] },
        { association: 'parcours', attributes: ['libelle'] },
      ],
    });

    const whereNote = {};
    if (annee_universitaire_id) whereNote.annee_universitaire_id = annee_universitaire_id;

    const result = [];
    for (const etd of etudiants) {
      const notes = await Note.findAll({
        where: { etudiant_id: etd.id, ...whereNote },
        include: [{ association: 'matiere' }],
      });

      let somme = 0, count = 0;
      notes.forEach(n => {
        const v = parseFloat(n.valeur);
        if (!n.est_absent && !isNaN(v)) { somme += v; count++; }
      });

      if (count === 0) continue;

      const moyenne = count > 0 ? somme / count : 0;

      result.push({
        id: etd.id,
        nom: etd.nom,
        prenom: etd.prenom,
        numero_etudiant: etd.numero_etudiant,
        niveau: etd.niveau?.libelle || 'N/A',
        parcours: etd.parcours?.libelle || 'N/A',
        moyenne: moyenne.toFixed(2),
        nb_notes: count,
      });
    }

    result.sort((a, b) => parseFloat(b.moyenne) - parseFloat(a.moyenne));
    result.forEach((r, i) => { r.rang = i + 1; });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /stats/dashboard — Données complètes du tableau de bord
exports.dashboard = async (req, res) => {
  try {
    const { annee_universitaire_id } = req.query;

    const [etudiants, notes] = await Promise.all([
      Etudiant.findAll({
        where: { actif: true },
        include: [
          { association: 'niveau', attributes: ['id', 'libelle'] },
          { association: 'parcours', attributes: ['id', 'libelle'] },
        ],
      }),
      Note.findAll({
        where: annee_universitaire_id ? { annee_universitaire_id } : {},
        include: [
          {
            association: 'etudiant',
            attributes: ['id'],
            include: [
              { association: 'niveau', attributes: ['id', 'libelle'] },
              { association: 'parcours', attributes: ['id', 'libelle'] },
            ],
          },
        ],
      }),
    ]);

    // Mentions par niveau × parcours
    const mentionsByNP = {};
    notes.forEach(n => {
      const niv = n.etudiant?.niveau?.libelle || 'N/A';
      const parc = n.etudiant?.parcours?.libelle || 'N/A';
      const key = `${niv} - ${parc}`;
      if (!mentionsByNP[key]) {
        mentionsByNP[key] = { label: key, niveau: niv, parcours: parc, 'Très Bien': 0, 'Bien': 0, 'Assez Bien': 0, 'Passable': 0, 'Insuffisant': 0 };
      }
      if (n.est_absent) { mentionsByNP[key]['Insuffisant']++; return; }
      const v = parseFloat(n.valeur);
      if (v >= 16) mentionsByNP[key]['Très Bien']++;
      else if (v >= 14) mentionsByNP[key]['Bien']++;
      else if (v >= 12) mentionsByNP[key]['Assez Bien']++;
      else if (v >= 10) mentionsByNP[key]['Passable']++;
      else mentionsByNP[key]['Insuffisant']++;
    });

    return res.status(200).json({
      mentions_par_niveau_parcours: Object.values(mentionsByNP),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
