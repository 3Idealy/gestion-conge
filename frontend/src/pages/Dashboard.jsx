// ============================================================
// Dashboard.jsx — Version auditée & complète
// Corrections : KPIs manquants (rattrapage, notes manquantes,
// délibérations en attente), taux calculé côté front de façon
// cohérente, validations, sécurité XSS, messages d'erreur métier.
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Card, CardHeader, CardTitle, CardContent, StatCard, Skeleton, Badge, Button
} from '../components/ui';
import {
  Users, GraduationCap, Layers, FileText, BookOpen, Award, Clock,
  AlertTriangle, TrendingDown, TrendingUp, BarChart3,
  ArrowRight, Sparkles, Activity, Zap, ChevronRight, RefreshCw,
  Calendar, Trophy, AlertCircle, RotateCcw, BookMarked, ClipboardCheck
} from 'lucide-react';
import {
  etudiantApi, enseignantApi, moduleApi, matiereApi, noteApi,
  anneeApi, statsApi, deliberationApi
} from '../services/api';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// ── Constantes ────────────────────────────────────────────────
const MENTION_COLORS = {
  'Très Bien': '#059669',
  'Bien': '#2563eb',
  'Assez Bien': '#7c3aed',
  'Passable': '#d97706',
  'Insuffisant': '#dc2626',
};

const quickActions = [
  { label: 'Étudiants', icon: Users, path: '/etudiants', color: 'from-emerald-500 to-emerald-600', desc: 'Gérer les étudiants' },
  { label: 'Notes', icon: FileText, path: '/notes', color: 'from-blue-500 to-blue-600', desc: 'Saisir des notes' },
  { label: 'Modules', icon: Layers, path: '/modules-matieres', color: 'from-violet-500 to-violet-600', desc: 'Configurer les UE' },
  { label: 'Sessions', icon: Calendar, path: '/annees-sessions', color: 'from-amber-500 to-amber-600', desc: 'Années & Sessions' },
  { label: 'Délibérations', icon: ClipboardCheck, path: '/deliberation', color: 'from-rose-500 to-rose-600', desc: 'Jurys & PV' },
  { label: 'Rapports', icon: BookMarked, path: '/rapports', color: 'from-teal-500 to-teal-600', desc: 'Bulletins & PV' },
];

// ── Sanitize (XSS) ───────────────────────────────────────────
const sanitize = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

// ── Validation helpers ────────────────────────────────────────
const validateInteger = (val, fieldName, { min = 0, max = Infinity } = {}) => {
  const n = Number(val);
  if (!Number.isInteger(n)) throw new Error(`${fieldName} doit être un entier.`);
  if (n < min) throw new Error(`${fieldName} ne peut pas être inférieur à ${min}.`);
  if (n > max) throw new Error(`${fieldName} ne peut pas dépasser ${max}.`);
  return n;
};

const validateTaux = (admis, total) => {
  // RÈGLE MÉTIER : admis ne peut pas être > total
  if (admis > total) {
    console.warn(`[Dashboard] Incohérence : admis (${admis}) > total (${total}). Taux forcé à 0.`);
    return 0;
  }
  if (total === 0) return 0;
  return Math.round((admis / total) * 100);
};

// ── Composant AnimatedNumber ──────────────────────────────────
const AnimatedNumber = ({ value, loading }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading || value === 0) { setDisplay(0); return; }
    const end = Math.max(0, Math.floor(value)); // sécurité : jamais négatif
    const duration = 800;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, loading]);

  return <span className="number-reveal">{display.toLocaleString('fr-FR')}</span>;
};

