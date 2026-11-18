import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { Plus, Pencil, Trash2, Search, Layers, Loader2, BookCopy, GraduationCap } from 'lucide-react';
import { moduleApi, matiereApi, parcoursApi, niveauApi, enseignantApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { validateAlphanumericCode, validateInteger, validateDecimal, runValidators, TYPE_MATIERE_LABELS } from '../utils/validation';

const SEMESTRES = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'];
const TYPES_MATIERE = [
  { value: 'CM', label: TYPE_MATIERE_LABELS.CM },
  { value: 'TD', label: TYPE_MATIERE_LABELS.TD },
  { value: 'TP', label: TYPE_MATIERE_LABELS.TP },
  { value: 'PROJET', label: TYPE_MATIERE_LABELS.PROJET },
];

export default function ModulesMatieres() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [modules, setModules] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [parcours, setParcours] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMod, setSearchMod] = useState('');
  const [searchMat, setSearchMat] = useState('');

  const [modModalOpen, setModModalOpen] = useState(false);
  const [modConfirmOpen, setModConfirmOpen] = useState(false);
  const [editingMod, setEditingMod] = useState(null);
  const [deletingModId, setDeletingModId] = useState(null);
  const [savingMod, setSavingMod] = useState(false);
  const [modForm, setModForm] = useState({ code: '', libelle: '', credits: '3', semestre: 'S1', parcours_id: '', niveau_id: '' });

  const [matModalOpen, setMatModalOpen] = useState(false);
  const [matConfirmOpen, setMatConfirmOpen] = useState(false);
  const [editingMat, setEditingMat] = useState(null);
  const [deletingMatId, setDeletingMatId] = useState(null);
  const [savingMat, setSavingMat] = useState(false);
  const [matForm, setMatForm] = useState({ code: '', libelle: '', coefficient: '1', volume_horaire: '', type_matiere: 'CM', module_id: '', enseignant_id: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modData, matData, parData, nivData, ensData] = await Promise.all([
        moduleApi.getAll(), matiereApi.getAll(), parcoursApi.getAll(), niveauApi.getAll(), enseignantApi.getAll()
      ]);
      setModules(modData); setMatieres(matData); setParcours(parData); setNiveaux(nivData); setEnseignants(ensData);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  // MODULE
  const filteredMod = modules.filter(m => `${m.code} ${m.libelle} ${m.semestre}`.toLowerCase().includes(searchMod.toLowerCase()));
  const openAddMod = () => { setEditingMod(null); setModForm({ code: '', libelle: '', credits: '3', semestre: 'S1', parcours_id: '', niveau_id: '' }); setModModalOpen(true); };
  const openEditMod = (m) => { setEditingMod(m); setModForm({ code: m.code, libelle: m.libelle, credits: String(m.credits), semestre: m.semestre, parcours_id: String(m.parcours_id), niveau_id: String(m.niveau_id) }); setModModalOpen(true); };

  const handleModSubmit = async (e) => {
    e.preventDefault();
    const validationErr = runValidators([
      () => validateAlphanumericCode(modForm.code, 'Le code du module'),
      () => !modForm.libelle.trim() ? 'Le libellé est requis.' : null,
      () => validateInteger(modForm.credits, 'Les crédits', { min: 1, max: 30 }),
      () => !modForm.parcours_id ? 'Sélectionnez un parcours.' : null,
      () => !modForm.niveau_id ? 'Sélectionnez un niveau.' : null,
    ]);
    if (validationErr) { toast.error(validationErr); return; }

    setSavingMod(true);
    try {
      const payload = { ...modForm, credits: parseInt(modForm.credits), parcours_id: parseInt(modForm.parcours_id), niveau_id: parseInt(modForm.niveau_id) };
      if (editingMod) { await moduleApi.update(editingMod.id, payload); toast.success('Module modifié'); }
      else { await moduleApi.create(payload); toast.success('Module ajouté'); }
      setModModalOpen(false); loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setSavingMod(false); }
  };

  const confirmDeleteMod = async () => {
    try { await moduleApi.delete(deletingModId); toast.success('Supprimé'); loadData(); }
    catch (err) { toast.error(typeof err === 'string' ? err : 'Impossible de supprimer'); }
    finally { setModConfirmOpen(false); }
  };

  // MATIERE
  const filteredMat = matieres.filter(m => `${m.code} ${m.libelle} ${m.type_matiere}`.toLowerCase().includes(searchMat.toLowerCase()));
  const openAddMat = () => { setEditingMat(null); setMatForm({ code: '', libelle: '', coefficient: '1', volume_horaire: '', type_matiere: 'CM', module_id: '', enseignant_id: '' }); setMatModalOpen(true); };
  const openEditMat = (m) => { setEditingMat(m); setMatForm({ code: m.code, libelle: m.libelle, coefficient: String(m.coefficient), volume_horaire: m.volume_horaire ? String(m.volume_horaire) : '', type_matiere: m.type_matiere, module_id: String(m.module_id), enseignant_id: m.enseignant_id ? String(m.enseignant_id) : '' }); setMatModalOpen(true); };

  const handleMatSubmit = async (e) => {
    e.preventDefault();
    const validationErr = runValidators([
      () => validateAlphanumericCode(matForm.code, 'Le code de la matière'),
      () => !matForm.libelle.trim() ? 'Le libellé est requis.' : null,
      () => validateDecimal(matForm.coefficient, 'Le coefficient', { min: 0.5, max: 10 }),
      () => matForm.volume_horaire ? validateInteger(matForm.volume_horaire, 'Le volume horaire', { min: 1 }) : null,
      () => !matForm.module_id ? 'Sélectionnez un module.' : null,
    ]);
    if (validationErr) { toast.error(validationErr); return; }

    setSavingMat(true);
    try {
      const payload = { 
        ...matForm, 
        coefficient: parseFloat(matForm.coefficient), 
        volume_horaire: matForm.volume_horaire ? parseInt(matForm.volume_horaire) : null, 
        module_id: parseInt(matForm.module_id),
        enseignant_id: matForm.enseignant_id ? parseInt(matForm.enseignant_id) : null
      };
      if (editingMat) { await matiereApi.update(editingMat.id, payload); toast.success('Matière modifiée'); }
      else { await matiereApi.create(payload); toast.success('Matière ajoutée'); }
      setMatModalOpen(false); loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setSavingMat(false); }
  };

  const confirmDeleteMat = async () => {
    try { await matiereApi.delete(deletingMatId); toast.success('Supprimée'); loadData(); }
    catch (err) { toast.error(typeof err === 'string' ? err : 'Impossible de supprimer'); }
    finally { setMatConfirmOpen(false); }
  };

  const typeColor = (t) => ({ CM: 'primary', TD: 'info', TP: 'success', PROJET: 'warning' }[t] || 'default');

  return (
    <div className="space-y-8 animate-fade-in relative">
       <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] -z-10" />

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text)]">Modules & Matières</h1>
          <p className="text-sm font-medium mt-2 text-[var(--color-text-secondary)]">Configurer le socle des unités d'enseignement</p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" onClick={openAddMod} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Module</Button>
          <Button size="sm" onClick={openAddMat} className="gap-2"><Plus className="w-4 h-4" /> Matière</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* MODULES */}
        <Card className="animate-fade-in-delay-1 border-t-4 border-t-emerald-500">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-500" /> Modules</CardTitle><CardDescription>Unités d'enseignement majeures ({modules.length})</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6 group w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input value={searchMod} onChange={(e) => setSearchMod(e.target.value)} placeholder="Rechercher par code, libellé..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
            </div>
            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div> :
            filteredMod.length === 0 ? <EmptyState icon={Layers} title="Aucun module" /> :
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Libellé</TableHead><TableHead>Semestre / Crédits</TableHead><TableHead>Parcours</TableHead><TableHead>Niveau</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredMod.map((m, i) => (
                  <TableRow key={m.id} className="group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <TableCell><span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{m.code}</span></TableCell>
                    <TableCell className="font-bold text-slate-800">{m.libelle}</TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <Badge variant="info">{m.semestre}</Badge>
                         <span className="text-sm font-semibold text-slate-500">{m.credits} cr.</span>
                       </div>
                    </TableCell>
                    <TableCell><span className="font-medium text-slate-700">{m.parcours?.libelle || '-'}</span></TableCell>
                    <TableCell><Badge variant="primary">{m.niveau?.libelle || '-'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 transition-opacity">
                        <Button variant="outline" size="sm" onClick={() => openEditMod(m)} className="!px-2 h-8 text-emerald-500"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="danger" size="sm" onClick={() => { setDeletingModId(m.id); setModConfirmOpen(true); }} className="!px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
          </CardContent>
        </Card>

        {/* MATIERES */}
        <Card className="animate-fade-in-delay-2 border-t-4 border-t-teal-500">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><CardTitle className="flex items-center gap-2"><BookCopy className="w-5 h-5 text-teal-500" /> Matières</CardTitle><CardDescription>Composants des modules ({matieres.length})</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6 group w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
              <input value={searchMat} onChange={(e) => setSearchMat(e.target.value)} placeholder="Rechercher une matière..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] focus:bg-white focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none" />
            </div>
            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div> :
            filteredMat.length === 0 ? <EmptyState icon={BookCopy} title="Aucune matière" /> :
            <Table>
              <TableHeader><TableRow><TableHead>Contenu</TableHead><TableHead>Type</TableHead><TableHead>Détails</TableHead><TableHead>Enseignant Responsable</TableHead><TableHead>Module Parent</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredMat.map((m, i) => (
                  <TableRow key={m.id} className="group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-teal-600 text-xs mb-0.5">{m.code}</span>
                         <span className="font-bold text-slate-800 text-base">{m.libelle}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={typeColor(m.type_matiere)}>{TYPE_MATIERE_LABELS[m.type_matiere] || m.type_matiere}</Badge></TableCell>
                    <TableCell>
                       <div className="text-xs font-semibold text-slate-600 space-y-0.5">
                          <p>Coef: {m.coefficient}</p>
                          {m.volume_horaire && <p className="text-slate-400">Vol: {m.volume_horaire}h</p>}
                       </div>
                    </TableCell>
                    <TableCell>
                      {m.enseignant ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                             {m.enseignant.nom.charAt(0)}{m.enseignant.prenom.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{m.enseignant.nom} {m.enseignant.prenom}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell><span className="font-semibold text-slate-700">{m.module?.libelle || '-'}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 transition-opacity">
                        <Button variant="outline" size="sm" onClick={() => openEditMat(m)} className="!px-2 h-8 text-emerald-500"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="danger" size="sm" onClick={() => { setDeletingMatId(m.id); setMatConfirmOpen(true); }} className="!px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
          </CardContent>
        </Card>
      </div>

      {/* Module Modal */}
      <Modal open={modModalOpen} onClose={() => setModModalOpen(false)} title={editingMod ? 'Modifier le module' : 'Ajouter un module'} size="lg">
        <form onSubmit={handleModSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Code" value={modForm.code} onChange={(e) => setModForm({...modForm, code: e.target.value})} required placeholder="Ex: INF301" />
            <Input label="Libellé" value={modForm.libelle} onChange={(e) => setModForm({...modForm, libelle: e.target.value})} required placeholder="Ex: Algorithmique" />
            <Input label="Crédits" type="number" min="1" max="30" value={modForm.credits} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setModForm({...modForm, credits: e.target.value}); }} required />
            <Select label="Semestre" value={modForm.semestre} onChange={(e) => setModForm({...modForm, semestre: e.target.value})} required options={SEMESTRES.map(s => ({value: s, label: s}))} />
            <Select label="Parcours" value={modForm.parcours_id} onChange={(e) => setModForm({...modForm, parcours_id: e.target.value})} required options={parcours.map(p => ({value: String(p.id), label: `${p.libelle} (${p.mention?.libelle || ''})`}))} />
            <Select label="Niveau" value={modForm.niveau_id} onChange={(e) => setModForm({...modForm, niveau_id: e.target.value})} required options={niveaux.map(n => ({value: String(n.id), label: n.libelle}))} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <Button variant="ghost" type="button" onClick={() => setModModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={savingMod}>{savingMod && <Loader2 className="w-5 h-5 animate-spin" />}{editingMod ? 'Sauvegarder' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>

      {/* Matiere Modal */}
      <Modal open={matModalOpen} onClose={() => setMatModalOpen(false)} title={editingMat ? 'Modifier la matière' : 'Ajouter une matière'} size="lg">
        <form onSubmit={handleMatSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Code" value={matForm.code} onChange={(e) => setMatForm({...matForm, code: e.target.value})} required placeholder="Ex: INF301-CM" />
            <Input label="Libellé" value={matForm.libelle} onChange={(e) => setMatForm({...matForm, libelle: e.target.value})} required placeholder="Nom de la matière" />
            <Input label="Coefficient" type="number" min="0.5" max="10" step="0.5" value={matForm.coefficient} onChange={(e) => setMatForm({...matForm, coefficient: e.target.value})} required />
            <Input label="Volume horaire (h)" type="number" min="1" value={matForm.volume_horaire} onChange={(e) => setMatForm({...matForm, volume_horaire: e.target.value})} placeholder="Ex: 30" />
            <Select label="Type" value={matForm.type_matiere} onChange={(e) => setMatForm({...matForm, type_matiere: e.target.value})} required options={TYPES_MATIERE} />
            <Select label="Module Parent" value={matForm.module_id} onChange={(e) => setMatForm({...matForm, module_id: e.target.value})} required options={modules.map(m => ({value: String(m.id), label: `${m.code} - ${m.libelle}`}))} />
            <div className="sm:col-span-2">
              <Select label="Enseignant Responsable" value={matForm.enseignant_id} onChange={(e) => setMatForm({...matForm, enseignant_id: e.target.value})} options={enseignants.map(ens => ({value: String(ens.id), label: `${ens.nom} ${ens.prenom} (${ens.grade})`}))} placeholder="Sélectionner un enseignant..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <Button variant="ghost" type="button" onClick={() => setMatModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={savingMat}>{savingMat && <Loader2 className="w-5 h-5 animate-spin" />}{editingMat ? 'Sauvegarder' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={modConfirmOpen} onClose={() => setModConfirmOpen(false)} onConfirm={confirmDeleteMod} title="Supprimer le module ?" message="Cette action est définitive." />
      <ConfirmDialog open={matConfirmOpen} onClose={() => setMatConfirmOpen(false)} onConfirm={confirmDeleteMat} title="Supprimer la matière ?" message="Cette action est définitive." />
    </div>
  );
}
