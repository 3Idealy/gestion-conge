// ============================================================
// Rapports.jsx — Version auditée & complète
// Ajouts : Relevé de notes, Rapport rattrapage, Rapport stats,
// validation champs obligatoires, messages d'erreur précis,
// sécurité XSS sur affichage données API, feedback UX amélioré.
// ============================================================
import { useState, useEffect } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, Button, Badge, Select
} from '../components/ui';
import {
  FileText, Users, Download, Printer, FileSpreadsheet, Eye,
  BookOpen, GraduationCap, Calendar, History, ClipboardList,
  Activity, BarChart3, RotateCcw, Award, AlertCircle, CheckCircle
} from 'lucide-react';
import {
  anneeApi, niveauApi, parcoursApi, etudiantApi,
  deliberationApi, exportApi, matiereApi
} from '../services/api';
import toast from 'react-hot-toast';

// ── Sanitize (XSS) ───────────────────────────────────────────
const sanitize = (str) =>
  String(str ?? '').replace(/[<>"'&]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' }[c])
  );

// ── Validation champs de sélection ───────────────────────────
const VALIDATORS = {
  annee_id: (v) => {
    if (!v || v === '') return "L'année universitaire est obligatoire.";
    if (isNaN(Number(v))) return "Identifiant d'année invalide.";
    return null;
  },
  niveau_id: (v) => {
    if (!v || v === '') return 'Veuillez sélectionner un niveau.';
    if (isNaN(Number(v))) return 'Identifiant de niveau invalide.';
    return null;
  },
  etudiant_id: (v) => {
    if (!v || v === '') return 'Veuillez sélectionner un étudiant.';
    if (isNaN(Number(v))) return 'Identifiant étudiant invalide.';
    return null;
  },
  deliberation_id: (v) => {
    if (!v || v === '') return 'Veuillez sélectionner une délibération.';
    return null;
  },
  matiere_id: (v) => {
    if (!v || v === '') return 'Veuillez sélectionner une matière.';
    return null;
  },
};

// SelectField : wrapper du composant Select de l'UI existante
const SelectField = ({ label, value, onChange, options, placeholder, disabled, required }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">
      {label}{required && <span className="text-rose-300 ml-1">*</span>}
    </label>
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder ?? 'Sélectionner...'}
      disabled={disabled}
      className="bg-white/10 text-white border-white/20"
    />
  </div>
);

