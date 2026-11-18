'use strict';

const {
  Deliberation, DecisionJury, Etudiant, Note, Matiere, Module,
  AnneeUniversitaire, Niveau, Parcours, SessionExamen, Notification, User,
} = require('../models');
const { notifyUsers, createNotification } = require('./notificationController');

// GET /deliberations
exports.getAll = async (req, res) => {
  try {
    const { annee_universitaire_id, niveau_id, parcours_id, statut } = req.query;
    const where = {};
    if (annee_universitaire_id) where.annee_universitaire_id = annee_universitaire_id;
    if (niveau_id) where.niveau_id = niveau_id;
    if (parcours_id) where.parcours_id = parcours_id;
    if (statut) where.statut = statut;

    const deliberations = await Deliberation.findAll({
      where,
      include: [
        { association: 'anneeUniversitaire', attributes: ['id', 'libelle'] },
        { association: 'niveau', attributes: ['id', 'libelle'] },
        { association: 'parcours', attributes: ['id', 'libelle'] },
        { association: 'session', attributes: ['id', 'libelle', 'type_session'] },
        { association: 'decisions' },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(deliberations);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /deliberations/:id
exports.getById = async (req, res) => {
  try {
    const delib = await Deliberation.findByPk(req.params.id, {
      include: [
        { association: 'anneeUniversitaire' },
        { association: 'niveau' },
        { association: 'parcours' },
        { association: 'session' },
        {
          association: 'decisions',
          include: [{ association: 'etudiant', include: [{ association: 'niveau' }, { association: 'parcours' }] }],
        },
      ],
    });
    if (!delib) return res.status(404).json({ message: 'Délibération introuvable.' });
    return res.status(200).json(delib);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /deliberations — Créer et calculer automatiquement
exports.create = async (req, res) => {
  try {
    const { annee_universitaire_id, niveau_id, parcours_id, session_examen_id, date_deliberation, president_jury, observations } = req.body;

    const delib = await Deliberation.create({
      annee_universitaire_id, niveau_id, parcours_id,
      session_examen_id: session_examen_id || null,
      date_deliberation: date_deliberation || new Date(),
      president_jury, observations,
      statut: 'en_cours',
    });

    // Calculer automatiquement les décisions
    await calculateDecisions(delib);

    const full = await Deliberation.findByPk(delib.id, {
      include: [
        { association: 'anneeUniversitaire' },
        { association: 'niveau' },
        { association: 'parcours' },
        { association: 'session' },
        {
          association: 'decisions',
          include: [{ association: 'etudiant' }],
        },
      ],
    });

    return res.status(201).json(full);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Une délibération existe déjà pour cette combinaison.' });
    }
    return res.status(500).json({ message: err.message });
  }
};

// PUT /deliberations/:id
exports.update = async (req, res) => {
  try {
    const delib = await Deliberation.findByPk(req.params.id);
    if (!delib) return res.status(404).json({ message: 'Délibération introuvable.' });

    const { date_deliberation, president_jury, observations } = req.body;
    await delib.update({ date_deliberation, president_jury, observations });
    return res.status(200).json(delib);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /deliberations/:id/valider — Finaliser la délibération
exports.valider = async (req, res) => {
  try {
    const delib = await Deliberation.findByPk(req.params.id, {
      include: [
        { association: 'niveau', attributes: ['libelle'] },
        { association: 'parcours', attributes: ['libelle'] },
        { association: 'anneeUniversitaire', attributes: ['libelle'] },
      ],
    });
    if (!delib) return res.status(404).json({ message: 'Délibération introuvable.' });
    if (delib.statut === 'terminee') return res.status(400).json({ message: 'Délibération déjà finalisée.' });

    await delib.update({ statut: 'terminee' });

    // Notifier les étudiants
    const decisions = await DecisionJury.findAll({
      where: { deliberation_id: delib.id },
      include: [{ association: 'etudiant', include: [{ association: 'compte' }] }],
    });

    for (const dec of decisions) {
      if (dec.etudiant?.compte?.id) {
        await createNotification({
          titre: '📋 Résultats de délibération',
          message: `Les résultats de la délibération ${delib.niveau?.libelle} - ${delib.parcours?.libelle} (${delib.anneeUniversitaire?.libelle}) sont disponibles. Décision : ${dec.decision.toUpperCase()}.`,
          type: 'deliberation',
          destinataire_id: dec.etudiant.compte.id,
          lien: '/deliberation',
        });
      }
    }

    return res.status(200).json({ message: 'Délibération validée.', deliberation: delib });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /deliberations/:id/decision/:decisionId — Modifier une décision manuellement
exports.updateDecision = async (req, res) => {
  try {
    const decision = await DecisionJury.findByPk(req.params.decisionId);
    if (!decision) return res.status(404).json({ message: 'Décision introuvable.' });
    if (decision.deliberation_id !== parseInt(req.params.id)) {
      return res.status(400).json({ message: 'Décision non liée à cette délibération.' });
    }

    const { decision: newDecision, observations } = req.body;
    await decision.update({ decision: newDecision, observations });
    return res.status(200).json(decision);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /deliberations/:id
exports.remove = async (req, res) => {
  try {
    const delib = await Deliberation.findByPk(req.params.id);
    if (!delib) return res.status(404).json({ message: 'Délibération introuvable.' });
    if (delib.statut === 'terminee') return res.status(400).json({ message: 'Impossible de supprimer une délibération finalisée.' });
    await delib.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /deliberations/:id/recalculer — Recalculer les décisions
exports.recalculer = async (req, res) => {
  try {
    const delib = await Deliberation.findByPk(req.params.id);
    if (!delib) return res.status(404).json({ message: 'Délibération introuvable.' });
    if (delib.statut === 'terminee') return res.status(400).json({ message: 'Délibération déjà finalisée.' });

    await DecisionJury.destroy({ where: { deliberation_id: delib.id } });
    await calculateDecisions(delib);

    const full = await Deliberation.findByPk(delib.id, {
      include: [{
        association: 'decisions',
        include: [{ association: 'etudiant', include: [{ association: 'niveau' }, { association: 'parcours' }] }],
      }],
    });

    return res.status(200).json(full);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── Fonction de calcul automatique des décisions ──────────────────────────────
async function calculateDecisions(delib) {
  // Chercher les étudiants du niveau + parcours
  const etudiants = await Etudiant.findAll({
    where: { niveau_id: delib.niveau_id, parcours_id: delib.parcours_id, actif: true },
  });

  // Chercher TOUS les modules et matières requis pour ce niveau/parcours
  const allModules = await Module.findAll({
    where: { niveau_id: delib.niveau_id, parcours_id: delib.parcours_id },
    include: [{ association: 'matieres' }],
  });

  const whereNote = { annee_universitaire_id: delib.annee_universitaire_id };
  const decisions = [];

  for (const etd of etudiants) {
    const notes = await Note.findAll({
      where: { etudiant_id: etd.id, ...whereNote },
      include: [{ association: 'matiere' }],
    });

    const noteMap = {}; // matiere_id -> note object (on prend la meilleure)
    notes.forEach(n => {
      if (!noteMap[n.matiere_id] || parseFloat(n.valeur) > parseFloat(noteMap[n.matiere_id].valeur)) {
        noteMap[n.matiere_id] = n;
      }
    });

    let totalCreditsPossible = 0;
    let creditsValides = 0;
    let sommePondereeModules = 0;
    let sommeCreditsTotal = 0;

    allModules.forEach(mod => {
      let sumP = 0, sumC = 0;
      mod.matieres.forEach(m => {
        const n = noteMap[m.id];
        const val = n ? (n.est_absent ? 0 : parseFloat(n.valeur) || 0) : 0;
        const coef = parseFloat(m.coefficient) || 1;
        sumP += val * coef;
        sumC += coef;
      });

      const moyModule = sumC > 0 ? sumP / sumC : 0;
      const credits = parseInt(mod.credits) || 0;
      
      totalCreditsPossible += credits;
      if (moyModule >= 10) creditsValides += credits;
      
      sommePondereeModules += moyModule * credits;
      sommeCreditsTotal += credits;
    });

    const moyenneGenerale = sommeCreditsTotal > 0 ? sommePondereeModules / sommeCreditsTotal : 0;

    // Déterminer décision
    let decision = 'redoubler';
    let mention = 'Insuffisant';

    if (moyenneGenerale >= 10) {
      decision = 'admis';
      if (moyenneGenerale >= 16) mention = 'Très Bien';
      else if (moyenneGenerale >= 14) mention = 'Bien';
      else if (moyenneGenerale >= 12) mention = 'Assez Bien';
      else mention = 'Passable';
    } else if (moyenneGenerale >= 8) { // Autorisé à passer si MG entre 8 et 10 (seuil ajustable)
      decision = 'autoriser_a_passer';
      mention = 'Ajourné';
    }

    decisions.push({
      deliberation_id: delib.id,
      etudiant_id: etd.id,
      moyenne_generale: moyenneGenerale.toFixed(2),
      total_credits: creditsValides,
      total_credits_requis: totalCreditsPossible,
      decision,
      mention,
    });
  }

  // Trier par moyenne pour attribuer les rangs
  decisions.sort((a, b) => parseFloat(b.moyenne_generale) - parseFloat(a.moyenne_generale));
  decisions.forEach((d, i) => { d.rang = i + 1; });

  if (decisions.length > 0) {
    await DecisionJury.bulkCreate(decisions);
  }
}
