import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { Plus, Pencil, Trash2, Search, FileText, Printer, ChevronRight, ChevronLeft, Loader2, Award, Upload, CheckCircle, History, Download, Users, Layers } from 'lucide-react';
import { noteApi, etudiantApi, matiereApi, sessionApi, anneeApi, exportApi, niveauApi, parcoursApi } from '../services/api';
import { validateNoteValue, runValidators } from '../utils/validation';
import toast from 'react-hot-toast';

const TYPE_NOTE_OPTIONS = [
  { value: 'CC', label: 'Contrôle Continu' },
  { value: 'Examen', label: 'Examen Final' },
  { value: 'Rattrapage', label: 'Rattrapage' },
];

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [allEtudiants, setAllEtudiants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [parcours, setParcours] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedNiveauId, setSelectedNiveauId] = useState('');
  const [selectedParcoursId, setSelectedParcoursId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEtudiants, setTotalEtudiants] = useState(0);
  const itemsPerPage = 20;

  const [search, setSearch] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ etudiant_id: '', matiere_id: '', session_examen_id: '', annee_universitaire_id: '', valeur: '', type_note: 'Examen', est_absent: false, type_absence: '' });

  const [releveModalOpen, setReleveModalOpen] = useState(false);
  const [releveData, setReleveData] = useState(null);
  const [selectedEtudiantId, setSelectedEtudiantId] = useState('');
  const [loadingReleve, setLoadingReleve] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [historiqueModal, setHistoriqueModal] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [selectedNotes, setSelectedNotes] = useState([]);
  const [downloadingRecap, setDownloadingRecap] = useState(false);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (selectedNiveauId) loadEtudiants(); }, [selectedNiveauId, selectedParcoursId, currentPage]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sesData, anData, nivData, parcData, allEtdData] = await Promise.all([
        sessionApi.getAll(), anneeApi.getAll(), niveauApi.getAll(), parcoursApi.getAll(),
        etudiantApi.getAll({ order_by: 'numero_etudiant' })
      ]);
      setSessions(sesData);
      setAnnees(anData);
      setNiveaux(nivData);
      setParcours(parcData);
      setAllEtudiants(allEtdData.etudiants || []);

      const l1 = nivData.find(n => n.libelle.toUpperCase().includes('L1')) || nivData[0];
      if (l1) setSelectedNiveauId(String(l1.id));
      
      const gb = parcData.find(p => p.libelle.toUpperCase().includes('GB') || p.libelle.toUpperCase().includes('GÉNIE'));
      if (gb) setSelectedParcoursId(String(gb.id));
    } catch { toast.error('Erreur chargement initial'); }
    finally { setLoading(false); }
  };

  const loadEtudiants = async () => {
    setLoading(true);
    try {
      const data = await etudiantApi.getAll({
        niveau_id: selectedNiveauId,
        parcours_id: selectedParcoursId,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        order_by: 'numero_etudiant'
      });
      setEtudiants(data.etudiants || []);
      setTotalEtudiants(data.total || 0);
    } catch { toast.error('Erreur chargement étudiants'); }
    finally { setLoading(false); }
  };

  const loadMatieresParNiveau = async (etdId) => {
    const etd = allEtudiants.find(e => String(e.id) === String(etdId));
    if (!etd || !etd.niveau_id) {
       // fallback search if not found in current page
       try {
         const fullEtd = await etudiantApi.getById(etdId);
         const mats = await matiereApi.getAll({ niveau_id: fullEtd.niveau_id });
         setMatieres(mats);
       } catch { setMatieres([]); }
       return;
    }
    try {
      const mats = await matiereApi.getAll({ niveau_id: etd.niveau_id });
      setMatieres(mats);
    } catch { setMatieres([]); }
  };

  const handleStudentSelect = (etdId) => {
    setForm({ ...form, etudiant_id: etdId, matiere_id: '' });
    if (etdId) loadMatieresParNiveau(etdId);
  };

  const filtered = notes.filter(n => {
    const etd = n.etudiant ? `${n.etudiant.nom} ${n.etudiant.prenom} ${n.etudiant.numero_etudiant}` : '';
    const mat = n.matiere ? `${n.matiere.code} ${n.matiere.libelle}` : '';
    const matchSearch = `${etd} ${mat}`.toLowerCase().includes(search.toLowerCase());
    const matchSession = !filterSession || String(n.session_examen_id) === filterSession;
    const matchStatut = !filterStatut || n.statut === filterStatut;
    return matchSearch && matchSession && matchStatut;
  });

  const openAdd = () => {
    setEditing(null);
    const anneeEnCours = annees.find(a => a.en_cours);
    setForm({ etudiant_id: '', matiere_id: '', session_examen_id: '', annee_universitaire_id: anneeEnCours ? String(anneeEnCours.id) : '', valeur: '', type_note: 'Examen', est_absent: false, type_absence: '' });
    setModalOpen(true);
  };

  const openEdit = (n) => {
    setEditing(n);
    setForm({
      etudiant_id: String(n.etudiant_id), matiere_id: String(n.matiere_id),
      session_examen_id: String(n.session_examen_id), annee_universitaire_id: String(n.annee_universitaire_id),
      valeur: n.est_absent ? '' : String(n.valeur),
      type_note: n.type_note || 'Examen', est_absent: n.est_absent || false, type_absence: n.type_absence || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErr = runValidators([
      () => !form.etudiant_id ? 'Sélectionnez un étudiant.' : null,
      () => !form.matiere_id ? 'Sélectionnez une matière.' : null,
      () => !form.est_absent ? validateNoteValue(form.valeur) : null,
    ]);
    if (validationErr) { toast.error(validationErr); return; }

    setSaving(true);
    try {
      const payload = {
        etudiant_id: parseInt(form.etudiant_id), matiere_id: parseInt(form.matiere_id),
        session_examen_id: parseInt(form.session_examen_id), annee_universitaire_id: parseInt(form.annee_universitaire_id),
        type_note: form.type_note,
        est_absent: form.est_absent, type_absence: form.est_absent ? (form.type_absence || 'ABI') : null,
        valeur: form.est_absent ? 0 : parseFloat(form.valeur),
      };
      if (editing) { await noteApi.update(editing.id, payload); toast.success('Note modifiée'); }
      else { await noteApi.create(payload); toast.success('Note saisie'); }
      setModalOpen(false); loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setSaving(false); }
  };

  const loadData = () => {
    if (selectedEtudiantId) handleGenerateReleve(selectedEtudiantId);
    loadEtudiants();
  };

  const confirmDelete = async () => {
    try { await noteApi.delete(deletingId); toast.success('Note supprimée'); loadData(); }
    catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setConfirmOpen(false); }
  };

  const handleGenerateReleve = async (etdIdOrEvent) => {
    let etdId = selectedEtudiantId;
    if (typeof etdIdOrEvent === 'string' || typeof etdIdOrEvent === 'number') {
      etdId = etdIdOrEvent;
      setSelectedEtudiantId(String(etdId));
    } else if (etdIdOrEvent && etdIdOrEvent.preventDefault) {
      etdIdOrEvent.preventDefault();
    }
    
    if (!etdId) return toast.error('Sélectionnez un étudiant');
    setLoadingReleve(true);
    try {
      const data = await noteApi.releve(etdId);
      setReleveData(data);
      setReleveModalOpen(true);
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setLoadingReleve(false); }
  };

  const handleDownloadBulletin = async () => {
    if (!selectedEtudiantId) return;
    try {
      const anneeEnCours = annees.find(a => a.en_cours);
      const params = anneeEnCours ? { annee_universitaire_id: anneeEnCours.id } : {};
      const blob = await exportApi.bulletinPDF(selectedEtudiantId, params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url; a.download = `bulletin_${selectedEtudiantId}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Bulletin téléchargé');
    } catch { toast.error('Erreur téléchargement'); }
  };

  const handleDownloadRecap = async () => {
    if (!selectedNiveauId) return toast.error('Sélectionnez un niveau');
    setDownloadingRecap(true);
    try {
      const anneeEnCours = annees.find(a => a.en_cours);
      const params = anneeEnCours ? { annee_universitaire_id: anneeEnCours.id } : {};
      
      // If students are selected, call export for each
      if (selectedNotes.length > 0) {
        toast.loading('Génération des bulletins...');
        for (const etdId of selectedNotes) {
          const blob = await exportApi.bulletinPDF(etdId, params);
          const url = window.URL.createObjectURL(new Blob([blob]));
          const a = document.createElement('a');
          const etd = allEtudiants.find(e => String(e.id) === String(etdId));
          a.href = url; a.download = `bulletin_${etd?.numero_etudiant || etdId}.pdf`; a.click();
          window.URL.revokeObjectURL(url);
        }
        toast.dismiss();
        toast.success('Bulletins téléchargés');
      } else {
        const blob = await exportApi.recapNotesNiveauPDF(selectedNiveauId, params);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const a = document.createElement('a');
        const niv = niveaux.find(n => String(n.id) === selectedNiveauId);
        a.href = url; a.download = `recapitulatif_notes_${niv?.libelle || 'niveau'}.pdf`; a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Récapitulatif téléchargé');
      }
    } catch { toast.error('Erreur téléchargement'); }
    finally { setDownloadingRecap(false); }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast.error('Sélectionnez un fichier');
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await noteApi.importBulk(formData);
      toast.success(result.message || 'Import terminé');
      if (result.errors?.length > 0) {
        result.errors.forEach(e => toast.error(e, { duration: 6000 }));
      }
      setImportModalOpen(false);
      loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur import'); }
    finally { setImportLoading(false); }
  };

  const handleValidateSelected = async () => {
    if (selectedNotes.length === 0) return toast.error('Sélectionnez des notes à valider');
    try {
      await noteApi.validateNotes(selectedNotes);
      toast.success(`${selectedNotes.length} note(s) validée(s)`);
      setSelectedNotes([]);
      loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
  };

  const openHistorique = async (noteId) => {
    setLoadingHist(true);
    setHistoriqueModal(true);
    try {
      const data = await noteApi.getHistorique(noteId);
      setHistorique(data);
    } catch { toast.error('Erreur chargement historique'); }
    finally { setLoadingHist(false); }
  };

  const toggleSelectNote = (id) => {
    setSelectedNotes(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const totalPages = Math.ceil(totalEtudiants / itemsPerPage);

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text)]">Gestion des Notes</h1>
          <p className="text-sm font-medium mt-2 text-[var(--color-text-secondary)]">Sélectionnez un niveau pour gérer les notes des étudiants</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleDownloadRecap} disabled={downloadingRecap || !selectedNiveauId} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            {downloadingRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {selectedNotes.length > 0 ? `Exporter Sélection (${selectedNotes.length})` : 'Exporter Liste (PDF)'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportModalOpen(true)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"><Upload className="w-4 h-4" /> Import CSV/Excel</Button>
          <Button size="sm" onClick={openAdd} className="shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4" /> Saisir une note</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 border-t-4 border-t-emerald-500">
           <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> Filtres</CardTitle></CardHeader>
           <CardContent className="p-2 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Niveaux</label>
                {niveaux.map(niv => (
                  <button
                    key={niv.id}
                    onClick={() => { setSelectedNiveauId(String(niv.id)); setCurrentPage(1); }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedNiveauId === String(niv.id) ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {niv.libelle}
                  </button>
                ))}
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parcours</label>
                <button
                    onClick={() => { setSelectedParcoursId(''); setCurrentPage(1); }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedParcoursId === '' ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    Tous les parcours
                </button>
                {parcours.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedParcoursId(String(p.id)); setCurrentPage(1); }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedParcoursId === String(p.id) ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {p.libelle}
                  </button>
                ))}
              </div>
           </CardContent>
        </Card>

        <Card className="md:col-span-3 border-t-4 border-t-emerald-500">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" /> Étudiants</CardTitle><CardDescription>Liste des étudiants filtrés</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chercher par nom ou matricule..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
            </div>

            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div> :
            etudiants.length === 0 ? <EmptyState icon={Users} title="Aucun étudiant" /> :
            <>
              <Table>
                <TableHeader><TableRow><TableHead className="w-12"><input type="checkbox" checked={selectedNotes.length === etudiants.length && etudiants.length > 0} onChange={() => setSelectedNotes(selectedNotes.length === etudiants.length ? [] : etudiants.map(e => e.id))} /></TableHead><TableHead>Matricule</TableHead><TableHead>Nom & Prénom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {etudiants.filter(e => `${e.nom} ${e.prenom} ${e.numero_etudiant}`.toLowerCase().includes(search.toLowerCase())).map((e, i) => (
                    <TableRow key={e.id} className="group cursor-pointer">
                      <TableCell onClick={(ev) => { ev.stopPropagation(); toggleSelectNote(e.id); }}>
                        <input type="checkbox" checked={selectedNotes.includes(e.id)} readOnly onClick={(ev) => { ev.stopPropagation(); toggleSelectNote(e.id); }} />
                      </TableCell>
                      <TableCell onClick={() => handleGenerateReleve(e.id)}><span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{e.numero_etudiant}</span></TableCell>
                      <TableCell onClick={() => handleGenerateReleve(e.id)}><span className="font-bold text-slate-800">{e.nom} {e.prenom}</span></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-emerald-500" onClick={() => handleGenerateReleve(e.id)}><ChevronRight className="w-5 h-5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page {currentPage} sur {totalPages || 1}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /> Précédent</Button>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Suivant <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
            }
          </CardContent>
        </Card>
      </div>

      {/* Modal Saisie/Modification */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la note' : 'Saisir une note'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Étudiant (Ordre Matricule)</label>
              <select
                value={form.etudiant_id}
                onChange={(e) => handleStudentSelect(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              >
                <option value="">Sélectionner un étudiant...</option>
                {allEtudiants.map(e => (
                  <option key={e.id} value={e.id}>{e.numero_etudiant} - {e.nom} {e.prenom}</option>
                ))}
              </select>
            </div>
            
            <Select 
              label="Matière (Selon niveau)" 
              value={form.matiere_id} 
              onChange={(e) => setForm({...form, matiere_id: e.target.value})} 
              required 
              disabled={!form.etudiant_id}
              options={matieres.map(m => ({ value: String(m.id), label: `${m.code} - ${m.libelle}` }))} 
              placeholder={form.etudiant_id ? "Choisir une matière..." : "Sélectionnez d'abord un étudiant"}
            />
            
            <Select label="Type de note" value={form.type_note} onChange={(e) => setForm({...form, type_note: e.target.value})} required options={TYPE_NOTE_OPTIONS} />
            <Select label="Session d'examen" value={form.session_examen_id} onChange={(e) => setForm({...form, session_examen_id: e.target.value})} required options={sessions.map(s => ({ value: String(s.id), label: `${s.libelle} (${s.type_session})` }))} />
            <Select label="Année universitaire" value={form.annee_universitaire_id} onChange={(e) => setForm({...form, annee_universitaire_id: e.target.value})} required options={annees.map(a => ({ value: String(a.id), label: `${a.libelle}${a.en_cours ? ' (En cours)' : ''}` }))} />
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.est_absent} onChange={(e) => setForm({...form, est_absent: e.target.checked, valeur: e.target.checked ? '' : form.valeur})}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-bold text-slate-700">Étudiant absent</span>
            </label>
            {form.est_absent && (
              <Select value={form.type_absence} onChange={(e) => setForm({...form, type_absence: e.target.value})}
                options={[{ value: 'ABJ', label: 'ABJ — Absence Justifiée' }, { value: 'ABI', label: 'ABI — Absence Injustifiée' }]} className="w-64" />
            )}
          </div>

          {!form.est_absent && (
            <Input label="Note sur 20" type="number" min="0" max="20" step="0.01" value={form.valeur} onChange={(e) => setForm({...form, valeur: e.target.value})} required placeholder="Ex: 14.50" />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}{editing ? 'Sauvegarder' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Supprimer la note ?" message="Cette action est définitive." />

      {/* Import Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import de notes en masse" size="md">
        <div className="space-y-5">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2">Format attendu du fichier :</h4>
            <p className="text-sm text-slate-600">Colonnes : <code className="bg-white px-1 rounded text-xs font-bold">numero_etudiant</code>, <code className="bg-white px-1 rounded text-xs font-bold">code_matiere</code>, <code className="bg-white px-1 rounded text-xs font-bold">note</code>, <code className="bg-white px-1 rounded text-xs font-bold">type_note</code>, <code className="bg-white px-1 rounded text-xs font-bold">session_examen_id</code>, <code className="bg-white px-1 rounded text-xs font-bold">annee_universitaire_id</code></p>
            <p className="text-xs text-slate-500 mt-2">Pour les absences, mettez ABJ ou ABI dans la colonne note.</p>
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-bold text-slate-700">Cliquez pour sélectionner un fichier</p>
            <p className="text-sm text-slate-500 mt-1">.xlsx, .xls ou .csv (max 5 Mo)</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setImportModalOpen(false)}>Annuler</Button>
            <Button onClick={handleImport} disabled={importLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {importLoading && <Loader2 className="w-5 h-5 animate-spin" />} Importer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Relevé de notes */}
      <Modal open={releveModalOpen} onClose={() => setReleveModalOpen(false)} title="Consultation des notes" size="xl">
        {releveData && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-[var(--color-border)]/50 pb-6">
              <div>
                <h3 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">{releveData.etudiant.nom} {releveData.etudiant.prenom}</h3>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">Matricule: {releveData.etudiant.numero_etudiant}</p>
                <div className="flex gap-2 mt-3"><Badge variant="primary">{releveData.etudiant.niveau}</Badge><Badge variant="info">{releveData.etudiant.parcours}</Badge></div>
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm" onClick={() => { setModalOpen(true); setEditing(null); openAdd(); setForm({...form, etudiant_id: selectedEtudiantId}); handleStudentSelect(selectedEtudiantId); }} className="text-emerald-600 border-emerald-200"><Plus className="w-4 h-4" /> Ajouter une note</Button>
              </div>
            </div>

            <div className="space-y-4">
              {releveData.modules.map((mod, index) => (
                <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-white/80 backdrop-blur-sm px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><ChevronRight className="w-4 h-4 text-emerald-500" /> {mod.libelle}</h4>
                    <Badge variant="success">{mod.moyenne_module}/20</Badge>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100/50">
                      <tr>
                        <th className="px-5 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Matière</th>
                        <th className="px-5 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Type</th>
                        <th className="px-5 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">Note</th>
                        <th className="px-5 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mod.matieres.map((mat, midx) => (
                        <tr key={midx} className="hover:bg-white transition-colors">
                          <td className="px-5 py-2.5 font-medium text-slate-700">{mat.matiere}</td>
                          <td className="px-5 py-2.5 text-center"><Badge variant="default">{mat.type_note || 'Examen'}</Badge></td>
                          <td className="px-5 py-2.5 text-right font-bold text-slate-800">{mat.absent ? <span className="text-red-500">{mat.type_absence || 'ABS'}</span> : `${mat.note}/20`}</td>
                          <td className="px-5 py-2.5 text-right">
                             {mat.id && (
                               <div className="flex justify-end gap-1">
                                 <Button variant="ghost" size="sm" onClick={() => {
                                   const noteToEdit = {
                                     id: mat.id,
                                     etudiant_id: selectedEtudiantId,
                                     matiere_id: mat.matiere_id,
                                     session_examen_id: mat.session_examen_id,
                                     annee_universitaire_id: mat.annee_universitaire_id,
                                     valeur: mat.note,
                                     type_note: mat.type_note,
                                     est_absent: mat.absent,
                                     type_absence: mat.type_absence
                                   };
                                   openEdit(noteToEdit);
                                 }} className="text-emerald-600"><Pencil className="w-3.5 h-3.5" /></Button>
                                 <Button variant="ghost" size="sm" onClick={() => { setDeletingId(mat.id); setConfirmOpen(true); }} className="text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                               </div>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {releveData.modules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mb-3" />
                <p className="font-semibold">Aucune note pour cet étudiant</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleDownloadBulletin}><Download className="w-5 h-5" /> Télécharger Bulletin</Button>
              <Button onClick={() => setReleveModalOpen(false)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
