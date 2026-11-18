'use strict';

const { Op } = require('sequelize');

const PATTERNS = {
  numeric: /^\d+$/,
  alphanumericCode: /^[A-Za-z0-9_-]+$/,
  name: /^[A-Za-zÀ-ÿ\s'-]+$/,
  phone: /^[\d\s+().-]{6,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

function parseQueryIds(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}

function validateNumericString(value, fieldLabel) {
  if (value == null || value === '') return `${fieldLabel} est requis.`;
  if (!PATTERNS.numeric.test(String(value).trim())) {
    return `${fieldLabel} ne doit contenir que des chiffres.`;
  }
  return null;
}

function validateAlphanumericCode(value, fieldLabel) {
  if (!value || !String(value).trim()) return `${fieldLabel} est requis.`;
  if (!PATTERNS.alphanumericCode.test(String(value).trim())) {
    return `${fieldLabel} ne doit contenir que des lettres, chiffres, tirets ou underscores.`;
  }
  return null;
}

function validateName(value, fieldLabel) {
  if (!value || !String(value).trim()) return `${fieldLabel} est requis.`;
  if (!PATTERNS.name.test(String(value).trim())) {
    return `${fieldLabel} ne doit contenir que des lettres.`;
  }
  return null;
}

function validatePhone(value) {
  if (!value || !String(value).trim()) return null;
  if (!PATTERNS.phone.test(String(value).trim())) {
    return 'Le téléphone ne doit contenir que des chiffres et caractères téléphoniques (+, -, espaces).';
  }
  return null;
}

function validateEmail(value) {
  if (!value || !String(value).trim()) return null;
  if (!PATTERNS.email.test(String(value).trim())) {
    return 'L\'adresse email n\'est pas valide.';
  }
  return null;
}

function validateInteger(value, fieldLabel, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) return `${fieldLabel} doit être un nombre entier.`;
  if (n < min) return `${fieldLabel} ne peut pas être inférieur à ${min}.`;
  if (n > max) return `${fieldLabel} ne peut pas dépasser ${max}.`;
  return null;
}

function validateDecimal(value, fieldLabel, { min = -Infinity, max = Infinity } = {}) {
  const n = parseFloat(value);
  if (isNaN(n)) return `${fieldLabel} doit être un nombre.`;
  if (n < min) return `${fieldLabel} ne peut pas être inférieur à ${min}.`;
  if (n > max) return `${fieldLabel} ne peut pas dépasser ${max}.`;
  return null;
}

async function checkEtudiantDuplicates(Etudiant, { numero_etudiant, nom, prenom, email, telephone, excludeId }) {
  const errors = [];

  const numErr = validateNumericString(numero_etudiant, 'Le numéro étudiant');
  if (numErr) errors.push(numErr);

  const nomErr = validateName(nom, 'Le nom');
  if (nomErr) errors.push(nomErr);

  const prenomErr = validateName(prenom, 'Le prénom');
  if (prenomErr) errors.push(prenomErr);

  const emailErr = validateEmail(email);
  if (emailErr) errors.push(emailErr);

  const phoneErr = validatePhone(telephone);
  if (phoneErr) errors.push(phoneErr);

  if (errors.length) return errors;

  // ... reste inchangé


  const whereBase = excludeId ? { id: { [Op.ne]: excludeId } } : {};

  const existingNum = await Etudiant.findOne({
    where: { ...whereBase, numero_etudiant: String(numero_etudiant).trim() },
  });
  if (existingNum) errors.push('Ce numéro étudiant existe déjà.');

  const existingName = await Etudiant.findOne({
    where: {
      ...whereBase,
      nom: { [Op.iLike]: String(nom).trim() },
      prenom: { [Op.iLike]: String(prenom).trim() },
    },
  });
  if (existingName) errors.push('Un étudiant avec ce nom et prénom existe déjà.');

  if (email && String(email).trim()) {
    const existingEmail = await Etudiant.findOne({
      where: { ...whereBase, email: String(email).trim() },
    });
    if (existingEmail) errors.push('Cette adresse email est déjà utilisée.');
  }

  return errors;
}

module.exports = {
  PATTERNS,
  parseQueryIds,
  validateNumericString,
  validateAlphanumericCode,
  validateName,
  validatePhone,
  validateEmail,
  validateInteger,
  validateDecimal,
  checkEtudiantDuplicates,
};
