import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { Plus, Pencil, Trash2, CalendarDays, Loader2, Calendar, Lock, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { anneeApi, sessionApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AnneesSession() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [annees, setAnnees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [anneesVides, setAnneesVides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Années Modal
  const [anneeModalOpen, setAnneeModalOpen] = useState(false);
  const [anneeConfirmOpen, setAnneeConfirmOpen] = useState(false);
  const [editingAnnee, setEditingAnnee] = useState(null);
  const [deletingAnneeId, setDeletingAnneeId] = useState(null);
  const [savingAnnee, setSavingAnnee] = useState(false);
  const [anneeForm, setAnneeForm] = useState({ libelle: '', annee_debut: '', annee_fin: '', en_cours: false });

  // Sessions Modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionConfirmOpen, setSessionConfirmOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ libelle: '', type_session: 'Normale', date_debut: '', date_fin: '', annee_universitaire_id: '' });

  // Promotion Workflow
  const [promoStage, setPromoStage] = useState(null); // 'confirm_close', 'select_new', 'create_new', 'password_verify'
  const [newYearId, setNewYearId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [closedAnneeId, setClosedAnneeId] = useState(null);
  const [processingPromo, setProcessingPromo] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [anData, sesData, emptyData] = await Promise.all([
        anneeApi.getAll(), 
        sessionApi.getAll(),
        anneeApi.getVides()
      ]);
      setAnnees(anData || []); 
      setSessions(sesData || []);
      setAnneesVides(emptyData || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const anneeEnCours = annees.find(a => a.en_cours);

  // ── ANNEES ────────
  const openAddAnnee = () => { setEditingAnnee(null); setAnneeForm({ libelle: '', annee_debut: '', annee_fin: '', en_cours: false }); setAnneeModalOpen(true); };
  const openEditAnnee = (a) => { setEditingAnnee(a); setAnneeForm({ libelle: a.libelle, annee_debut: String(a.annee_debut), annee_fin: String(a.annee_fin), en_cours: a.en_cours }); setAnneeModalOpen(true); };

  const handleAnneeSubmit = async (e) => {
    e.preventDefault(); setSavingAnnee(true);
    try {
      const payload = { ...anneeForm, annee_debut: parseInt(anneeForm.annee_debut), annee_fin: parseInt(anneeForm.annee_fin) };
      if (editingAnnee) { await anneeApi.update(editingAnnee.id, payload); toast.success('Année modifiée'); }
      else { await anneeApi.create(payload); toast.success('Année ajoutée'); }
      setAnneeModalOpen(false); loadData();
    } catch { toast.error('Erreur de sauvegarde'); }
    finally { setSavingAnnee(false); }
  };
  const confirmDeleteAnnee = async () => { try { await anneeApi.delete(deletingAnneeId); toast.success('Supprimée'); loadData(); } catch { toast.error('Erreur'); } finally { setAnneeConfirmOpen(false); } };

  // ── SESSIONS ────────
  const openAddSession = () => { setEditingSession(null); setSessionForm({ libelle: '', type_session: 'Normale', date_debut: '', date_fin: '', annee_universitaire_id: anneeEnCours?.id ? String(anneeEnCours.id) : '' }); setSessionModalOpen(true); };
  const openEditSession = (s) => { setEditingSession(s); setSessionForm({ libelle: s.libelle, type_session: s.type_session, date_debut: s.date_debut || '', date_fin: s.date_fin || '', annee_universitaire_id: String(s.annee_universitaire_id) }); setSessionModalOpen(true); };

  const handleSessionSubmit = async (e) => {
    e.preventDefault(); setSavingSession(true);
    try {
      const payload = { ...sessionForm, annee_universitaire_id: parseInt(sessionForm.annee_universitaire_id) };
      if (editingSession) { await sessionApi.update(editingSession.id, payload); toast.success('Session modifiée'); }
      else { await sessionApi.create(payload); toast.success('Session ajoutée'); }
      setSessionModalOpen(false); loadData();
    } catch { toast.error('Erreur de sauvegarde'); }
    finally { setSavingSession(false); }
  };
  const confirmDeleteSession = async () => { try { await sessionApi.delete(deletingSessionId); toast.success('Supprimée'); loadData(); } catch { toast.error('Erreur'); } finally { setSessionConfirmOpen(false); } };

  // ── PROMOTION WORKFLOW ────────
  const handleStartPromotion = () => {
    if (!anneeEnCours) return toast.error("Aucune année n'est définie comme étant 'en cours'.");
    setClosedAnneeId(anneeEnCours.id);
    setPromoStage('confirm_close');
  };

  const handleCloseYear = async () => {
    setProcessingPromo(true);
    try {
      await anneeApi.cloturer({ admin_password: adminPassword });
      setPromoStage('select_new');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || (typeof err === 'string' ? err : "Mot de passe incorrect ou erreur de clôture");
      toast.error(msg);
    } finally {
      setProcessingPromo(false);
    }
  };

  const handleSetNewYear = async () => {
    if (!newYearId) return toast.error("Veuillez sélectionner la nouvelle année scolaire.");
    setProcessingPromo(true);
    try {
      const res = await anneeApi.setNouvelleAnnee({ 
        annee_id: parseInt(newYearId),
        admin_password: adminPassword,
        annee_cloturee_id: closedAnneeId
      });
      toast.success(res.message);
      setPromoStage(null);
      setAdminPassword('');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || (typeof err === 'string' ? err : "Erreur lors du lancement de la promotion");
      toast.error(msg);
    } finally {
      setProcessingPromo(false);
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case 'en_cours': return 'success';
      case 'cloturee': return 'default';
      default: return 'info';
    }
  };

  const statusLabel = (status) => {
    switch(status) {
      case 'en_cours': return 'En cours';
      case 'cloturee': return 'Clôturée';
      default: return 'À venir';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] -z-10" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text)]">Années & Sessions</h1>
          <p className="text-sm font-medium mt-2 text-[var(--color-text-secondary)]">Configuration temporelle du calendrier universitaire</p>
        </div>
        {anneeEnCours && (
          <Button onClick={handleStartPromotion} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2 h-12 px-6 rounded-2xl">
            <ShieldCheck className="w-5 h-5" />
            Clôturer l'année & Lancer la promotion
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Années */}
        <Card className="animate-fade-in-delay-1 border-t-4 border-t-orange-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-orange-500" /> Années Universitaires</CardTitle></div>
              <Button size="sm" onClick={openAddAnnee} variant="ghost" className="text-orange-600 hover:bg-orange-50"><Plus className="w-4 h-4" /> Ajouter</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : annees.length === 0 ? (
              <EmptyState icon={Calendar} title="Aucune année" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annees.map((a, i) => (
                    <TableRow key={a.id} className="group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                      <TableCell><span className="font-bold text-slate-800">{a.libelle}</span></TableCell>
                      <TableCell><span className="text-sm font-semibold text-slate-600">{a.annee_debut} - {a.annee_fin}</span></TableCell>
                      <TableCell><Badge variant={statusColor(a.statut)}>{statusLabel(a.statut)}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5 transition-opacity">
                            <Button variant="outline" size="sm" onClick={() => openEditAnnee(a)} className="!px-2 h-8 text-emerald-500"><Pencil className="w-4 h-4" /></Button>
                            <Button variant="danger" size="sm" onClick={() => { setDeletingAnneeId(a.id); setAnneeConfirmOpen(true); }} className="!px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="animate-fade-in-delay-2 border-t-4 border-t-amber-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-amber-500" /> Sessions d'Examens</CardTitle></div>
              <Button size="sm" onClick={openAddSession} variant="ghost" className="text-amber-600 hover:bg-amber-50"><Plus className="w-4 h-4" /> Ajouter</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
            ) : sessions.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Aucune session" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Année ratachée</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s, i) => (
                    <TableRow key={s.id} className="group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                      <TableCell><span className="font-bold text-slate-800">{s.libelle}</span></TableCell>
                      <TableCell><Badge variant={s.type_session === 'Normale' ? 'primary' : 'warning'}>{s.type_session}</Badge></TableCell>
                      <TableCell><span className="text-sm font-semibold text-slate-600">{s.annee_universitaire?.libelle || '-'}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5 transition-opacity">
                            <Button variant="outline" size="sm" onClick={() => openEditSession(s)} className="!px-2 h-8 text-emerald-500"><Pencil className="w-4 h-4" /></Button>
                            <Button variant="danger" size="sm" onClick={() => { setDeletingSessionId(s.id); setSessionConfirmOpen(true); }} className="!px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Année Modal */}
      <Modal open={anneeModalOpen} onClose={() => setAnneeModalOpen(false)} title={editingAnnee ? 'Modifier l\'année' : 'Ajouter une année'}>
        <form onSubmit={handleAnneeSubmit} className="space-y-4">
           <Input label="Libellé" value={anneeForm.libelle} onChange={(e) => setAnneeForm({...anneeForm, libelle: e.target.value})} required placeholder="Ex: 2023-2024" />
           <div className="grid grid-cols-2 gap-4">
              <Input label="Année début" type="number" value={anneeForm.annee_debut} onChange={(e) => setAnneeForm({...anneeForm, annee_debut: e.target.value})} required />
              <Input label="Année fin" type="number" value={anneeForm.annee_fin} onChange={(e) => setAnneeForm({...anneeForm, annee_fin: e.target.value})} required />
           </div>
           <div className="flex justify-end pt-4 gap-3">
             <Button variant="ghost" onClick={() => setAnneeModalOpen(false)}>Annuler</Button>
             <Button type="submit" disabled={savingAnnee}>{savingAnnee && <Loader2 className="w-5 h-5 animate-spin" />}{editingAnnee ? 'Sauvegarder' : 'Ajouter'}</Button>
           </div>
        </form>
      </Modal>

      {/* Session Modal */}
      <Modal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title={editingSession ? 'Modifier la session' : 'Ajouter une session'}>
        <form onSubmit={handleSessionSubmit} className="space-y-4">
           <Input label="Libellé" value={sessionForm.libelle} onChange={(e) => setSessionForm({...sessionForm, libelle: e.target.value})} required placeholder="Ex: Session S1" />
           <Select label="Type" value={sessionForm.type_session} onChange={(e) => setSessionForm({...sessionForm, type_session: e.target.value})} required options={[{value:'Normale', label:'Normale'},{value:'Rattrapage', label:'Rattrapage'}]} />
           <Select label="Année Universitaire" value={sessionForm.annee_universitaire_id} onChange={(e) => setSessionForm({...sessionForm, annee_universitaire_id: e.target.value})} required options={annees.map(a => ({value: String(a.id), label: a.libelle}))} />
           <div className="grid grid-cols-2 gap-4">
              <Input label="Date début" type="date" value={sessionForm.date_debut} onChange={(e) => setSessionForm({...sessionForm, date_debut: e.target.value})} />
              <Input label="Date fin" type="date" value={sessionForm.date_fin} onChange={(e) => setSessionForm({...sessionForm, date_fin: e.target.value})} />
           </div>
           <div className="flex justify-end pt-4 gap-3">
             <Button variant="ghost" onClick={() => setSessionModalOpen(false)}>Annuler</Button>
             <Button type="submit" disabled={savingSession}>{savingSession && <Loader2 className="w-5 h-5 animate-spin" />}{editingSession ? 'Sauvegarder' : 'Ajouter'}</Button>
           </div>
        </form>
      </Modal>

      {/* PROMOTION WIZARD MODALS */}
      <Modal open={promoStage === 'confirm_close'} onClose={() => setPromoStage(null)} title="Clôturer l'année scolaire" size="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
            <AlertTriangle className="w-12 h-12 text-orange-500" />
            <p className="text-sm font-medium text-orange-800 leading-relaxed">
              Voulez-vous vraiment clôturer l'année universaire <strong>{anneeEnCours?.libelle}</strong> ? 
              Cela empêchera toute modification ultérieure des notes pour cette période.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Confirmation Administrateur</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Mot de passe admin..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setPromoStage(null)}>Annuler</Button>
            <Button onClick={handleCloseYear} disabled={!adminPassword || processingPromo} className="bg-emerald-600">
              {processingPromo ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmer la clôture'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={promoStage === 'select_new'} onClose={() => setPromoStage(null)} title="Lancer la promotion" size="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-800 leading-relaxed">
              L'année précédente est clôturée. Veuillez maintenant sélectionner ou créer l'année universitaire suivante pour lancer la promotion des étudiants.
            </p>
          </div>
          <div className="space-y-4">
            <Select 
              label="Sélectionner la nouvelle année" 
              value={newYearId} 
              onChange={(e) => setNewYearId(e.target.value)} 
              options={anneesVides.map(a => ({ value: String(a.id), label: a.libelle }))} 
              placeholder="Choisir parmi les années existantes..."
            />
            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 font-bold text-xs uppercase tracking-widest">OU</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <Button variant="outline" className="w-full h-12 gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => setPromoStage('create_new')}>
              <Plus className="w-5 h-5" /> Créer une nouvelle année scolaire
            </Button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setPromoStage(null)}>Plus tard</Button>
            <Button onClick={handleSetNewYear} disabled={!newYearId || processingPromo} className="gap-2">
              {processingPromo ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Lancer la promotion</>}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={promoStage === 'create_new'} onClose={() => setPromoStage('select_new')} title="Nouvelle année universitaire">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSavingAnnee(true);
          try {
            const payload = { ...anneeForm, annee_debut: parseInt(anneeForm.annee_debut), annee_fin: parseInt(anneeForm.annee_fin) };
            const res = await anneeApi.create(payload);
            toast.success('Nouvelle année créée');
            setNewYearId(String(res.id));
            setPromoStage('select_new');
            loadData();
          } catch { toast.error('Erreur création'); }
          finally { setSavingAnnee(false); }
        }} className="space-y-4">
           <Input label="Libellé" value={anneeForm.libelle} onChange={(e) => setAnneeForm({...anneeForm, libelle: e.target.value})} required placeholder="Ex: 2024-2025" />
           <div className="grid grid-cols-2 gap-4">
              <Input label="Année début" type="number" value={anneeForm.annee_debut} onChange={(e) => setAnneeForm({...anneeForm, annee_debut: e.target.value})} required />
              <Input label="Année fin" type="number" value={anneeForm.annee_fin} onChange={(e) => setAnneeForm({...anneeForm, annee_fin: e.target.value})} required />
           </div>
           <div className="flex justify-end pt-4 gap-3">
             <Button variant="ghost" onClick={() => setPromoStage('select_new')}>Retour</Button>
             <Button type="submit" disabled={savingAnnee}>{savingAnnee && <Loader2 className="w-5 h-5 animate-spin" />} Créer & Sélectionner</Button>
           </div>
        </form>
      </Modal>

      <ConfirmDialog open={anneeConfirmOpen} onClose={() => setAnneeConfirmOpen(false)} onConfirm={confirmDeleteAnnee} title="Supprimer l'année ?" message="Attention, ceci risque d'affecter l'historique." variant="danger" />
      <ConfirmDialog open={sessionConfirmOpen} onClose={() => setSessionConfirmOpen(false)} onConfirm={confirmDeleteSession} title="Supprimer la session ?" message="Attention, suppression définitive." variant="danger" />
    </div>
  );
}