// ── Composant AlertBanner ─────────────────────────────────────
const AlertBanner = ({ items }) => {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold
          ${item.level === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
            item.level === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {/* Texte sanitisé pour éviter XSS si message provient de l'API */}
          <span dangerouslySetInnerHTML={{ __html: sanitize(item.message) }} />
        </div>
      ))}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const [stats, setStats] = useState({
    etudiants: 0,
    enseignants: 0,
    modules: 0,
    matieres: 0,
    notes: 0,
    admis: 0,
    ajournes: 0,
    rattrapage: 0,   // ← AJOUT : étudiants en rattrapage
    notesManquantes: 0,   // ← AJOUT : notes non encore saisies
    delibsEnAttente: 0,   // ← AJOUT : délibérations à valider
  });

  const [tauxReussiteGlobal, setTauxReussiteGlobal] = useState(0);
  const [tauxRattrapageGlobal, setTauxRattrapageGlobal] = useState(0);
  const [anneeEnCours, setAnneeEnCours] = useState(null);
  const [topMatieres, setTopMatieres] = useState([]); // top matières difficiles

  useEffect(() => { loadDashboard(); }, []);

  const buildAlerts = useCallback((data) => {
    const list = [];
    // Notes manquantes
    if (data.notesManquantes > 0) {
      list.push({ level: 'warning', message: `${data.notesManquantes} note(s) manquante(s) à saisir.` });
    }
    // Délibérations en attente
    if (data.delibsEnAttente > 0) {
      list.push({ level: 'warning', message: `${data.delibsEnAttente} délibération(s) en attente de validation.` });
    }
    // Taux de réussite trop bas
    if (data.tauxReussite < 40 && data.etudiants > 0) {
      list.push({ level: 'error', message: `Taux de réussite global critique : ${data.tauxReussite}%.` });
    }
    return list;
  }, []);

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // ── Appels API en parallèle ──
      const [
        etudiants, enseignants, modules, matieres,
        notes, annees, tauxData, delibsData, echecsData
      ] = await Promise.all([
        etudiantApi.getAll().catch(() => ({ total: 0 })),
        enseignantApi.getAll().catch(() => []),
        moduleApi.getAll().catch(() => []),
        matiereApi.getAll().catch(() => []),
        noteApi.getAll().catch(() => []),
        anneeApi.getAll().catch(() => []),
        statsApi.tauxReussite().catch(() => ({ par_matiere: [] })),
        deliberationApi.getAll().catch(() => []),
        statsApi.analyseEchecs().catch(() => null),
      ]);

      // ── Année en cours ──
      const current = Array.isArray(annees) ? annees.find(a => a.en_cours) : null;
      setAnneeEnCours(current ?? null);

      // ── Calcul taux de réussite (cohérent) ──
      const allNotes = tauxData?.par_matiere ?? [];
      const totalNotes = allNotes.reduce((a, m) => a + (m.total ?? 0), 0);
      const totalAdmis = allNotes.reduce((a, m) => a + (m.reussi ?? 0), 0);
      const totalRatt = tauxData?.total_rattrapage ?? allNotes.reduce((a, m) => a + (m.rattrapage ?? 0), 0);

      // VALIDATION MÉTIER — admis + rattrapage ne peuvent pas dépasser total
      const taux = validateTaux(totalAdmis, totalNotes);
      const tauxRatt = validateTaux(totalRatt, totalNotes);
      const totalAjourne = Math.max(0, totalNotes - totalAdmis - totalRatt);

      // VALIDATION MÉTIER — notes ne doivent pas être < 0
      validateInteger(totalAdmis, 'totalAdmis', { min: 0 });
      validateInteger(totalAjourne, 'totalAjourne', { min: 0 });
      validateInteger(totalRatt, 'totalRatt', { min: 0 });

      setTauxReussiteGlobal(taux);
      setTauxRattrapageGlobal(tauxRatt);

      // ── Délibérations en attente (statut 'EN_ATTENTE' ou 'BROUILLON') ──
      const delibsList = Array.isArray(delibsData) ? delibsData : (delibsData?.rows ?? []);
      const delibsEnAttente = delibsList.filter(d => (d.statut || '').toLowerCase() === 'en_cours').length;

      // ── Notes manquantes ──
      const notesManquantes = tauxData?.notes_manquantes ?? 0;

      // ── Matières difficiles ──
      if (echecsData?.matieres_echecs?.length) {
        setTopMatieres(echecsData.matieres_echecs.slice(0, 3));
      }

      const newStats = {
        etudiants: etudiants?.total ?? 0,
        enseignants: Array.isArray(enseignants) ? enseignants.length : 0,
        modules: Array.isArray(modules) ? modules.length : 0,
        matieres: Array.isArray(matieres) ? matieres.length : 0,
        notes: Array.isArray(notes) ? notes.length : 0,
        admis: totalAdmis,
        ajournes: totalAjourne,
        rattrapage: totalRatt,
        notesManquantes: notesManquantes,
        delibsEnAttente: delibsEnAttente,
      };

      setStats(newStats);
      setAlerts(buildAlerts({ ...newStats, tauxReussite: taux }));

      if (isRefresh) toast.success('Données actualisées');
    } catch (err) {
      console.error('[Dashboard] loadDashboard error:', err);
      toast.error('Erreur lors du chargement du tableau de bord.');
      setAlerts([{ level: 'error', message: 'Impossible de charger les données. Réessayez.' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bienvenue';
    if (h < 18) return 'Bienvenue';
    return 'Bonsoir';
  };

  return (
    <div className="space-y-8 pb-10">

      {/* ── Bannière d'accueil ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-8 lg:p-10 text-white animate-fade-in shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Dashboard Académique</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">
              {greeting()}, {sanitize(user?.prenom ?? 'Administrateur')} 👋
            </h1>
            <p className="text-slate-300 text-sm font-medium max-w-xl leading-relaxed">
              Indicateurs clés de performance académique — année {anneeEnCours?.libelle ?? 'en cours'}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {anneeEnCours && (
              <Badge className="px-4 py-2 bg-white/10 text-white border-white/20 text-sm">
                {sanitize(anneeEnCours.libelle)}
              </Badge>
            )}
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              aria-label="Actualiser le tableau de bord"
              className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Alertes métier ── */}
      {alerts.length > 0 && <AlertBanner items={alerts} />}

      {/* ── KPI Grid (8 indicateurs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Étudiants"
          value={<AnimatedNumber value={stats.etudiants} loading={loading} />}
          icon={Users} color="primary" loading={loading}
        />
        <StatCard
          title="Étudiants Admis"
          value={<AnimatedNumber value={stats.admis} loading={loading} />}
          icon={GraduationCap} color="success" loading={loading}
        />
        <StatCard
          title="Étudiants Ajournés"
          value={<AnimatedNumber value={stats.ajournes} loading={loading} />}
          icon={TrendingDown} color="danger" loading={loading}
        />
        {/* ← AJOUT : Rattrapage */}
        <StatCard
          title="En Rattrapage"
          value={<AnimatedNumber value={stats.rattrapage} loading={loading} />}
          icon={RotateCcw} color="warning" loading={loading}
        />
        {/* Notes manquantes */}
        <StatCard
          title="Notes Manquantes"
          value={<AnimatedNumber value={stats.notesManquantes} loading={loading} />}
          icon={BookOpen}
          color={stats.notesManquantes > 0 ? 'warning' : 'success'}
          loading={loading}
        />
        {/* Délibérations en attente */}
        <StatCard
          title="Délibérations en attente"
          value={<AnimatedNumber value={stats.delibsEnAttente} loading={loading} />}
          icon={ClipboardCheck}
          color={stats.delibsEnAttente > 0 ? 'danger' : 'success'}
          loading={loading}
        />
        {/* Taux de réussite */}
        <StatCard
          title="Taux de Réussite"
          value={loading ? '…' : `${tauxReussiteGlobal}%`}
          icon={Activity}
          color="success"
          loading={loading}
        />
        {/* Taux de rattrapage */}
        <StatCard
          title="Taux de Rattrapage"
          value={loading ? '…' : `${tauxRattrapageGlobal}%`}
          icon={RotateCcw}
          color="warning"
          loading={loading}
        />
      </div>

      {/* ── Section principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Accès rapide */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Accès rapide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={i} to={action.path}
                  className="group flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{action.label}</h3>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>

          {/* Résumé académique */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none shadow-sm bg-blue-50/50">
              <CardContent className="p-6">
                <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Académique
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Modules</span>
                    <span className="font-bold text-blue-700">{loading ? <Skeleton className="w-6 h-4" /> : stats.modules}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Matières</span>
                    <span className="font-bold text-blue-700">{loading ? <Skeleton className="w-6 h-4" /> : stats.matieres}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Enseignants</span>
                    <span className="font-bold text-blue-700">{loading ? <Skeleton className="w-6 h-4" /> : stats.enseignants}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-emerald-50/50">
              <CardContent className="p-6">
                <h4 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Évaluation
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Total Notes</span>
                    <span className="font-bold text-emerald-700">{loading ? <Skeleton className="w-6 h-4" /> : stats.notes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Notes manquantes</span>
                    <span className={`font-bold ${stats.notesManquantes > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {loading ? <Skeleton className="w-6 h-4" /> : stats.notesManquantes}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Délibérations</span>
                    <span className={`font-bold ${stats.delibsEnAttente > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {loading ? <Skeleton className="w-6 h-4" /> : stats.delibsEnAttente > 0 ? `${stats.delibsEnAttente} en attente` : 'À jour ✓'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Matières difficiles + Alertes rapides */}
        <Card className="border-none shadow-xl bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" /> Points d'attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Matières à fort taux d'échec */}
            {topMatieres.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Matières difficiles</p>
                <div className="space-y-2">
                  {topMatieres.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[60%]">{sanitize(m.matiere)}</span>
                      <Badge variant="danger" className="text-[9px]">{m.taux_echec}% échec</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}