import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { Plus, Pencil, Trash2, Search, Users, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { etudiantApi, parcoursApi, niveauApi } from '../services/api';
import toast from 'react-hot-toast';
import { validateNumeric, validateName, validateEmail, validatePhone, runValidators } from '../utils/validation';

export default function Etudiants() {
  const [etudiants, setEtudiants] = useState([]);
  const [parcours, setParcours] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterParcours, setFilterParcours] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    numero_etudiant: '', nom: '', prenom: '', date_naissance: '', lieu_naissance: '',
    genre: '', email: '', telephone: '', parcours_id: '', niveau_id: '', actif: true,
  });

  useEffect(() => { loadData(); }, []);

  // Set default filters once data is loaded
  useEffect(() => {
    if (!loading && parcours.length > 0 && filterParcours === '') {
      const gb = parcours.find(p => p.libelle.toUpperCase().includes('GB') || p.libelle.toUpperCase().includes('GÉNIE'));
      if (gb) setFilterParcours(String(gb.id));
      else if (parcours.length > 0) setFilterParcours(String(parcours[0].id));
    }
    if (!loading && niveaux.length > 0 && filterNiveau === '') {
      const l1 = niveaux.find(n => n.libelle.toUpperCase().includes('L1'));
      if (l1) setFilterNiveau(String(l1.id));
      else if (niveaux.length > 0) setFilterNiveau(String(niveaux[0].id));
    }
  }, [loading, parcours, niveaux]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [etdData, parData, nivData] = await Promise.all([
        etudiantApi.getAll(),
        parcoursApi.getAll(),
        niveauApi.getAll(),
      ]);
      setEtudiants(etdData.etudiants || []);
      setParcours(parData);
      setNiveaux(nivData);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filtered = etudiants.filter(e => {
    const matchSearch = `${e.nom} ${e.prenom} ${e.numero_etudiant} ${e.email || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchParcours = !filterParcours || String(e.parcours_id) === filterParcours;
    const matchNiveau = !filterNiveau || String(e.niveau_id) === filterNiveau;
    return matchSearch && matchParcours && matchNiveau;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ numero_etudiant: '', nom: '', prenom: '', date_naissance: '', lieu_naissance: '', genre: '', email: '', telephone: '', parcours_id: '', niveau_id: '', actif: true });
    setModalOpen(true);
  };

  const openEdit = (etd) => {
    setEditing(etd);
    setForm({
      numero_etudiant: etd.numero_etudiant, nom: etd.nom, prenom: etd.prenom,
      date_naissance: etd.date_naissance || '', lieu_naissance: etd.lieu_naissance || '',
      genre: etd.genre || '', email: etd.email || '', telephone: etd.telephone || '',
      parcours_id: String(etd.parcours_id), niveau_id: String(etd.niveau_id), actif: etd.actif,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, parcours_id: parseInt(form.parcours_id), niveau_id: parseInt(form.niveau_id) };
      if (editing) {
        await etudiantApi.update(editing.id, payload);
        toast.success('Étudiant modifié avec succès');
      } else {
        await etudiantApi.create(payload);
        toast.success('Étudiant ajouté avec succès');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => { setDeletingId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    try {
      await etudiantApi.delete(deletingId);
      toast.success('Étudiant supprimé');
      loadData();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Impossible de supprimer');
    } finally {
      setConfirmOpen(false);
    }
  };

  const toggleActif = async (etd) => {
    try {
      await etudiantApi.toggleActif(etd.id);
      toast.success(`Étudiant ${etd.actif ? 'désactivé' : 'activé'}`);
      loadData();
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in relative">
      <div className="absolute top-10 right-10 w-72 h-72 bg-sky-500/10 rounded-full blur-[100px] -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text)]">Étudiants</h1>
          <p className="text-sm font-medium mt-2 text-[var(--color-text-secondary)]">Gérer le répertoire des étudiants et leurs parcours académiques</p>
        </div>
        <Button onClick={openAdd} className="shadow-lg shadow-sky-500/20"><Plus className="w-5 h-5" /> Ajouter un étudiant</Button>
      </div>

      <Card className="animate-fade-in-delay-1 border-t-4 border-t-sky-500 overflow-visible">
        <CardHeader>
          <CardTitle>Annuaire des inscrits</CardTitle>
          <CardDescription>Total : <span className="font-bold text-sky-500">{filtered.length}</span> étudiants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, matricule, email..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] focus:bg-white focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none" />
            </div>
            <select value={filterParcours} onChange={(e) => setFilterParcours(e.target.value)}
              className="w-full sm:w-56 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-text-muted)] focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
              {parcours.map(p => <option key={p.id} value={p.id}>{p.libelle}</option>)}
            </select>
            <select value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)}
              className="w-full sm:w-48 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-text-muted)] focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.libelle}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /> <span className="font-medium animate-pulse">Chargement...</span></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Aucun étudiant trouvé" description="Ajustez vos filtres de recherche." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Étudiant</TableHead>
                  <TableHead>Identité</TableHead>
                  <TableHead>Parcours</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((etd, idx) => (
                  <TableRow key={etd.id} style={{ animationDelay: `${idx * 0.05}s` }} className="animate-fade-in group">
                    <TableCell><span className="font-bold text-sky-600">{etd.numero_etudiant}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                          {etd.nom.charAt(0)}{etd.prenom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text)]">{etd.nom} {etd.prenom}</p>
                          {etd.email && <p className="text-xs text-slate-400">{etd.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm font-medium text-slate-600">{etd.parcours?.libelle || '-'}</span></TableCell>
                    <TableCell><Badge variant="primary">{etd.niveau?.libelle || '-'}</Badge></TableCell>
                    <TableCell><span className="text-xs font-medium text-slate-500">{etd.genre === 'M' ? 'Masculin' : etd.genre === 'F' ? 'Féminin' : 'Non précisé'}</span></TableCell>
                    <TableCell><Badge variant={etd.actif ? 'success' : 'danger'}>{etd.actif ? 'Actif' : 'Inactif'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => toggleActif(etd)} className="!px-2 h-8 text-sky-500" title={etd.actif ? 'Désactiver le compte' : 'Activer le compte'}>
                          {etd.actif ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(etd)} className="!px-2 h-8 text-emerald-500"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(etd.id)} className="!px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Numéro Étudiant" value={form.numero_etudiant} onChange={(e) => setForm({ ...form, numero_etudiant: e.target.value })} required disabled={!!editing} placeholder="Ex: ETU2024-001" />
            <Select label="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}
              options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} placeholder="Sélectionner..." />
            <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            <Input label="Date de naissance" type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} />
            <Input label="Lieu de naissance" value={form.lieu_naissance} onChange={(e) => setForm({ ...form, lieu_naissance: e.target.value })} placeholder="Ville de naissance" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="etudiant@univ.edu" />
            <Input label="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+261 34 ..." />
            <Select label="Parcours" value={form.parcours_id} onChange={(e) => setForm({ ...form, parcours_id: e.target.value })} required
              options={parcours.map(p => ({ value: String(p.id), label: `${p.libelle} (${p.mention?.libelle || ''})` }))} />
            <Select label="Niveau" value={form.niveau_id} onChange={(e) => setForm({ ...form, niveau_id: e.target.value })} required
              options={niveaux.map(n => ({ value: String(n.id), label: n.libelle }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}{editing ? 'Sauvegarder' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete}
        title="Supprimer l'étudiant ?" message="Êtes-vous sûr de vouloir supprimer cet étudiant ? Toutes les données relatives à ses notes et son historique seront perdues." variant="danger" confirmLabel="Oui, supprimer" />
    </div>
  );
}