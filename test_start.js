'use strict';
require('dotenv').config();
const { sequelize } = require('./models');
const fs = require('fs');

(async () => {
  try {
    await sequelize.authenticate();
    fs.writeFileSync('diag.txt', 'DB connected OK\n');
    
    await sequelize.sync();
    fs.writeFileSync('diag.txt', 'SYNC OK - All tables created/verified\n');
    
  } catch (err) {
    const msg = [
      'ERROR NAME: ' + err.name,
      'ERROR MSG: ' + err.message,
      'SQL: ' + (err.sql || 'none'),
      'ORIGINAL: ' + (err.original?.message || 'none'),
    ].join('\n');
    fs.writeFileSync('diag.txt', msg);
  }
  process.exit(0);
})();
