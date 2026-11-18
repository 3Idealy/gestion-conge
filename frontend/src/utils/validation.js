export const PATTERNS = {
  numeric: /^\d+$/,
  alphanumericCode: /^[A-Za-z0-9_-]+$/,
  name: /^[A-Za-zÀ-ÿ\s'-]+$/,
  phone: /^[\d\s+().-]{6,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
};

export function validateNumeric(value, label) {
  if (!value?.toString().trim()) return `${label} est requis.`;
  if (!PATTERNS.numeric.test(value.toString().trim())) return `${label} ne doit contenir que des chiffres.`;
  return null;
}

export function validateAlphanumericCode(value, label) {
  if (!value?.toString().trim()) return `${label} est requis.`;
  if (!PATTERNS.alphanumericCode.test(value.toString().trim())) {
    return `${label} ne doit contenir que des lettres, chiffres, tirets ou underscores.`;
  }
  return null;
}

export function validateName(value, label) {
  if (!value?.toString().trim()) return `${label} est requis.`;
  if (!PATTERNS.name.test(value.toString().trim())) return `${label} ne doit contenir que des lettres.`;
  return null;
}

export function validateEmail(value) {
  if (!value?.toString().trim()) return null;
  if (!PATTERNS.email.test(value.toString().trim())) return 'L\'adresse email n\'est pas valide.';
  return null;
}

export function validatePhone(value) {
  if (!value?.toString().trim()) return null;
  if (!PATTERNS.phone.test(value.toString().trim())) {
    return 'Le téléphone ne doit contenir que des chiffres et caractères téléphoniques.';
  }
  return null;
}

export function validateInteger(value, label, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) return `${label} doit être un nombre entier.`;
  if (n < min) return `${label} ne peut pas être inférieur à ${min}.`;
  if (n > max) return `${label} ne peut pas dépasser ${max}.`;
  return null;
}

export function validateDecimal(value, label, { min = -Infinity, max = Infinity } = {}) {
  const n = parseFloat(value);
  if (isNaN(n)) return `${label} doit être un nombre.`;
  if (n < min) return `${label} ne peut pas être inférieur à ${min}.`;
  if (n > max) return `${label} ne peut pas dépasser ${max}.`;
  return null;
}

export function validateNoteValue(value) {
  if (value === '' || value == null) return 'La note est requise.';
  return validateDecimal(value, 'La note', { min: 0, max: 20 });
}

export function runValidators(validators) {
  for (const fn of validators) {
    const err = fn();
    if (err) return err;
  }
  return null;
}

export const TYPE_MATIERE_LABELS = {
  CM: 'Cours magistral',
  TD: 'Travaux dirigés',
  TP: 'Travaux pratiques',
  PROJET: 'Projet',
};
