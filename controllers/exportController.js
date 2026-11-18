'use strict';

const PDFDocument = require('pdfkit');
const {
  Note, Etudiant, Matiere, Module, Niveau, Parcours, Mention,
  AnneeUniversitaire, SessionExamen, Deliberation, DecisionJury,
} = require('../models');

// GET /export/bulletin/:etudiant_id
exports.bulletinPDF = async (req, res) => {
  try {
    const { etudiant_id } = req.params;
    const { annee_universitaire_id } = req.query;

    const etudiant = await Etudiant.findByPk(etudiant_id, {
      include: [
        { association: 'parcours', include: [{ association: 'mention' }] },
        { association: 'niveau' },
      ],
    });
    if (!etudiant) return res.status(404).json({ message: 'Étudiant introuvable.' });

    const where = { etudiant_id };
    if (annee_universitaire_id) where.annee_universitaire_id = annee_universitaire_id;

    const notes = await Note.findAll({
      where,
      include: [
        { association: 'matiere', include: [{ association: 'module' }] },
        { association: 'anneeUniversitaire' },
        { association: 'session' },
      ],
    });

    // Grouper par module
    const moduleMap = {};
    notes.forEach(n => {
      const mod = n.matiere?.module;
      if (!mod) return;
      if (!moduleMap[mod.id]) {
        moduleMap[mod.id] = { id: mod.id, code: mod.code, libelle: mod.libelle, semestre: mod.semestre, credits: mod.credits, matieres: [] };
      }
      moduleMap[mod.id].matieres.push({
        libelle: n.matiere.libelle,
        code: n.matiere.code,
        coefficient: parseFloat(n.matiere.coefficient || 1),
        note: n.est_absent ? 0 : parseFloat(n.valeur),
        absent: n.est_absent,
        type_absence: n.type_absence,
      });
    });

    const modules = Object.values(moduleMap).map(mod => {
      let totalP = 0, totalC = 0;
      mod.matieres.forEach(m => { totalP += m.note * m.coefficient; totalC += m.coefficient; });
      mod.moyenne = totalC > 0 ? (totalP / totalC).toFixed(2) : '0.00';
      return mod;
    });

    let sommeCredits = 0, sommePoints = 0, creditsValides = 0;
    modules.forEach(m => {
      const moy = parseFloat(m.moyenne);
      const cred = parseInt(m.credits) || 0;
      sommePoints += moy * cred;
      sommeCredits += cred;
      if (moy >= 10) creditsValides += cred;
    });
    const moyG = sommeCredits > 0 ? (sommePoints / sommeCredits).toFixed(2) : '0.00';

    let anneeLib = '';
    if (notes.length > 0 && notes[0].anneeUniversitaire) {
      anneeLib = notes[0].anneeUniversitaire.libelle;
    }

    // ── Génération PDF ───────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bulletin_${etudiant.numero_etudiant}.pdf`);
    doc.pipe(res);

    // Header stylisé
    doc.fontSize(10).font('Helvetica-Bold').text('UNIVERSITÉ DE FIANARANTSOA', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text('********************', { align: 'center' });
    doc.fontSize(10).font('Helvetica-Bold').text("ÉCOLE NATIONALE D'INFORMATIQUE", { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('EXTRAIT DE NOTES', { align: 'center', underline: true });
    doc.moveDown();

    // Infos étudiant
    const labelX = 50;
    const valueX = 180;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Mention :', labelX); doc.font('Helvetica').text(etudiant.parcours?.mention?.libelle || 'N/A', valueX, doc.y - 9);
    doc.font('Helvetica-Bold').text('Parcours :', labelX); doc.font('Helvetica').text(etudiant.parcours?.libelle || 'N/A', valueX, doc.y - 9);
    doc.font('Helvetica-Bold').text('Nom et prénoms :', labelX); doc.font('Helvetica').text(`${etudiant.nom} ${etudiant.prenom}`, valueX, doc.y - 9);
    doc.font('Helvetica-Bold').text('Date et lieu de naissance :', labelX); doc.font('Helvetica').text(`${etudiant.date_naissance || 'N/A'} à ${etudiant.lieu_naissance || 'N/A'}`, valueX, doc.y - 9);
    doc.font('Helvetica-Bold').text("Numéro d'inscription :", labelX); doc.font('Helvetica').text(etudiant.numero_etudiant, valueX, doc.y - 9);
    if (anneeLib) {
      doc.font('Helvetica-Bold').text('Année Universitaire :', labelX); doc.font('Helvetica').text(anneeLib, valueX, doc.y - 9);
    }
    doc.moveDown();

    // Table Header
    let tableTop = doc.y;
    const col1 = 50, col2 = 300, col3 = 400, col4 = 500;
    const tableWidth = 500;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.rect(col1, tableTop, tableWidth, 15).fill('#f3f4f6').stroke();
    doc.fillColor('#000');
    doc.text('MATIÈRES', col1 + 5, tableTop + 4);
    doc.text('NOTES / 20', col2, tableTop + 4, { width: 100, align: 'center' });
    doc.text("VALIDATION DE L'UE", col3, tableTop + 4, { width: 100, align: 'center' });
    doc.text('CRÉDITS', col4, tableTop + 4, { width: 50, align: 'center' });
    doc.moveDown(0.2);

    // Table Content
    modules.forEach(mod => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
      doc.rect(col1, doc.y + 5, tableWidth, 15).stroke();
      doc.text(`${mod.code} - ${mod.libelle}`, col1 + 5, doc.y + 9);
      doc.fillColor('#000');
      doc.moveDown(0.6);

      mod.matieres.forEach(mat => {
        const y = doc.y + 5;
        if (y > 750) { doc.addPage(); tableTop = 40; }
        doc.fontSize(8).font('Helvetica');
        doc.text(mat.libelle, col1 + 10, y, { width: 240 });
        const noteText = mat.absent ? (mat.type_absence || 'ABS') : mat.note.toFixed(2);
        doc.text(noteText, col2, y, { width: 100, align: 'center' });
        doc.moveDown(0.5);
      });

      const footerY = doc.y + 5;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Moyenne', col1 + 220, footerY);
      doc.text(mod.moyenne, col2, footerY, { width: 100, align: 'center' });
      doc.text(parseFloat(mod.moyenne) >= 10 ? 'VALIDE' : 'NON VALIDE', col3, footerY, { width: 100, align: 'center' });
      doc.text(String(mod.credits), col4, footerY, { width: 50, align: 'center' });
      doc.rect(col1, footerY - 4, tableWidth, 15).stroke();
      doc.moveDown(1.2);
    });

    // Summary Bottom
    const summaryY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('MOYENNE GÉNÉRALE', col1, summaryY);
    doc.text(`${moyG} / 20`, col2, summaryY, { width: 100, align: 'center' });
    doc.text(parseFloat(moyG) >= 10 ? 'ADMIS' : 'AJOURNÉ', col3, summaryY, { width: 100, align: 'center' });
    doc.text(`${creditsValides} / ${sommeCredits}`, col4, summaryY, { width: 50, align: 'center' });
    doc.rect(col1, summaryY - 4, tableWidth, 15).stroke();

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica');
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Fait à Fianarantsoa, le ${dateStr}`, { align: 'right' });
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Le Responsable de la mention', { align: 'right' });
    doc.moveDown(3);
    doc.font('Helvetica').text('_______________________', { align: 'right' });

    doc.end();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /export/recap-notes-niveau/:niveau_id
exports.recapitulatifNotesNiveauPDF = async (req, res) => {
  try {
    const { niveau_id } = req.params;
    const { annee_universitaire_id } = req.query;

    const niveau = await Niveau.findByPk(niveau_id);
    if (!niveau) return res.status(404).json({ message: 'Niveau introuvable.' });

    const etudiants = await Etudiant.findAll({
      where: { niveau_id, actif: true },
      include: [{ association: 'parcours', include: [{ association: 'mention' }] }],
      order: [['nom', 'ASC'], ['prenom', 'ASC']],
    });

    const modules = await Module.findAll({
      where: { niveau_id },
      include: [{ association: 'matieres' }],
      order: [['semestre', 'ASC'], ['code', 'ASC']],
    });

    const whereNote = {};
    if (annee_universitaire_id) whereNote.annee_universitaire_id = annee_universitaire_id;

    const results = [];
    for (const etd of etudiants) {
      const notes = await Note.findAll({
        where: { etudiant_id: etd.id, ...whereNote },
        include: [{ association: 'matiere', include: [{ association: 'module' }] }],
      });

      const moduleMap = {};
      notes.forEach(n => {
        const mod = n.matiere?.module;
        if (!mod) return;
        if (!moduleMap[mod.id]) moduleMap[mod.id] = { credits: mod.credits || 0, sumP: 0, sumC: 0 };
        const val = n.est_absent ? 0 : parseFloat(n.valeur) || 0;
        const coef = parseFloat(n.matiere.coefficient) || 1;
        moduleMap[mod.id].sumP += val * coef;
        moduleMap[mod.id].sumC += coef;
      });

      let totalCredits = 0, creditsValides = 0, sommePonderee = 0, totalCoef = 0;
      const studentModules = modules.map(m => {
        const data = moduleMap[m.id] || { credits: m.credits || 0, sumP: 0, sumC: 0 };
        const moy = data.sumC > 0 ? data.sumP / data.sumC : 0;
        totalCredits += data.credits;
        if (moy >= 10) creditsValides += data.credits;
        sommePonderee += moy * (data.credits || 1);
        totalCoef += (data.credits || 1);
        return { id: m.id, moy: moy.toFixed(2) };
      });

      const moyG = totalCoef > 0 ? (sommePonderee / totalCoef) : 0;
      results.push({
        id: etd.id,
        numero: etd.numero_etudiant,
        nom: `${etd.nom} ${etd.prenom}`,
        modules: studentModules,
        moyenne: moyG.toFixed(2),
        totalCredits: totalCredits,
        creditsValides: creditsValides,
        decision: moyG >= 10 ? 'ADMIS' : (moyG >= 8 ? 'RATTRAPAGE' : 'AJOURNÉ'),
      });
    }

    results.sort((a, b) => parseFloat(b.moyenne) - parseFloat(a.moyenne));
    results.forEach((r, i) => { r.rang = i + 1; });
    
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recap_notes_${niveau.libelle}.pdf`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('RÉCAPITULATIF GLOBAL DES NOTES', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Niveau : ${niveau.libelle}`, { align: 'center' });
    doc.moveDown();

    const startX = 30;
    const availableWidth = 780;
    const colRang = 30, colMatricule = 60, colNom = 140, colDecision = 60, colMoy = 40, colCredits = 40;
    const remainingWidth = availableWidth - (colRang + colMatricule + colNom + colDecision + colMoy + colCredits);
    const colModWidth = modules.length > 0 ? remainingWidth / modules.length : 0;

    let currentX = startX;
    doc.fontSize(7).font('Helvetica-Bold');
    doc.rect(startX, doc.y, availableWidth, 20).fill('#f3f4f6').stroke();
    doc.fillColor('#000');
    
    const headerY = doc.y + 15;
    doc.text('Rang', currentX + 2, headerY, { width: colRang - 4, align: 'center' }); currentX += colRang;
    doc.text('Matricule', currentX + 2, headerY, { width: colMatricule - 4, align: 'center' }); currentX += colMatricule;
    doc.text('Nom & Prénoms', currentX + 2, headerY, { width: colNom - 4, align: 'left' }); currentX += colNom;
    modules.forEach(m => {
       doc.text(m.code, currentX + 2, headerY, { width: colModWidth - 4, align: 'center' }); currentX += colModWidth;
    });
    doc.text('Moy. G', currentX + 2, headerY, { width: colMoy - 4, align: 'center' }); currentX += colMoy;
    doc.text('Crédits', currentX + 2, headerY, { width: colCredits - 4, align: 'center' }); currentX += colCredits;
    doc.text('Décision', currentX + 2, headerY, { width: colDecision - 4, align: 'center' });
    doc.moveDown(1.5);

    results.forEach(res => {
      if (doc.y > 520) { doc.addPage(); }
      const y = doc.y;
      currentX = startX;
      doc.fontSize(7).font('Helvetica');
      doc.rect(startX, y, availableWidth, 15).stroke();
      doc.text(String(res.rang), currentX, y + 4, { width: colRang, align: 'center' }); currentX += colRang;
      doc.text(res.numero, currentX, y + 4, { width: colMatricule, align: 'center' }); currentX += colMatricule;
      doc.text(res.nom, currentX + 2, y + 4, { width: colNom - 4, align: 'left' }); currentX += colNom;
      res.modules.forEach(m => {
         doc.text(m.moy, currentX, y + 4, { width: colModWidth, align: 'center' }); currentX += colModWidth;
      });
      doc.font('Helvetica-Bold').text(res.moyenne, currentX, y + 4, { width: colMoy, align: 'center' }); currentX += colMoy;
      doc.font('Helvetica').text(`${res.creditsValides}/${res.totalCredits}`, currentX, y + 4, { width: colCredits, align: 'center' }); currentX += colCredits;
      const color = res.decision === 'ADMIS' ? '#059669' : (res.decision === 'RATTRAPAGE' ? '#d97706' : '#dc2626');
      doc.fillColor(color).font('Helvetica-Bold').text(res.decision, currentX, y + 4, { width: colDecision, align: 'center' });
      doc.fillColor('#000').font('Helvetica').moveDown(0.9);
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/pv-deliberation/:id
exports.pvDeliberationPDF = async (req, res) => {
  try {
    const delib = await Deliberation.findByPk(req.params.id, {
      include: [
        { association: 'anneeUniversitaire' },
        { association: 'niveau' },
        { association: 'parcours', include: [{ association: 'mention' }] },
        { association: 'session' },
        { association: 'decisions', include: [{ association: 'etudiant' }] },
      ],
    });
    if (!delib) return res.status(404).json({ message: 'Délibération introuvable.' });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pv_deliberation_${delib.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('PROCÈS-VERBAL DE DÉLIBÉRATION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Année : ${delib.anneeUniversitaire?.libelle || 'N/A'}   |   Niveau : ${delib.niveau?.libelle || 'N/A'}   |   Parcours : ${delib.parcours?.libelle || 'N/A'}`, { align: 'center' });
    doc.text(`Mention : ${delib.parcours?.mention?.libelle || 'N/A'}   |   Session : ${delib.session?.libelle || 'N/A'}`, { align: 'center' });
    doc.text(`Date : ${new Date(delib.date_deliberation).toLocaleDateString('fr-FR')}   |   Président du jury : ${delib.president_jury || 'N/A'}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(742, doc.y).stroke();
    doc.moveDown();

    const startY = doc.y;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Rang', 50, startY, { width: 40 });
    doc.text('N° Étudiant', 90, startY, { width: 80 });
    doc.text('Nom & Prénom', 170, startY, { width: 170 });
    doc.text('Moyenne', 340, startY, { width: 60 });
    doc.text('Crédits', 400, startY, { width: 70 });
    doc.text('Mention', 470, startY, { width: 80 });
    doc.text('Décision', 550, startY, { width: 90 });
    doc.text('Observations', 640, startY, { width: 100 });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(742, doc.y).stroke();

    const decisions = (delib.decisions || []).sort((a, b) => (a.rang || 999) - (b.rang || 999));
    doc.font('Helvetica').fontSize(8);
    decisions.forEach(d => {
      if (doc.y > 500) { doc.addPage(); }
      const y = doc.y + 3;
      doc.text(String(d.rang || '-'), 50, y, { width: 40 });
      doc.text(d.etudiant?.numero_etudiant || '-', 90, y, { width: 80 });
      doc.text(`${d.etudiant?.nom || ''} ${d.etudiant?.prenom || ''}`, 170, y, { width: 170 });
      doc.text(`${d.moyenne_generale}/20`, 340, y, { width: 60 });
      doc.text(`${d.total_credits}/${d.total_credits_requis}`, 400, y, { width: 70 });
      doc.text(d.mention || '-', 470, y, { width: 80 });
      const decColor = d.decision === 'admis' ? '#059669' : d.decision === 'rattrapage' ? '#d97706' : '#dc2626';
      doc.fillColor(decColor).text(d.decision.toUpperCase(), 550, y, { width: 90 });
      doc.fillColor('#000').text(d.observations || '', 640, y, { width: 100 }).moveDown(0.3);
    });

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(742, doc.y).stroke();
    doc.moveDown();
    const total = decisions.length, admis = decisions.filter(d => d.decision === 'admis').length;
    doc.fontSize(9).font('Helvetica-Bold').text(`Total étudiants : ${total}   |   Admis : ${admis} (${total > 0 ? Math.round(admis/total*100) : 0}%)`);
    doc.moveDown(3).fontSize(9).font('Helvetica').text('Signatures du jury :', 50);
    doc.moveDown(2).text('Le Président : _______________________       Membre 1 : _______________________       Membre 2 : _______________________', 50);
    doc.moveDown(2).fontSize(7).fillColor('#666666').text(`PV généré le ${new Date().toLocaleDateString('fr-FR')} — Document officiel`, { align: 'center' });
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};
// GET /export/rapport-admission/:niveau_id?statut=ADMIS|AJOURNE
exports.rapportAdmissionPDF = async (req, res) => {
  try {
    const { niveau_id } = req.params;
    const { annee_universitaire_id, statut } = req.query; // statut: 'ADMIS' ou 'AJOURNE'

    const niveau = await Niveau.findByPk(niveau_id);
    const etudiantes = await Etudiant.findAll({
      where: { niveau_id, actif: true },
      include: [{ association: 'parcours' }],
    });

    const whereNote = { annee_universitaire_id: annee_universitaire_id || null };
    const list = [];

    for (const etd of etudiantes) {
      const notes = await Note.findAll({ where: { etudiant_id: etd.id, ...whereNote } });
      let somme = 0, count = 0;
      let hasEchec = false;
      notes.forEach(n => {
        const v = parseFloat(n.valeur);
        if (!n.est_absent && !isNaN(v)) {
          somme += v; count++;
          if (v < 10) hasEchec = true;
        } else if (n.est_absent) {
          hasEchec = true;
        }
      });
      const moy = count > 0 ? somme / count : 0;
      let resStatut = 'AJOURNE';
      if (moy >= 10 && !hasEchec) resStatut = 'ADMIS';
      else if (hasEchec && moy >= 10) resStatut = 'RATTRAPAGE';
      else if (moy >= 10) resStatut = 'ADMIS';

      if (!statut || resStatut === statut) {
        list.push({
          matricule: etd.numero_etudiant,
          nom: `${etd.nom} ${etd.prenom}`,
          parcours: etd.parcours?.libelle || 'N/A',
          moyenne: moy.toFixed(2),
          statut: resStatut
        });
      }
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${statut || 'admission'}.pdf`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text(`RAPPORT DES ÉTUDIANTS : ${statut || 'TOUS'}`, { align: 'center' });
    doc.fontSize(10).text(`Niveau : ${niveau?.libelle || 'N/A' }`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Matricule', 50, doc.y, { width: 80 });
    doc.text('Nom & Prénoms', 130, doc.y - 9, { width: 220 });
    doc.text('Parcours', 350, doc.y - 9, { width: 100 });
    doc.text('Moyenne', 450, doc.y - 9, { width: 60, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9);
    list.forEach(item => {
      if (doc.y > 750) doc.addPage();
      const y = doc.y;
      doc.text(item.matricule, 50, y);
      doc.text(item.nom, 130, y, { width: 220 });
      doc.text(item.parcours, 350, y, { width: 100 });
      doc.text(item.moyenne, 450, y, { width: 60, align: 'right' });
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/rapport-absences/:niveau_id
exports.rapportAbsencesPDF = async (req, res) => {
  try {
    const { niveau_id } = req.params;
    const { annee_universitaire_id } = req.query;

    const absents = await Note.findAll({
      where: { est_absent: true, annee_universitaire_id: annee_universitaire_id || null },
      include: [
        { association: 'etudiant', where: { niveau_id }, attributes: ['nom', 'prenom', 'numero_etudiant'] },
        { association: 'matiere', attributes: ['libelle', 'code'] }
      ]
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_absences.pdf`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('RAPPORT DES ABSENCES AUX EXAMENS', { align: 'center' });
    doc.moveDown();

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Étudiant', 50, doc.y);
    doc.text('Matière', 250, doc.y - 9);
    doc.text('Type', 400, doc.y - 9);
    doc.text('Observation', 480, doc.y - 9);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(8);
    absents.forEach(a => {
      const y = doc.y;
      doc.text(`${a.etudiant?.nom} ${a.etudiant?.prenom}`, 50, y, { width: 190 });
      doc.text(a.matiere?.libelle, 250, y, { width: 140 });
      doc.text(a.type_absence || 'ABI', 400, y);
      doc.text(a.observation || '-', 480, y);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/rapport-matiere/:matiere_id
exports.rapportMatierePDF = async (req, res) => {
  try {
    const { matiere_id } = req.params;
    const { annee_universitaire_id, niveau_id } = req.query;

    const matiere = await Matiere.findByPk(matiere_id);
    const whereEtud = niveau_id ? { niveau_id } : {};
    
    const notes = await Note.findAll({
      where: { matiere_id, annee_universitaire_id: annee_universitaire_id || null },
      include: [{ association: 'etudiant', where: whereEtud, attributes: ['nom', 'prenom', 'numero_etudiant'] }]
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pv_matiere_${matiere_id}.pdf`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text(`PV DE NOTES : ${matiere?.libelle || 'Matière'}`, { align: 'center' });
    doc.fontSize(10).text(`Code: ${matiere?.code || '-'}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Matricule', 50, doc.y);
    doc.text('Nom & Prénoms', 150, doc.y - 9);
    doc.text('Note', 450, doc.y - 9, { align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9);
    notes.forEach(n => {
      const y = doc.y;
      doc.text(n.etudiant?.numero_etudiant || '-', 50, y);
      doc.text(`${n.etudiant?.nom} ${n.etudiant?.prenom}`, 150, y);
      doc.text(n.est_absent ? 'ABS' : (n.valeur || '0.00'), 450, y, { align: 'right' });
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/certificat-scolarite/:etudiant_id
exports.certificatScolaritePDF = async (req, res) => {
  try {
    const { etudiant_id } = req.params;
    const { annee_universitaire_id } = req.query;

    const etudiant = await Etudiant.findByPk(etudiant_id, {
      include: [{ association: 'niveau' }, { association: 'parcours' }]
    });
    const annee = await AnneeUniversitaire.findByPk(annee_universitaire_id);

    const doc = new PDFDocument({ margin: 70 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificat_scolarite_${etudiant?.numero_etudiant}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('CERTIFICAT DE SCOLARITÉ', { align: 'center', underline: true });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica').text('Le Doyen de la Faculté certifie que l\'étudiant(e) :', { align: 'left' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text(`${etudiant?.nom?.toUpperCase()} ${etudiant?.prenom}`);
    doc.fontSize(11).font('Helvetica').text(`Né(e) le : ${etudiant?.date_naissance || '-'}`, { indent: 10 });
    doc.text(`Matricule : ${etudiant?.numero_etudiant}`, { indent: 10 });
    doc.moveDown();
    
    doc.text(`Est régulièrement inscrit(e) pour l'année universitaire ${annee?.libelle || '-'}`, { align: 'left' });
    doc.text(`Au niveau : ${etudiant?.niveau?.libelle || '-'}`, { indent: 10 });
    doc.text(`Parcours : ${etudiant?.parcours?.libelle || '-'}`, { indent: 10 });
    doc.moveDown(2);

    doc.text('En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.', { align: 'justify' });
    doc.moveDown(3);

    doc.text(`Fait à ......................., le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Le Responsable de la Scolarité', { align: 'right' });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/releve-notes/:etudiant_id
exports.releveNotesPDF = async (req, res) => exports.bulletinPDF(req, res);

// GET /export/liste-etudiants/:niveau_id
exports.listeEtudiantsPDF = async (req, res) => {
  try {
    const { niveau_id } = req.params;
    const { annee_universitaire_id, parcours_id } = req.query;

    const niveau = await Niveau.findByPk(niveau_id);
    const where = { niveau_id, actif: true };
    if (parcours_id) where.parcours_id = parcours_id;

    const etudiants = await Etudiant.findAll({
      where,
      include: [{ association: 'parcours' }],
      order: [['numero_etudiant', 'ASC']],
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=liste_etudiants_${niveau_id}.pdf`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('LISTE DES ÉTUDIANTS', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Niveau : ${niveau?.libelle || 'N/A'}`, { align: 'center' });
    if (annee_universitaire_id) {
      const annee = await AnneeUniversitaire.findByPk(annee_universitaire_id);
      doc.text(`Année : ${annee?.libelle || '-'}`, { align: 'center' });
    }
    doc.moveDown();

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Matricule', 50, doc.y, { width: 80 });
    doc.text('Nom & Prénoms', 140, doc.y - 9, { width: 220 });
    doc.text('Parcours', 380, doc.y - 9, { width: 150 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9);
    etudiants.forEach(etd => {
      if (doc.y > 750) doc.addPage();
      const y = doc.y;
      doc.text(etd.numero_etudiant, 50, y);
      doc.text(`${etd.nom} ${etd.prenom}`, 140, y, { width: 220 });
      doc.text(etd.parcours?.libelle || '-', 380, y, { width: 150 });
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/rapport-statistique/niveau/:niveau_id
exports.rapportStatistiqueNiveauPDF = async (req, res) => {
  try {
    const { niveau_id } = req.params;
    const { annee_universitaire_id } = req.query;
    const niveau = await Niveau.findByPk(niveau_id);

    const whereNote = annee_universitaire_id ? { annee_universitaire_id } : {};
    const notes = await Note.findAll({
      where: whereNote,
      include: [{
        association: 'etudiant',
        where: { niveau_id, actif: true },
        attributes: ['id'],
      }],
    });

    let total = 0, reussi = 0, rattrapage = 0, echec = 0;
    notes.forEach(n => {
      total++;
      const v = parseFloat(n.valeur);
      if (n.est_absent || isNaN(v)) { echec++; return; }
      if (v >= 10) reussi++;
      else { rattrapage++; }
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_stat_niveau_${niveau_id}.pdf`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('RAPPORT STATISTIQUE PAR NIVEAU', { align: 'center' });
    doc.fontSize(10).text(`Niveau : ${niveau?.libelle || 'N/A'}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Total notes évaluées : ${total}`);
    doc.text(`Réussite (≥ 10) : ${reussi} (${total > 0 ? Math.round(reussi / total * 100) : 0}%)`);
    doc.text(`Rattrapage (< 10) : ${rattrapage} (${total > 0 ? Math.round(rattrapage / total * 100) : 0}%)`);
    doc.text(`Échec / Absences : ${echec} (${total > 0 ? Math.round(echec / total * 100) : 0}%)`);

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

// GET /export/rapport-statistique/global
exports.rapportStatistiqueGlobalPDF = async (req, res) => {
  try {
    const { annee_universitaire_id } = req.query;
    const whereNote = annee_universitaire_id ? { annee_universitaire_id } : {};

    const notes = await Note.findAll({
      where: whereNote,
      include: [{ association: 'etudiant', attributes: ['id'], include: [{ association: 'niveau' }] }],
    });

    const parNiveau = {};
    notes.forEach(n => {
      const niv = n.etudiant?.niveau?.libelle || 'N/A';
      if (!parNiveau[niv]) parNiveau[niv] = { total: 0, reussi: 0 };
      parNiveau[niv].total++;
      const v = parseFloat(n.valeur);
      if (!n.est_absent && !isNaN(v) && v >= 10) parNiveau[niv].reussi++;
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_stat_global.pdf');
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('RAPPORT STATISTIQUE GLOBAL', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Niveau', 50, doc.y, { width: 100 });
    doc.text('Total', 200, doc.y - 9, { width: 80 });
    doc.text('Réussite', 300, doc.y - 9, { width: 80 });
    doc.text('Taux %', 420, doc.y - 9, { width: 80 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9);
    Object.entries(parNiveau).forEach(([niv, data]) => {
      const y = doc.y;
      const taux = data.total > 0 ? Math.round(data.reussi / data.total * 100) : 0;
      doc.text(niv, 50, y);
      doc.text(String(data.total), 200, y);
      doc.text(String(data.reussi), 300, y);
      doc.text(`${taux}%`, 420, y);
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};
