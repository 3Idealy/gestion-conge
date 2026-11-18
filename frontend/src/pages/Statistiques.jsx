// ============================================================
// Statistiques.jsx — Version auditée & complète
// Corrections : évolution annuelle ajoutée, taux rattrapage,
// validation données, sécurité XSS, cohérence calculs.
// Filtres déplacés au-dessus du classement d'excellence.
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, Skeleton, Badge, Button
} from '../components/ui';
import {
  TrendingDown, TrendingUp, BarChart3, PieChart as PieChartIcon,
  Zap, RefreshCw, Trophy, AlertCircle, Activity, Target,
  Layers, Calendar, RotateCcw, TrendingUp as Evolution
} from 'lucide-react';
import { statsApi, anneeApi, niveauApi, parcoursApi } from '../services/api';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, PieChart, Pie, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import toast from 'react-hot-toast';

// ── Couleurs ──────────────────────────────────────────────────
const LEVEL_COLORS = {
  'L1': '#10b981',
  'L2': '#3b82f6',
  'L3': '#8b5cf6',
  'M1': '#f59e0b',
  'M2': '#ec4899',
};

const MENTION_COLORS = {
  'Très Bien': '#064e3b',
  'Bien': '#059669',
  'Assez Bien': '#10b981',
  'Passable': '#6ee7b7',
  'Insuffisant': '#fca5a5',
};

function getShadedColor(baseColor, mention) {
  const map = {
    [LEVEL_COLORS['L1']]: { 'Très Bien': '#064e3b', 'Bien': '#059669', 'Assez Bien': '#10b981', 'Passable': '#6ee7b7', 'Insuffisant': '#d1fae5' },
    [LEVEL_COLORS['L2']]: { 'Très Bien': '#1e3a8a', 'Bien': '#1d4ed8', 'Assez Bien': '#3b82f6', 'Passable': '#93c5fd', 'Insuffisant': '#dbeafe' },
    [LEVEL_COLORS['L3']]: { 'Très Bien': '#4c1d95', 'Bien': '#6d28d9', 'Assez Bien': '#8b5cf6', 'Passable': '#c4b5fd', 'Insuffisant': '#ede9fe' },
    [LEVEL_COLORS['M1']]: { 'Très Bien': '#78350f', 'Bien': '#b45309', 'Assez Bien': '#f59e0b', 'Passable': '#fcd34d', 'Insuffisant': '#fef3c7' },
    [LEVEL_COLORS['M2']]: { 'Très Bien': '#831843', 'Bien': '#be185d', 'Assez Bien': '#ec4899', 'Passable': '#f9a8d4', 'Insuffisant': '#fce7f3' },
  };
  return map[baseColor]?.[mention] ?? baseColor;
}

// ── Sanitize (XSS) ───────────────────────────────────────────
const sanitize = (str) =>
  String(str ?? '').replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' }[c]));

// ── Validation helpers ────────────────────────────────────────
const safePct = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
};

const safeMoyenne = (val) => {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0 || n > 20) return null;
  return n.toFixed(2);
};

