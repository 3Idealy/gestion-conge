'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

// ── Configurer le transporteur email ──────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'L\'adresse email est requise.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Pour des raisons de sécurité, on retourne toujours un succès
      return res.status(200).json({
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Stocker le token hashé avec une expiration de 1 heure
    await user.update({
      reset_token: hashedToken,
      reset_token_expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
    });

    // Construire le lien de réinitialisation
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/login?reset=${resetToken}`;

    // Envoyer l'email
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"GestNotes" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🔐 Réinitialisation de votre mot de passe — GestNotes',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎓 GestNotes</h1>
              <p style="color: #d1fae5; margin-top: 8px; font-size: 14px;">Plateforme de gestion universitaire</p>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Réinitialisation du mot de passe</h2>
              <p style="color: #64748b; line-height: 1.6;">
                Bonjour <strong>${user.prenom} ${user.nom}</strong>,<br><br>
                Vous avez demandé la réinitialisation de votre mot de passe. 
                Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                  Réinitialiser mon mot de passe
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
                ⏰ Ce lien expirera dans <strong>1 heure</strong>.<br>
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="color: #cbd5e1; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} GestNotes — Tous droits réservés
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Erreur envoi email:', emailErr.message);
      // On ne révèle pas l'erreur email à l'utilisateur
    }

    return res.status(200).json({
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    });
  } catch (err) {
    console.error('Erreur forgot password:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, passwordConfirm } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe sont requis.' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Hasher le token reçu pour le comparer
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        reset_token: hashedToken,
        reset_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou a expiré.' });
    }

    // Mettre à jour le mot de passe et effacer le token
    await user.update({
      password,
      reset_token: null,
      reset_token_expires: null,
    });

    return res.status(200).json({
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    });
  } catch (err) {
    console.error('Erreur reset password:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};