// ── Composant principal ───────────────────────────────────────
export default function Rapports() {
  const [loading, setLoading] = useState(true);
  const [annees, setAnnees] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [parcours, setParcours] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [delibs, setDelibs] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [generating, setGenerating] = useState({}); // suivi de l'état par rapport

  const [selection, setSelection] = useState({
    annee_id: '',
    niveau_id: '',
    parcours_id: '',
    etudiant_id: '',
    deliberation_id: '',
    matiere_id: '',
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        anneeApi.getAll(),
        niveauApi.getAll(),
        parcoursApi.getAll(),
        etudiantApi.getAll(),
        deliberationApi.getAll(),
        matiereApi.getAll(),
      ]);

      const [anData, nivData, parcData, etData, delData, matData] =
        results.map(r => r.status === 'fulfilled' ? r.value : null);

      // VALIDATION : format de retour
      if (anData) setAnnees(Array.isArray(anData) ? anData : []);
      if (nivData) setNiveaux(Array.isArray(nivData) ? nivData : []);
      if (parcData) setParcours(Array.isArray(parcData) ? parcData : []);

      if (etData) {
        const list = etData.etudiants ?? etData.rows ?? (Array.isArray(etData) ? etData : []);
        // VALIDATION : numéro étudiant non vide, nom non vide
        setEtudiants(
          list.filter(e => e.id && (e.nom || e.prenom))
        );
      }

      if (delData) {
        const list = Array.isArray(delData) ? delData : (delData?.rows ?? []);
        // VALIDATION : date de délibération obligatoire
        setDelibs(list.filter(d => d.id && d.date_deliberation));
      }

      if (matData) {
        const list = Array.isArray(matData) ? matData : (matData?.rows ?? []);
        setMatieres(list.filter(m => m.id && m.libelle));
      }

      // Pré-sélection de l'année en cours
      if (anData) {
        const current = (Array.isArray(anData) ? anData : []).find(a => a.en_cours);
        if (current) setSelection(prev => ({ ...prev, annee_id: String(current.id) }));
      }

      // Avertissement si certains appels ont échoué
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        toast.error(`${failed.length} source(s) de données indisponible(s). Certains rapports peuvent être désactivés.`);
      }
    } catch (err) {
      console.error('[Rapports] loadInitialData:', err);
      toast.error('Erreur chargement des données de sélection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Téléchargement avec validation stricte ────────────────
  const handleDownload = async (reportKey, url, filename, requiredFields = []) => {
    // 1. Valider chaque champ requis
    for (const field of requiredFields) {
      const err = VALIDATORS[field]?.(selection[field]);
      if (err) { toast.error(err); return; }
    }

    // 2. Toujours injecter annee_id (obligatoire globalement)
    const anneeErr = VALIDATORS.annee_id(selection.annee_id);
    if (anneeErr && !requiredFields.includes('annee_id')) {
      toast.error(anneeErr); return;
    }

    setGenerating(prev => ({ ...prev, [reportKey]: true }));
    try {
      const fullUrl = (() => {
        let urlWithParams = url;
        const extra = [];
        if (selection.annee_id) extra.push(`annee_universitaire_id=${encodeURIComponent(selection.annee_id)}`);
        if (selection.parcours_id && !url.includes('parcours_id')) {
          extra.push(`parcours_id=${encodeURIComponent(selection.parcours_id)}`);
        }
        if (selection.niveau_id && url.includes('matiere') && !url.includes('niveau_id')) {
          extra.push(`niveau_id=${encodeURIComponent(selection.niveau_id)}`);
        }
        if (extra.length) {
          const sep = url.includes('?') ? '&' : '?';
          urlWithParams = `${url}${sep}${extra.join('&')}`;
        }
        return urlWithParams;
      })();

      toast.loading('Génération du document…', { id: `export-${reportKey}` });
      await exportApi.download(fullUrl, filename);
      toast.success('Document téléchargé avec succès.', { id: `export-${reportKey}` });
    } catch (err) {
      console.error(`[Rapports] download error (${reportKey}):`, err);
      const msg = err?.response?.status === 404
        ? 'Document introuvable. Vérifiez que les données sont bien saisies.'
        : err?.response?.status === 403
          ? 'Accès refusé. Vous n\'avez pas les droits pour ce rapport.'
          : 'Erreur lors du téléchargement. Réessayez ou contactez l\'administrateur.';
      toast.error(msg, { id: `export-${reportKey}` });
    } finally {
      setGenerating(prev => ({ ...prev, [reportKey]: false }));
    }
  };

  // ── Étudiants filtrés par niveau ─────────────────────────
  const etudiantsFiltres = etudiants.filter(e => {
    if (selection.niveau_id && String(e.niveau_id) !== selection.niveau_id) return false;
    if (selection.parcours_id && String(e.parcours_id) !== selection.parcours_id) return false;
    return true;
  });

  const delibsFiltrees = delibs.filter(d => {
    if (selection.niveau_id && String(d.niveau_id) !== selection.niveau_id) return false;
    if (selection.parcours_id && String(d.parcours_id) !== selection.parcours_id) return false;
    return true;
  });

  const matieresFiltrees = matieres.filter(m => {
    const modNiv = m.module?.niveau_id;
    const modParc = m.module?.parcours_id;
    if (selection.niveau_id && String(modNiv) !== selection.niveau_id) return false;
    if (selection.parcours_id && String(modParc) !== selection.parcours_id) return false;
    return true;
  });

  // ── Catégories de rapports ────────────────────────────────
  const REPORT_CATEGORIES = [
    {
      title: 'Documents Individuels',
      icon: Users,
      desc: 'Bulletins, relevés et certificats par étudiant',
      reports: [
        {
          key: 'bulletin',
          name: 'Bulletin de Notes',
          icon: FileText,
          action: () => handleDownload(
            'bulletin',
            `bulletin/${selection.etudiant_id}`,
            `bulletin_etudiant_${selection.etudiant_id}.pdf`,
            ['annee_id', 'etudiant_id']
          ),
          disabled: !selection.etudiant_id,
          disabledReason: 'Sélectionnez un étudiant',
          type: 'PDF',
        },
        // ← AJOUT : Relevé de notes
        {
          key: 'releve',
          name: 'Relevé de Notes',
          icon: BookOpen,
          action: () => handleDownload(
            'releve',
            `releve-notes/${selection.etudiant_id}`,
            `releve_notes_${selection.etudiant_id}.pdf`,
            ['annee_id', 'etudiant_id']
          ),
          disabled: !selection.etudiant_id,
          disabledReason: 'Sélectionnez un étudiant',
          type: 'PDF',
        },
        {
          key: 'certificat',
          name: 'Certificat de Scolarité',
          icon: ClipboardList,
          action: () => handleDownload(
            'certificat',
            `certificat-scolarite/${selection.etudiant_id}`,
            `certificat_scolarite_${selection.etudiant_id}.pdf`,
            ['annee_id', 'etudiant_id']
          ),
          disabled: !selection.etudiant_id,
          disabledReason: 'Sélectionnez un étudiant',
          type: 'PDF',
        },
      ],
    },
    {
      title: 'Résultats Globaux',
      icon: FileSpreadsheet,
      desc: 'Récapitulatifs par niveau — admission et absences',
      reports: [
        {
          key: 'recap-notes',
          name: 'Récapitulatif Global des Notes',
          icon: FileText,
          action: () => handleDownload(
            'recap-notes',
            `recap-notes-niveau/${selection.niveau_id}`,
            `recap_notes_niveau_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
        {
          key: 'admis',
          name: 'Liste des Étudiants ADMIS',
          icon: GraduationCap,
          action: () => handleDownload(
            'admis',
            `rapport-admission/${selection.niveau_id}?statut=ADMIS`,
            `rapport_admis_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
        {
          key: 'ajournes',
          name: 'Liste des Étudiants AJOURNÉS',
          icon: History,
          action: () => handleDownload(
            'ajournes',
            `rapport-admission/${selection.niveau_id}?statut=AJOURNE`,
            `rapport_ajournes_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
        // ← AJOUT : Rapport Rattrapage
        {
          key: 'rattrapage',
          name: 'Liste des Étudiants en RATTRAPAGE',
          icon: RotateCcw,
          action: () => handleDownload(
            'rattrapage',
            `rapport-admission/${selection.niveau_id}?statut=RATTRAPAGE`,
            `rapport_rattrapage_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
        {
          key: 'absences',
          name: 'Rapport des Absences aux Examens',
          icon: Activity,
          action: () => handleDownload(
            'absences',
            `rapport-absences/${selection.niveau_id}`,
            `rapport_absences_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
        {
          key: 'pv-matiere',
          name: 'PV de Notes par Matière',
          icon: BookOpen,
          action: () => handleDownload(
            'pv-matiere',
            `rapport-matiere/${selection.matiere_id}`,
            `pv_matiere_${selection.matiere_id}.pdf`,
            ['annee_id', 'matiere_id']
          ),
          disabled: !selection.matiere_id,
          disabledReason: 'Sélectionnez une matière',
          type: 'PDF',
        },
        // ← AJOUT : Liste globale étudiants
        {
          key: 'liste-etudiants',
          name: 'Liste Complète des Étudiants',
          icon: Users,
          action: () => handleDownload(
            'liste-etudiants',
            `liste-etudiants/${selection.niveau_id}`,
            `liste_etudiants_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
      ],
    },
    {
      title: 'Jurys & Délibérations',
      icon: ClipboardList,
      desc: 'Procès-verbaux et documents officiels de jury',
      reports: [
        {
          key: 'pv-delib',
          name: 'Procès-Verbal de Délibération',
          icon: FileText,
          action: () => handleDownload(
            'pv-delib',
            `pv-deliberation/${selection.deliberation_id}`,
            `pv_deliberation_${selection.deliberation_id}.pdf`,
            ['annee_id', 'deliberation_id']
          ),
          disabled: !selection.deliberation_id,
          disabledReason: 'Sélectionnez une délibération',
          type: 'PDF',
        },
      ],
    },
    // ← AJOUT : Rapport Statistique
    {
      title: 'Rapports Statistiques',
      icon: BarChart3,
      desc: 'Synthèse analytique par niveau et année',
      reports: [
        {
          key: 'rapport-stat-niveau',
          name: 'Rapport Statistique par Niveau',
          icon: BarChart3,
          action: () => handleDownload(
            'rapport-stat-niveau',
            `rapport-statistique/niveau/${selection.niveau_id}`,
            `rapport_stat_niveau_${selection.niveau_id}.pdf`,
            ['annee_id', 'niveau_id']
          ),
          disabled: !selection.niveau_id,
          disabledReason: 'Sélectionnez un niveau',
          type: 'PDF',
        },
        {
          key: 'rapport-stat-global',
          name: 'Rapport Statistique Global',
          icon: Award,
          action: () => handleDownload(
            'rapport-stat-global',
            'rapport-statistique/global',
            `rapport_stat_global.pdf`,
            ['annee_id']
          ),
          disabled: !selection.annee_id,
          disabledReason: 'Sélectionnez une année',
          type: 'PDF',
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Module de Rapports</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Génération des documents officiels universitaires — sélectionnez le contexte avant de télécharger.
        </p>
      </div>

      {/* ── Contexte de sélection ── */}
      <Card className="shadow-xl border border-slate-200 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-8">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-600 rounded-xl shadow-md">
              <Calendar className="w-6 h-6 text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Contexte d'Impression
              </h2>

              <p className="text-sm text-slate-500">
                Les champs marqués
                <span className="text-red-500 font-semibold ml-1">*</span>
                sont obligatoires pour générer un rapport.
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            <SelectField
              label="Année Universitaire"
              value={selection.annee_id}
              onChange={(e) =>
                setSelection({
                  ...selection,
                  annee_id: e.target.value,
                })
              }
              options={annees.map((a) => ({
                value: String(a.id),
                label: `${a.libelle}${a.en_cours ? " (En cours)" : ""}`,
              }))}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Niveau
              </label>

              <SelectField
                value={selection.niveau_id}
                onChange={e =>
                  setSelection({
                    ...selection,
                    niveau_id: e.target.value,
                    etudiant_id: '',
                    deliberation_id: '',
                    matiere_id: '',
                  })
                }
                options={niveaux.map(n => ({
                  value: String(n.id),
                  label: n.libelle,
                }))}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Parcours
              </label>
              <SelectField

                value={selection.parcours_id}
                onChange={(e) =>
                  setSelection({
                    ...selection,
                    parcours_id: e.target.value,
                  })
                }
                options={parcours.map((p) => ({
                  value: String(p.id),
                  label: p.libelle,
                }))}
                placeholder="Tous les parcours"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Etudiant
              </label>
              <SelectField
                label="Étudiant"
                value={selection.etudiant_id}
                onChange={(e) =>
                  setSelection({
                    ...selection,
                    etudiant_id: e.target.value,
                  })
                }
                options={etudiantsFiltres.map((e) => ({
                  value: String(e.id),
                  label: `${sanitize(
                    e.numero_etudiant ?? ""
                  )} — ${sanitize(e.nom)} ${sanitize(e.prenom)}`,
                }))}
                placeholder={
                  selection.niveau_id
                    ? "Sélectionner..."
                    : "Choisissez d'abord un niveau"
                }
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Deliberation
              </label>
              <SelectField

                value={selection.deliberation_id}
                onChange={(e) =>
                  setSelection({
                    ...selection,
                    deliberation_id: e.target.value,
                  })
                }
                options={delibsFiltrees.map((d) => ({
                  value: String(d.id),
                  label: `Délib #${d.id} — ${new Date(
                    d.date_deliberation
                  ).toLocaleDateString("fr-FR")} (${sanitize(
                    d.statut ?? "N/A"
                  )})`,
                }))}
                placeholder="Sélectionner..."
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Matiere
              </label>
              <SelectField

                value={selection.matiere_id}
                onChange={(e) =>
                  setSelection({
                    ...selection,
                    matiere_id: e.target.value,
                  })
                }
                options={matieresFiltrees.map((m) => ({
                  value: String(m.id),
                  label: `${m.code} — ${m.libelle}`,
                }))}
                placeholder="Sélectionner..."
                disabled={loading}
              />
            </div>
          </div>
          {/* Résumé */}
          <div className="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">

            <div className="flex flex-wrap gap-3 items-center">

              <span className="text-xs font-bold uppercase text-slate-500">
                Sélection active :
              </span>

              {selection.annee_id ? (
                <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                  {
                    annees.find(
                      (a) => String(a.id) === String(selection.annee_id)
                    )?.libelle
                  }
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border border-red-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Aucune année sélectionnée
                </Badge>
              )}

              {selection.niveau_id && (
                <Badge className="bg-violet-100 text-violet-800 border border-violet-300">
                  Niveau :
                  {" "}
                  {
                    niveaux.find(
                      (n) => String(n.id) === String(selection.niveau_id)
                    )?.libelle || "Non trouvé"
                  }
                </Badge>
              )}

              {selection.parcours_id && (
                <Badge className="bg-cyan-100 text-cyan-800 border border-cyan-300">
                  Parcours :
                  {" "}
                  {
                    parcours.find(
                      (p) => String(p.id) === String(selection.parcours_id)
                    )?.libelle || "Non trouvé"
                  }
                </Badge>
              )}

              {selection.etudiant_id && (
                <Badge className="bg-green-100 text-green-800 border border-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Étudiant sélectionné
                </Badge>
              )}

              {selection.deliberation_id && (
                <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                  Délibération sélectionnée
                </Badge>
              )}

              {selection.matiere_id && (
                <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                  Matière sélectionnée
                </Badge>
              )}

            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Grille des rapports ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {REPORT_CATEGORIES.map((cat, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <cat.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{cat.title}</h3>
                <p className="text-xs text-slate-500">{cat.desc}</p>
              </div>
            </div>

            <div className="space-y-2">
              {cat.reports.map((rep, j) => {
                const isGenerating = generating[rep.key];
                return (
                  <Card
                    key={j}
                    className={`group transition-all border-l-4 ${rep.disabled
                      ? 'opacity-50 cursor-not-allowed border-l-slate-200'
                      : isGenerating
                        ? 'border-l-blue-300 bg-blue-50/30'
                        : 'hover:shadow-md hover:border-l-blue-500 border-l-transparent'
                      }`}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <rep.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${rep.disabled ? 'text-slate-300' : 'text-slate-400 group-hover:text-blue-500'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{rep.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={rep.type === 'PDF' ? 'primary' : 'secondary'} className="text-[9px]">
                              {rep.type}
                            </Badge>
                            {rep.disabled && rep.disabledReason && (
                              <span className="text-[9px] text-slate-400 italic">{rep.disabledReason}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={rep.disabled ? 'ghost' : 'ghost'}
                        size="sm"
                        onClick={rep.disabled ? undefined : rep.action}
                        disabled={rep.disabled || isGenerating}
                        aria-label={`Télécharger : ${rep.name}`}
                        className={`flex-shrink-0 ${rep.disabled ? 'cursor-not-allowed' :
                          isGenerating ? 'text-blue-500 animate-pulse' :
                            'text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        {isGenerating
                          ? <span className="text-[10px] font-bold">...</span>
                          : <Download className="w-4 h-4" />
                        }
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Note légale ── */}
      <p className="text-[10px] text-center text-slate-400">
        Tous les documents générés sont des documents officiels. Toute modification manuelle engage la responsabilité de l'utilisateur.
        Les exports sont tracés dans le journal d'activité.
      </p>
    </div>
  );
}