// ── Tooltip personnalisé ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl shadow-xl bg-white border border-slate-200 text-xs">
      <p className="font-bold text-slate-800 mb-2">{sanitize(label)}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
          <span className="font-semibold text-slate-500">{sanitize(p.name)}:</span>
          <span className="font-bold text-slate-800">
            {typeof p.value === 'number' && p.name?.includes('%') ? `${p.value}%` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────
export default function Statistiques() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mentionsByNP, setMentionsByNP] = useState([]);
  const [echecData, setEchecData] = useState(null);
  const [tauxReussiteData, setTauxReussiteData] = useState(null);
  const [classementData, setClassementData] = useState([]);
  const [evolutionData, setEvolutionData] = useState([]);
  const [tauxRattrapageParNiveau, setTauxRattrapageParNiveau] = useState([]);

  // Filtres globaux (graphiques du haut)
  const [annees, setAnnees] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [parcours, setParcours] = useState([]);

  // Filtres séparés pour le classement
  const [classementAnneeId, setClassementAnneeId] = useState('');
  const [classementNiveauIds, setClassementNiveauIds] = useState([]);
  const [classementParcoursIds, setClassementParcoursIds] = useState([]);
  const [classementLoading, setClassementLoading] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [anData, nivData, parcData] = await Promise.all([
        anneeApi.getAll(),
        niveauApi.getAll(),
        parcoursApi.getAll(),
      ]);

      if (!Array.isArray(anData)) throw new Error('Format années invalide');
      if (!Array.isArray(nivData)) throw new Error('Format niveaux invalide');

      setAnnees(anData);
      setNiveaux(nivData);
      setParcours(Array.isArray(parcData) ? parcData : []);

      const current = anData.find(a => a.en_cours);
      const defaultAnneeId = current ? String(current.id) : '';
      setClassementAnneeId(defaultAnneeId);

      // Charge les stats globales (sans filtres) + classement initial
      await Promise.all([
        loadStats(false, {}),
        loadClassement(false, { annee_universitaire_id: defaultAnneeId }),
      ]);
    } catch (err) {
      console.error('[Statistiques] loadInitialData:', err);
      toast.error('Erreur chargement des filtres.');
    }
  };

  // ── Chargement stats globales (graphiques du haut) ─────────
  const loadStats = async (isRefresh = false, params = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [mentionsData, echecsData, tauxData] = await Promise.all([
        statsApi.mentionsParNiveauParcours(params).catch(() => []),
        statsApi.analyseEchecs(params).catch(() => null),
        statsApi.tauxReussite(params).catch(() => null),
      ]);

      const evolutionRes = typeof statsApi.evolutionAnnuelle === 'function'
        ? await statsApi.evolutionAnnuelle(params).catch(() => [])
        : [];
      const rattrapageRes = typeof statsApi.tauxRattrapageParNiveau === 'function'
        ? await statsApi.tauxRattrapageParNiveau(params).catch(() => [])
        : [];

      const validMentions = (Array.isArray(mentionsData) ? mentionsData : []).map(d => ({
        ...d,
        'Très Bien': Math.max(0, d['Très Bien'] ?? 0),
        'Bien': Math.max(0, d['Bien'] ?? 0),
        'Assez Bien': Math.max(0, d['Assez Bien'] ?? 0),
        'Passable': Math.max(0, d['Passable'] ?? 0),
        'Insuffisant': Math.max(0, d['Insuffisant'] ?? 0),
      }));

      const validEvolution = (Array.isArray(evolutionRes) ? evolutionRes : []).map(e => ({
        ...e,
        taux_reussite: safePct(e.taux_reussite),
        taux_echec: safePct(e.taux_echec),
        taux_rattrapage: safePct(e.taux_rattrapage),
      }));

      setMentionsByNP(validMentions);
      setEchecData(echecsData);
      setTauxReussiteData(tauxData);
      setEvolutionData(validEvolution);
      setTauxRattrapageParNiveau(Array.isArray(rattrapageRes) ? rattrapageRes : []);

      if (isRefresh) toast.success('Données actualisées');
    } catch (err) {
      console.error('[Statistiques] loadStats:', err);
      toast.error('Erreur lors du chargement des statistiques.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Chargement classement avec ses propres filtres ──────────
  const loadClassement = async (isRefresh = false, overrideParams = null) => {
    setClassementLoading(true);
    try {
      const params = overrideParams ?? {};
      if (!overrideParams) {
        if (classementAnneeId) params.annee_universitaire_id = classementAnneeId;
        if (classementNiveauIds.length) params.niveau_ids = classementNiveauIds.join(',');
        if (classementParcoursIds.length) params.parcours_ids = classementParcoursIds.join(',');
      }

      const rankingData = await statsApi.classement(params).catch(() => []);
      const validRanking = (Array.isArray(rankingData) ? rankingData : [])
        .filter(e => safeMoyenne(e.moyenne) !== null)
        .slice(0, 20);

      setClassementData(validRanking);
      if (isRefresh) toast.success('Classement actualisé');
    } catch (err) {
      console.error('[Statistiques] loadClassement:', err);
      toast.error('Erreur lors du chargement du classement.');
    } finally {
      setClassementLoading(false);
    }
  };

  // Recharge le classement à chaque changement de filtre classement
  useEffect(() => {
    loadClassement();
  }, [classementAnneeId, classementNiveauIds, classementParcoursIds]);

  const toggleClassementFilter = (key, id) => {
    const strId = String(id);
    if (key === 'niveau_ids') {
      setClassementNiveauIds(prev =>
        prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
      );
    } else if (key === 'parcours_ids') {
      setClassementParcoursIds(prev =>
        prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
      );
    }
  };

  // ── Agrégation pie chart mentions ────────────────────────────
  const mentionPieData = useMemo(() => {
    if (!mentionsByNP.length) return [];
    const totals = { 'Très Bien': 0, 'Bien': 0, 'Assez Bien': 0, 'Passable': 0, 'Insuffisant': 0 };
    mentionsByNP.forEach(d => {
      Object.keys(totals).forEach(k => { totals[k] += (d[k] ?? 0); });
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        pct: Math.round((value / total) * 100),
        color: MENTION_COLORS[name] ?? '#94a3b8',
      }));
  }, [mentionsByNP]);

  const mentionCoherenceWarning = useMemo(() => {
    return mentionsByNP.some(d => {
      const sum = ['Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant'].reduce((a, k) => a + (d[k] ?? 0), 0);
      return d.total && Math.abs(sum - d.total) > 1;
    });
  }, [mentionsByNP]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Statistiques Académiques</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Analyse des performances par promotion, filière et année</p>
        </div>
        <Button onClick={() => loadStats(true, {})} disabled={refreshing} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* ── Alerte cohérence ── */}
      {mentionCoherenceWarning && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Incohérence détectée : le total des mentions ne correspond pas au total déclaré pour certains niveaux. Vérifiez les données sources.
        </div>
      )}

      {/* ── Ligne 1 : Mentions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barres empilées par promotion */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Répartition des Mentions par Promotion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-80 w-full" /> : mentionsByNP.length === 0 ? (
              <p className="text-center text-slate-400 py-16">Aucune donnée pour cette sélection.</p>
            ) : (
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mentionsByNP.map(d => ({ ...d, label: `${sanitize(d.niveau)} - ${sanitize(d.parcours)}` }))}
                    margin={{ bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    {['Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant'].map(mention => (
                      <Bar key={mention} dataKey={mention} stackId="a">
                        {mentionsByNP.map((entry, i) => (
                          <Cell key={i} fill={getShadedColor(LEVEL_COLORS[entry.niveau] ?? '#94a3b8', mention)} />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie global mentions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-500" /> Répartition Globale
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loading ? <Skeleton className="h-64 w-64 rounded-full" /> : mentionPieData.length === 0 ? (
              <p className="text-center text-slate-400 py-10">Aucune donnée.</p>
            ) : (
              <>
                <div style={{ height: 280, width: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={mentionPieData} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90} paddingAngle={2}
                        dataKey="value" stroke="none"
                      >
                        {mentionPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
                  {mentionPieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs font-bold text-slate-600 truncate">
                        {d.name} : {d.value} <span className="text-slate-400">({d.pct}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Ligne 2 : Échecs & Taux de réussite ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analyse échecs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" /> Analyse des Échecs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? <Skeleton className="h-80 w-full" /> : echecData ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total', value: echecData.totaux?.total_etudiants, color: 'slate' },
                    { label: 'Rattrapage', value: echecData.totaux?.en_rattrapage, color: 'orange' },
                    { label: 'Risque redoublement', value: echecData.totaux?.a_risque_redoublement, color: 'rose' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`p-4 rounded-2xl bg-${color}-50 border border-${color}-100 text-center`}>
                      <p className={`text-2xl font-black text-${color}-${color === 'slate' ? '800' : '600'}`}>
                        {value ?? '—'}
                      </p>
                      <p className={`text-[10px] font-bold text-${color}-500 uppercase mt-1`}>{label}</p>
                    </div>
                  ))}
                </div>
                {echecData.matieres_echecs?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Matières les plus difficiles</h4>
                    <div className="space-y-2">
                      {echecData.matieres_echecs.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                          <span className="text-sm font-bold text-slate-700">{sanitize(m.matiere)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${safePct(m.taux_echec)}%` }} />
                            </div>
                            <Badge variant="danger">{safePct(m.taux_echec)}% échec</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : <p className="text-center text-slate-400 py-10">Données indisponibles.</p>}
          </CardContent>
        </Card>

        {/* Taux de réussite par filière */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <Target className="w-5 h-5" /> Taux de Réussite par Filière
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-80 w-full" /> : tauxReussiteData?.par_filiere?.length ? (
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tauxReussiteData.par_filiere} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis dataKey="filiere" type="category" width={110} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Taux']} />
                    <Bar dataKey="taux" radius={[0, 4, 4, 0]} barSize={20}>
                      {tauxReussiteData.par_filiere.map((e, i) => (
                        <Cell key={i} fill={safePct(e.taux) >= 70 ? '#10b981' : safePct(e.taux) >= 40 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-400 py-10">Données indisponibles.</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Taux de rattrapage par niveau ── */}
      {tauxRattrapageParNiveau.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <RotateCcw className="w-5 h-5" /> Taux de Rattrapage par Niveau
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tauxRattrapageParNiveau}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="niveau" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Rattrapage']} />
                    <Bar dataKey="taux_rattrapage" radius={[4, 4, 0, 0]} barSize={36}>
                      {tauxRattrapageParNiveau.map((e, i) => (
                        <Cell key={i} fill={LEVEL_COLORS[e.niveau] ?? '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Évolution annuelle ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Evolution className="w-5 h-5" /> Évolution Annuelle des Taux
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-64 w-full" /> : evolutionData.length === 0 ? (
            <p className="text-center text-slate-400 py-10">Données d'évolution indisponibles.</p>
          ) : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData} margin={{ left: 0, right: 0 }}>
                  <defs>
                    <linearGradient id="gradReussite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRattrapage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEchec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} formatter={(v, n) => [`${v}%`, n]} />
                  <Legend />
                  <Area type="monotone" dataKey="taux_reussite" name="Réussite (%)" stroke="#10b981" fill="url(#gradReussite)" strokeWidth={2} dot />
                  <Area type="monotone" dataKey="taux_rattrapage" name="Rattrapage (%)" stroke="#f59e0b" fill="url(#gradRattrapage)" strokeWidth={2} dot />
                  <Area type="monotone" dataKey="taux_echec" name="Échec (%)" stroke="#ef4444" fill="url(#gradEchec)" strokeWidth={2} dot />
                </AreaChart>
              </ResponsiveContainer>
              {evolutionData.some(e => Math.abs((e.taux_reussite ?? 0) + (e.taux_rattrapage ?? 0) + (e.taux_echec ?? 0) - 100) > 5) && (
                <p className="text-[10px] text-amber-500 mt-2 text-center">
                  ⚠ Les taux annuels ne somment pas à 100% sur certaines années — vérifiez les données API.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Filtres du Classement (juste au-dessus) ── */}
      <Card className="border-t-4 border-t-amber-500 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Filtres du Classement d'Excellence
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Année */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Année
              </label>
              <select
                value={classementAnneeId}
                onChange={e => setClassementAnneeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Toutes les années</option>
                {annees.map(a => (
                  <option key={a.id} value={a.id}>
                    {sanitize(a.libelle)} {a.en_cours ? '(En cours)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Niveaux */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Niveaux
              </label>
              <div className="flex flex-wrap gap-2">
                {niveaux.map(n => (
                  <button
                    key={n.id}
                    onClick={() => toggleClassementFilter('niveau_ids', n.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                      ${classementNiveauIds.includes(String(n.id))
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {sanitize(n.libelle)}
                  </button>
                ))}
              </div>
            </div>
            {/* Parcours */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Parcours
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {parcours.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleClassementFilter('parcours_ids', p.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all
                      ${classementParcoursIds.includes(String(p.id))
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {sanitize(p.libelle)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Classement d'Excellence ── */}
      <Card className="shadow-lg border-none overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg"><Trophy className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-xl font-bold">Classement d'Excellence</h2>
                <p className="text-slate-400 text-sm">Les 20 meilleurs étudiants — moyenne sur 20</p>
              </div>
            </div>
            <Button
              onClick={() => loadClassement(true)}
              disabled={classementLoading}
              variant="outline"
              size="sm"
              className="gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-slate-400"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${classementLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {classementLoading ? (
            <div className="p-10 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : classementData.length === 0 ? (
            <p className="text-center text-slate-400 py-20 font-bold">Aucune donnée pour cette sélection.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <th className="px-6 py-4 text-center">Rang</th>
                    <th className="px-6 py-4 text-left">Étudiant</th>
                    <th className="px-6 py-4 text-left">Niveau / Parcours</th>
                    <th className="px-6 py-4 text-center">Moyenne /20</th>
                    <th className="px-6 py-4 text-center">Mention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classementData.map((etd, i) => {
                    const moy = parseFloat(etd.moyenne);
                    const mention =
                      moy >= 16 ? 'Très Bien' :
                        moy >= 14 ? 'Bien' :
                          moy >= 12 ? 'Assez Bien' :
                            moy >= 10 ? 'Passable' : 'Insuffisant';
                    return (
                      <tr key={etd.id ?? i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-black
                            ${i === 0 ? 'bg-amber-100 text-amber-700' :
                              i === 1 ? 'bg-slate-200 text-slate-700' :
                                i === 2 ? 'bg-orange-100 text-orange-700' :
                                  'text-slate-400'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {sanitize(etd.nom)} {sanitize(etd.prenom)}
                          <br /><span className="text-[10px] text-slate-400">{sanitize(etd.numero_etudiant)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">{sanitize(etd.niveau)}</Badge>{' '}
                          <Badge variant="secondary">{sanitize(etd.parcours)}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-lg font-black ${moy >= 14 ? 'text-emerald-600' : moy >= 10 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {safeMoyenne(etd.moyenne) ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge style={{ backgroundColor: MENTION_COLORS[mention] + '22', color: MENTION_COLORS[mention] }}>
                            {mention}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}