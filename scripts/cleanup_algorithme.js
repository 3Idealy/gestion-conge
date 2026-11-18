'use strict';

require('dotenv').config();
const { sequelize, Module, Matiere, Note } = require('../models');
const { Op } = require('sequelize');

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log('Connexion OK — recherche des entrées "algorithme"...');

    const libelleFilter = { [Op.iLike]: '%algorithme%' };

    const matieres = await Matiere.findAll({ where: { libelle: libelleFilter } });
    const modules = await Module.findAll({ where: { libelle: libelleFilter } });

    const matiereIds = matieres.map(m => m.id);
    const moduleIds = modules.map(m => m.id);

    const matieresFromModules = moduleIds.length
      ? await Matiere.findAll({ where: { module_id: { [Op.in]: moduleIds } } })
      : [];

    const allMatiereIds = [...new Set([...matiereIds, ...matieresFromModules.map(m => m.id)])];

    let deletedNotes = 0;
    if (allMatiereIds.length) {
      deletedNotes = await Note.destroy({ where: { matiere_id: { [Op.in]: allMatiereIds } } });
    }

    let deletedMatieres = 0;
    if (allMatiereIds.length) {
      deletedMatieres = await Matiere.destroy({ where: { id: { [Op.in]: allMatiereIds } } });
    }

    let deletedModules = 0;
    if (moduleIds.length) {
      deletedModules = await Module.destroy({ where: { id: { [Op.in]: moduleIds } } });
    }

    console.log(`Supprimé : ${deletedNotes} note(s), ${deletedMatieres} matière(s), ${deletedModules} module(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}

cleanup();
