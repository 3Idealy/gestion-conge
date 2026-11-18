import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { Plus, Pencil, Trash2, Search, Shield, UserCheck, UserX, Loader2, Users } from 'lucide-react';
import { userApi, etudiantApi } from '../services/api';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'secretaire', label: 'Secrétaire' },
  { value: 'etudiant', label: 'Étudiant' },
];

const ROLE_BADGES = {
  admin: 'danger',
  enseignant: 'info',
  secretaire: 'warning',
  etudiant: 'primary',
};

export default function GestionUtilisateurs() {
  const [users, setUsers] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'secretaire', etudiant_id: '', actif: true });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, etdData] = await Promise.all([userApi.getAll(), etudiantApi.getAll().catch(() => [])]);
      setUsers(uData);
      setEtudiants(etdData.etudiants || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const filtered = users.filter(u => {
    const matchSearch = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ nom: '', prenom: '', email: '', password: '', role: 'secretaire', etudiant_id: '', actif: true });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, password: '', role: u.role, etudiant_id: u.etudiant_id ? String(u.etudiant_id) : '', actif: u.actif });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, etudiant_id: form.etudiant_id ? parseInt(form.etudiant_id) : null };
      if (editing && !payload.password) delete payload.password;
      if (editing) { await userApi.update(editing.id, payload); toast.success('Utilisateur modifié'); }
      else { await userApi.create(payload); toast.success('Utilisateur créé'); }
      setModalOpen(false);
      loadData();
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await userApi.delete(deletingId); toast.success('Utilisateur supprimé'); loadData(); }
    catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
    finally { setConfirmOpen(false); }
  };

  const handleToggle = async (u) => {
    try { await userApi.toggleActif(u.id); toast.success(`Utilisateur ${u.actif ? 'désactivé' : 'activé'}`); loadData(); }
    catch (err) { toast.error(typeof err === 'string' ? err : 'Erreur'); }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="absolute top-10 right-10 w-72 h-72 bg-sky-500/10 rounded-full blur-[100px] -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text)]">Gestion des Utilisateurs</h1>
          <p className="text-sm font-medium mt-2 text-[var(--color-text-secondary)]">Gérez les comptes et les rôles d'accès</p>
        </div>
        <Button onClick={openAdd} className="shadow-lg shadow-sky-500/20"><Plus className="w-5 h-5" /> Ajouter</Button>
      </div>

      <Card className="animate-fade-in-delay-1 border-t-4 border-t-sky-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-sky-500" /> Comptes utilisateurs</CardTitle>
          <CardDescription>Total : <span className="font-bold text-sky-500">{users.length}</span> utilisateur(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chercher par nom, prénom, email..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] focus:bg-white focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
              className="w-full sm:w-48 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-text-muted)] focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
              <option value="">Tous les rôles</option>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /> <span className="font-medium animate-pulse">Chargement...</span></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Aucun utilisateur" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u, i) => (
                  <TableRow key={u.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                          {u.nom?.charAt(0)}{u.prenom?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text)]">{u.nom} {u.prenom}</p>
                          {u.etudiantProfile && <p className="text-xs text-slate-400">Lié à : {u.etudiantProfile.numero_etudiant}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-slate-600 font-medium">{u.email}</span></TableCell>
                    <TableCell><Badge variant={ROLE_BADGES[u.role] || 'default'}>{u.role}</Badge></TableCell>
                    <TableCell>
                      <button onClick={() => handleToggle(u)} className="cursor-pointer">
                        <Badge variant={u.actif ? 'success' : 'danger'}>{u.actif ? 'Actif' : 'Inactif'}</Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(u)} className="!px-2 h-8 text-emerald-500"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="danger" size="sm" onClick={() => { setDeletingId(u.id); setConfirmOpen(true); }} className="!px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label={editing ? 'Mot de passe (laisser vide = inchangé)' : 'Mot de passe'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} placeholder="Min. 6 caractères" />
            <Select label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required options={ROLE_OPTIONS} />
            {form.role === 'etudiant' && (
              <Select label="Profil étudiant lié" value={form.etudiant_id} onChange={(e) => setForm({ ...form, etudiant_id: e.target.value })}
                options={etudiants.map(e => ({ value: String(e.id), label: `${e.numero_etudiant} - ${e.nom} ${e.prenom}` }))} placeholder="Sélectionner un étudiant..." />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}{editing ? 'Sauvegarder' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Supprimer l'utilisateur ?" message="Cette action est définitive." variant="danger" />
    </div>
  );
}