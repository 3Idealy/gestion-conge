import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor : ajoute le token JWT si présent ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor : gestion 401 automatique ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Helper générique ──────────────────────────────────────────────────────
const handleResponse = (res) => res.data;
const handleError = (err) => {
  const message = err.response?.data?.message || err.message || 'Erreur serveur';
  throw typeof message === 'string' ? message : message.join(', ');
};

// ── AUTH ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data).then(handleResponse).catch(handleError),
  register: (data) => api.post('/auth/register', data).then(handleResponse).catch(handleError),
  me: () => api.get('/auth/me').then(handleResponse).catch(handleError),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(handleResponse).catch(handleError),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(handleResponse).catch(handleError),
};

// ── UTILISATEURS ──────────────────────────────────────────────────────────
export const userApi = {
  getAll: (params) => api.get('/users', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/users/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/users', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/users/${id}`, data).then(handleResponse).catch(handleError),
  toggleActif: (id) => api.patch(`/users/${id}/actif`).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/users/${id}`).then(() => true).catch(handleError),
};

// ── MENTIONS ──────────────────────────────────────────────────────────────
export const mentionApi = {
  getAll: () => api.get('/mentions').then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/mentions/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/mentions', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/mentions/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/mentions/${id}`).then(() => true).catch(handleError),
};

// ── PARCOURS ──────────────────────────────────────────────────────────────
export const parcoursApi = {
  getAll: () => api.get('/parcours').then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/parcours/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/parcours', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/parcours/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/parcours/${id}`).then(() => true).catch(handleError),
};

// ── NIVEAUX ───────────────────────────────────────────────────────────────
export const niveauApi = {
  getAll: () => api.get('/niveaux').then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/niveaux/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/niveaux', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/niveaux/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/niveaux/${id}`).then(() => true).catch(handleError),
};

// ── ETUDIANTS ─────────────────────────────────────────────────────────────
export const etudiantApi = {
  getAll: (params) => api.get('/etudiants', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/etudiants/${id}`).then(handleResponse).catch(handleError),
  getNotes: (id) => api.get(`/etudiants/${id}/notes`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/etudiants', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/etudiants/${id}`, data).then(handleResponse).catch(handleError),
  toggleActif: (id) => api.patch(`/etudiants/${id}/actif`).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/etudiants/${id}`).then(() => true).catch(handleError),
};

// ── ENSEIGNANTS ───────────────────────────────────────────────────────────
export const enseignantApi = {
  getAll: (params) => api.get('/enseignants', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/enseignants/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/enseignants', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/enseignants/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/enseignants/${id}`).then(() => true).catch(handleError),
};

