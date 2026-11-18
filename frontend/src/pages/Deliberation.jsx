import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { Plus, Loader2, CheckCircle, XCircle, Download, RefreshCw, Scale, FileText, Gavel } from 'lucide-react';
import { deliberationApi, anneeApi, niveauApi, parcoursApi, sessionApi, exportApi } from '../services/api';
import toast from 'react-hot-toast';

const DECISION_BADGES = { admis: 'success', autoriser_a_passer: 'info', redoubler: 'danger' };
const DECISION_OPTIONS = [
  { value: 'admis', label: 'Admis' },
  { value: 'autoriser_a_passer', label: 'Autorisé à passer' },
  { value: 'redoubler', label: 'Redoubler' },
];

export default function Deliberation() {
  const [deliberations, setDeliberations] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [parcoursList, setParcoursList] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDelib, setSelectedDelib] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({ annee_universitaire_id: '', niveau_id: '', parcours_id: '', session_examen_id: '', president_jury: '', observations: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dData, aData, nData, pData, sData] = await Promise.all([
        deliberationApi.getAll(), anneeApi.getAll(), niveauApi.getAll(), parcoursApi.getAll(), sessionApi.getAll(),
      ]);
      setDeliberations(dData); setAnnees(aData); setNiveaux(nData); setParcoursList(pData); setSessions(sData);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    const anneeEnCours = annees.find(a => a.en_cours);
    setForm({ annee_universitaire_id: anneeEnCours ? String(anneeEnCours.id) : '', niveau_id: '', parcours_id: '', session_examen_id: '', president_jury: '', observations: '' });
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        annee_universitaire_id: parseInt(form.annee_universitaire_id),
        niveau_id: parseInt(form.niveau_id),
        parcours_id: parseInt(form.parcours_id),
        session_examen_id: form.session_examen_id ? parseInt(form.session_examen_id) : null,
        president_jury: form.president_jury,
        observations: form.observations,
      };
      await deliberationApi.create(payload);
      toast.success('Délibération créée avec les décisions calculées automatiquement');
      setModalOpen(false);
      loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setCreating(false); }
  };

  const openDetail = async (d) => {
    try {
      const full = await deliberationApi.getById(d.id);
      setSelectedDelib(full);
      setDetailModal(true);
    } catch { toast.error('Erreur chargement détails'); }
  };

  const handleValider = async () => {
    if (!selectedDelib) return;
    try {
      await deliberationApi.valider(selectedDelib.id);
      toast.success('Délibération finalisée — étudiants notifiés');
      const full = await deliberationApi.getById(selectedDelib.id);
      setSelectedDelib(full);
      loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
  };

  const handleRecalculer = async () => {
    if (!selectedDelib) return;
    try {
      const result = await deliberationApi.recalculer(selectedDelib.id);
      toast.success('Décisions recalculées');
      setSelectedDelib(result);
      loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
  };

  const handleUpdateDecision = async (decisionId, newDecision) => {
    if (!selectedDelib) return;
    try {
      await deliberationApi.updateDecision(selectedDelib.id, decisionId, { decision: newDecision });
      toast.success('Décision modifiée');
      const full = await deliberationApi.getById(selectedDelib.id);
      setSelectedDelib(full);
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
  };

  const handleDownloadPV = async (id) => {
    try {
      const blob = await exportApi.pvDeliberationPDF(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `pv_deliberation_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PV téléchargé');
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur téléchargement'); }
  };

  const confirmDelete = async () => {
    try { await deliberationApi.delete(deletingId); toast.success('Délibération supprimée'); loadData(); }
    catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setConfirmOpen(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text)]">Délibérations</h1>
          <p className="text-sm font-medium mt-2 text-[var(--color-text-secondary)]">Jury de délibération et gestion des décisions</p>
        </div>
      </div>

      <Card className="animate-fade-in-delay-1 border-t-4 border-t-amber-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><CardTitle className="flex items-center gap-2"><Gavel className="w-5 h-5 text-amber-500" /> Sessions de délibération</CardTitle><CardDescription>{deliberations.length} session(s)</CardDescription></div>
            <Button size="sm" onClick={openCreate} className="shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4" /> Nouvelle délibération</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div> :
          deliberations.length === 0 ? <EmptyState icon={Scale} title="Aucune délibération" description="Lancez votre première session de délibération" /> :
          <Table>
            <TableHeader><TableRow><TableHead>Niveau / Parcours</TableHead><TableHead>Année</TableHead><TableHead>Session</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead>Résultats</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {deliberations.map((d, i) => {
                const nbDecisions = d.decisions?.length || 0;
                const nbAdmis = d.decisions?.filter(dec => dec.decision === 'admis').length || 0;
                return (
                  <TableRow key={d.id} className="group animate-fade-in cursor-pointer" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => openDetail(d)}>
                    <TableCell><span className="font-bold text-slate-800">{d.niveau?.libelle} - {d.parcours?.libelle}</span></TableCell>
                    <TableCell><span className="text-slate-600 font-medium">{d.anneeUniversitaire?.libelle}</span></TableCell>
                    <TableCell><span className="text-slate-600 font-medium">{d.session?.libelle || '—'}</span></TableCell>
                    <TableCell><span className="text-slate-600 font-medium">{d.date_deliberation ? new Date(d.date_deliberation).toLocaleDateString('fr-FR') : '—'}</span></TableCell>
                    <TableCell><Badge variant={d.statut === 'terminee' ? 'success' : d.statut === 'annulee' ? 'danger' : 'warning'}>{d.statut === 'terminee' ? 'Finalisée' : d.statut === 'annulee' ? 'Annulée' : 'En cours'}</Badge></TableCell>
                    <TableCell>
                      {nbDecisions > 0 && <span className="text-sm font-bold text-emerald-600">{nbAdmis}/{nbDecisions} admis</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadPV(d.id)} className="!px-2 h-8 text-amber-500"><Download className="w-4 h-4" /></Button>
                        {d.statut !== 'terminee' && <Button variant="danger" size="sm" onClick={() => { setDeletingId(d.id); setConfirmOpen(true); }} className="!px-2 h-8"><XCircle className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      {/* Modal Création */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle Délibération" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select label="Année universitaire" value={form.annee_universitaire_id} onChange={(e) => setForm({...form, annee_universitaire_id: e.target.value})} required
              options={annees.map(a => ({ value: String(a.id), label: `${a.libelle}${a.en_cours ? ' (En cours)' : ''}` }))} />
            <Select label="Niveau" value={form.niveau_id} onChange={(e) => setForm({...form, niveau_id: e.target.value})} required
              options={niveaux.map(n => ({ value: String(n.id), label: n.libelle }))} />
            <Select label="Parcours" value={form.parcours_id} onChange={(e) => setForm({...form, parcours_id: e.target.value})} required
              options={parcoursList.map(p => ({ value: String(p.id), label: p.libelle }))} />
          </div>
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text)]">Président du jury</label>
              <input value={form.president_jury} onChange={(e) => setForm({...form, president_jury: e.target.value})} placeholder="Nom du président..."
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700">{creating && <Loader2 className="w-5 h-5 animate-spin" />}Lancer la délibération</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Détails */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Résultats de Délibération" size="xl">
        {selectedDelib && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-[var(--color-border)]/50 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-[var(--color-text)]">{selectedDelib.niveau?.libelle} - {selectedDelib.parcours?.libelle}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedDelib.anneeUniversitaire?.libelle} • {selectedDelib.session?.libelle || 'Toutes sessions'}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedDelib.statut === 'terminee' ? 'success' : 'warning'}>{selectedDelib.statut === 'terminee' ? 'Finalisée' : 'En cours'}</Badge>
                  {selectedDelib.president_jury && <Badge variant="info">Président: {selectedDelib.president_jury}</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                {selectedDelib.statut !== 'terminee' && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleRecalculer}><RefreshCw className="w-4 h-4" /> Recalculer</Button>
                    <Button size="sm" onClick={handleValider} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="w-4 h-4" /> Valider</Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => handleDownloadPV(selectedDelib.id)}><Download className="w-4 h-4" /> PV PDF</Button>
              </div>
            </div>

            {/* Stats summary */}
            {selectedDelib.decisions && selectedDelib.decisions.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {['admis', 'autoriser_a_passer', 'redoubler'].map(dec => {
                  const count = selectedDelib.decisions.filter(d => d.decision === dec).length;
                  const colors = { admis: 'bg-emerald-50 border-emerald-200 text-emerald-700', autoriser_a_passer: 'bg-blue-50 border-blue-200 text-blue-700', redoubler: 'bg-red-50 border-red-200 text-red-700' };
                  const labels = { admis: 'Admis', autoriser_a_passer: 'Autorisé à passer', redoubler: 'Redoubler' };
                  return (
                    <div key={dec} className={`rounded-xl p-3 text-center border ${colors[dec]}`}>
                      <p className="text-2xl font-extrabold">{count}</p>
                      <p className="text-xs font-bold uppercase tracking-wider mt-1">{labels[dec]}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table des décisions */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr><th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Rang</th><th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Étudiant</th><th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Moyenne</th><th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Crédits</th><th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Mention</th><th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Décision</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedDelib.decisions || []).sort((a, b) => (a.rang || 999) - (b.rang || 999)).map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-extrabold text-slate-400">#{d.rang}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-slate-800">{d.etudiant?.nom} {d.etudiant?.prenom}</p>
                        <p className="text-xs text-slate-500">{d.etudiant?.numero_etudiant}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center font-extrabold text-slate-800">{d.moyenne_generale}/20</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-600">{d.total_credits}/{d.total_credits_requis}</td>
                      <td className="px-4 py-2.5 text-center"><Badge variant="primary">{d.mention || '—'}</Badge></td>
                      <td className="px-4 py-2.5 text-center">
                        {selectedDelib.statut !== 'terminee' ? (
                          <select value={d.decision} onChange={(e) => handleUpdateDecision(d.id, e.target.value)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer bg-transparent outline-none">
                            {DECISION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <Badge variant={DECISION_BADGES[d.decision]}>{d.decision.toUpperCase()}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Supprimer la délibération ?" message="Toutes les décisions seront supprimées." />
    </div>
  );
}
