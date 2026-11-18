'use strict';

const bcrypt = require('bcryptjs');
const {
  AnneeUniversitaire, Etudiant, Niveau, DecisionJury, Deliberation,
  User, sequelize,
} = require('../models');
const { Op } = require('sequelize');

// Mapping de promotion des niveaux L1→L2→L3→M1→M2→Diplômé
const PROMOTION_MAP = {
  'L1': 'L2',
  'L2': 'L3',
  'L3': 'M1',
  'M1': 'M2',
  'M2': null, // Diplômé → archivé
};

/**
 * POST /annees/cloturer
 * Étape 1 : Vérifier le mot de passe admin et clôturer l'année en cours
 */
exports.cloturerAnnee = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { admin_password } = req.body;

    // Vérifier le mot de passe admin
    const admin = await User.findByPk(req.userId);
    if (!admin || admin.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const isValid = await admin.verifyPassword(admin_password);
    if (!isValid) {
      await t.rollback();
      return res.status(401).json({ message: 'Mot de passe administrateur incorrect.' });
    }

    // Trouver l'année en cours
    const anneeEnCours = await AnneeUniversitaire.findOne({
      where: { en_cours: true },
      transaction: t,
    });

    if (!anneeEnCours) {
      await t.rollback();
      return res.status(404).json({ message: 'Aucune année universitaire en cours trouvée.' });
    }

    // Clôturer l'année
    await anneeEnCours.update(
      { en_cours: false, statut: 'cloturee' },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).json({
      message: `L'année ${anneeEnCours.libelle} a été clôturée avec succès.`,
      annee_cloturee: anneeEnCours,
    });
  } catch (err) {
    await t.rollback();
    console.error('Erreur clôture année:', err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /annees/set-nouvelle-annee
 * Étape 2 : Définir une nouvelle année comme année en cours et exécuter la promotion
 */
exports.setNouvelleAnnee = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { annee_id, admin_password, annee_cloturee_id } = req.body;

    // Vérifier le mot de passe admin
    const admin = await User.findByPk(req.userId);
    if (!admin || admin.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const isValid = await admin.verifyPassword(admin_password);
    if (!isValid) {
      await t.rollback();
      return res.status(401).json({ message: 'Mot de passe administrateur incorrect.' });
    }

    // Trouver la nouvelle année
    const nouvelleAnnee = await AnneeUniversitaire.findByPk(annee_id, { transaction: t });
    if (!nouvelleAnnee) {
      await t.rollback();
      return res.status(404).json({ message: 'Année universitaire introuvable.' });
    }

    // S'assurer qu'aucune autre année n'est en cours
    await AnneeUniversitaire.update(
      { en_cours: false },
      { where: { en_cours: true }, transaction: t }
    );

    // Définir la nouvelle année comme en cours
    await nouvelleAnnee.update(
      { en_cours: true, statut: 'en_cours' },
      { transaction: t }
    );

    // Exécuter la promotion si une année clôturée est spécifiée
    let promotionResult = null;
    if (annee_cloturee_id) {
      promotionResult = await executePromotion(annee_cloturee_id, t);
    }

    await t.commit();

    return res.status(200).json({
      message: `L'année ${nouvelleAnnee.libelle} est maintenant l'année en cours.`,
      nouvelle_annee: nouvelleAnnee,
      promotion: promotionResult,
    });
  } catch (err) {
    await t.rollback();
    console.error('Erreur set nouvelle année:', err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /annees/vides
 * Retourne les années universitaires avec statut 'vide' (pas encore utilisées)
 */
exports.getAnneesVides = async (req, res) => {
  try {
    const annees = await AnneeUniversitaire.findAll({
      where: { statut: 'vide' },
      order: [['annee_debut', 'DESC']],
    });
    return res.status(200).json(annees);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Fonction interne : exécuter la promotion des étudiants
 */
async function executePromotion(anneeClotureeId, transaction) {
  // Récupérer tous les niveaux pour le mapping
  const niveaux = await Niveau.findAll({ transaction });
  const niveauMap = {};
  niveaux.forEach(n => { niveauMap[n.libelle] = n; });

  // Récupérer les délibérations terminées de l'année clôturée
  const deliberations = await Deliberation.findAll({
    where: {
      annee_universitaire_id: anneeClotureeId,
      statut: 'terminee',
    },
    include: [{
      association: 'decisions',
      include: [{
        association: 'etudiant',
        include: [{ association: 'niveau' }],
      }],
    }],
    transaction,
  });

  const result = {
    promus: 0,
    redoublants: 0,
    exclus: 0,
    diplomes: 0,
    non_traites: 0,
    details: [],
  };

  // Garder la trace des étudiants déjà traités (un étudiant peut avoir plusieurs décisions)
  const etudiantsTraites = new Set();

  for (const deliberation of deliberations) {
    for (const decision of (deliberation.decisions || [])) {
      const etudiant = decision.etudiant;
      if (!etudiant || etudiantsTraites.has(etudiant.id)) continue;
      etudiantsTraites.add(etudiant.id);

      const niveauActuel = etudiant.niveau?.libelle;

      if (decision.decision === 'admis') {
        const niveauSuivantLibelle = PROMOTION_MAP[niveauActuel];

        if (niveauSuivantLibelle === null) {
          // M2 admis → Diplômé (archivé)
          await Etudiant.update(
            { actif: false },
            { where: { id: etudiant.id }, transaction }
          );
          result.diplomes++;
          result.details.push({
            etudiant: `${etudiant.nom} ${etudiant.prenom}`,
            action: 'diplome',
            de: niveauActuel,
            vers: 'Diplômé (archivé)',
          });
        } else if (niveauSuivantLibelle && niveauMap[niveauSuivantLibelle]) {
          // Promotion vers le niveau suivant
          await Etudiant.update(
            { niveau_id: niveauMap[niveauSuivantLibelle].id },
            { where: { id: etudiant.id }, transaction }
          );
          result.promus++;
          result.details.push({
            etudiant: `${etudiant.nom} ${etudiant.prenom}`,
            action: 'promu',
            de: niveauActuel,
            vers: niveauSuivantLibelle,
          });
        } else {
          result.non_traites++;
        }
      } else if (decision.decision === 'redoublement') {
        // Reste au même niveau
        result.redoublants++;
        result.details.push({
          etudiant: `${etudiant.nom} ${etudiant.prenom}`,
          action: 'redoublant',
          de: niveauActuel,
          vers: niveauActuel,
        });
      } else if (decision.decision === 'exclusion') {
        // Désactivé
        await Etudiant.update(
          { actif: false },
          { where: { id: etudiant.id }, transaction }
        );
        result.exclus++;
        result.details.push({
          etudiant: `${etudiant.nom} ${etudiant.prenom}`,
          action: 'exclu',
          de: niveauActuel,
          vers: 'Désactivé',
        });
      } else {
        // ajourne, rattrapage → reste au même niveau
        result.redoublants++;
        result.details.push({
          etudiant: `${etudiant.nom} ${etudiant.prenom}`,
          action: 'redoublant',
          de: niveauActuel,
          vers: niveauActuel,
        });
      }
    }
  }

  return result;
}