// ── MODULES ───────────────────────────────────────────────────────────────
export const moduleApi = {
  getAll: (params) => api.get('/modules', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/modules/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/modules', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/modules/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/modules/${id}`).then(() => true).catch(handleError),
};

// ── MATIERES ──────────────────────────────────────────────────────────────
export const matiereApi = {
  getAll: (params) => api.get('/matieres', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/matieres/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/matieres', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/matieres/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/matieres/${id}`).then(() => true).catch(handleError),
};

// ── NOTES ─────────────────────────────────────────────────────────────────
export const noteApi = {
  getAll: (params) => api.get('/notes', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/notes/${id}`).then(handleResponse).catch(handleError),
  getHistorique: (id) => api.get(`/notes/${id}/historique`).then(handleResponse).catch(handleError),
  releve: (etudiantId, params) => api.get(`/notes/releve/${etudiantId}`, { params }).then(handleResponse).catch(handleError),
  create: (data) => api.post('/notes', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/notes/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/notes/${id}`).then(() => true).catch(handleError),
  validateNotes: (note_ids) => api.patch('/notes/validate', { note_ids }).then(handleResponse).catch(handleError),
  importBulk: (formData) => api.post('/notes/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(handleResponse).catch(handleError),
};

// ── ANNEES UNIVERSITAIRES ─────────────────────────────────────────────────
export const anneeApi = {
  getAll: () => api.get('/annees').then(handleResponse).catch(handleError),
  getVides: () => api.get('/annees/vides').then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/annees/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/annees', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/annees/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/annees/${id}`).then(() => true).catch(handleError),
  cloturer: (data) => api.post('/annees/cloturer', data).then(handleResponse).catch(handleError),
  setNouvelleAnnee: (data) => api.post('/annees/set-nouvelle-annee', data).then(handleResponse).catch(handleError),
};

// ── SESSIONS EXAMEN ───────────────────────────────────────────────────────
export const sessionApi = {
  getAll: (params) => api.get('/sessions', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/sessions/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/sessions', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/sessions/${id}`, data).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/sessions/${id}`).then(() => true).catch(handleError),
};

// ── DELIBERATIONS ─────────────────────────────────────────────────────────
export const deliberationApi = {
  getAll: (params) => api.get('/deliberations', { params }).then(handleResponse).catch(handleError),
  getById: (id) => api.get(`/deliberations/${id}`).then(handleResponse).catch(handleError),
  create: (data) => api.post('/deliberations', data).then(handleResponse).catch(handleError),
  update: (id, data) => api.put(`/deliberations/${id}`, data).then(handleResponse).catch(handleError),
  valider: (id) => api.patch(`/deliberations/${id}/valider`).then(handleResponse).catch(handleError),
  updateDecision: (id, decisionId, data) => api.patch(`/deliberations/${id}/decision/${decisionId}`, data).then(handleResponse).catch(handleError),
  recalculer: (id) => api.post(`/deliberations/${id}/recalculer`).then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/deliberations/${id}`).then(() => true).catch(handleError),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
export const notificationApi = {
  getAll: () => api.get('/notifications').then(handleResponse).catch(handleError),
  unreadCount: () => api.get('/notifications/unread-count').then(handleResponse).catch(handleError),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`).then(handleResponse).catch(handleError),
  markAllAsRead: () => api.patch('/notifications/read-all').then(handleResponse).catch(handleError),
  delete: (id) => api.delete(`/notifications/${id}`).then(() => true).catch(handleError),
};

// ── STATISTIQUES ──────────────────────────────────────────────────────────
export const statsApi = {
  dashboard: (params) => api.get('/stats/dashboard', { params }).then(handleResponse).catch(handleError),
  mentionsParNiveauParcours: (params) => api.get('/stats/mentions-par-niveau-parcours', { params }).then(handleResponse).catch(handleError),
  analyseEchecs: (params) => api.get('/stats/analyse-echecs', { params }).then(handleResponse).catch(handleError),
  tauxReussite: (params) => api.get('/stats/taux-reussite', { params }).then(handleResponse).catch(handleError),
  classement: (params) => api.get('/stats/classement', { params }).then(handleResponse).catch(handleError),
};

// ── EXPORT ────────────────────────────────────────────────────────────────
export const exportApi = {
  bulletinPDF: (etudiantId, params) => api.get(`/export/bulletin/${etudiantId}`, { params, responseType: 'blob' }).then(res => res.data).catch(handleError),
  pvDeliberationPDF: (id) => api.get(`/export/pv-deliberation/${id}`, { responseType: 'blob' }).then(res => res.data).catch(handleError),
  recapNotesNiveauPDF: (niveauId, params) => api.get(`/export/recap-notes-niveau/${niveauId}`, { params, responseType: 'blob' }).then(res => res.data).catch(handleError),
  download: async (url, filename) => {
    try {
      const response = await api.get(`/export/${url}`, { responseType: 'blob' });
      // Si la réponse est déjà un Blob, on l'utilise directement, sinon on le crée
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const blobURL = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobURL;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobURL);
    } catch (err) {
      handleError(err);
    }
  }
};

export default api;

