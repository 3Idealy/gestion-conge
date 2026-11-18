const { sequelize } = require('./models');

async function fix() {
  try {
    await sequelize.authenticate();
    await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS etudiant_id INTEGER REFERENCES etudiant(id) ON UPDATE CASCADE ON DELETE SET NULL;');
    console.log('Colonne etudiant_id ajoutee avec succes !');
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    process.exit(0);
  }
}

fix();
