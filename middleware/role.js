'use strict';

/**
 * Middleware de contrôle d'accès par rôle
 * Usage: requireRole('admin', 'enseignant')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}.`,
      });
    }
    next();
  };
};

module.exports = { requireRole };
