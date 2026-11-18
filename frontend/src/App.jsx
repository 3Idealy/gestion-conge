import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Etudiants from './pages/Etudiants';
import Enseignants from './pages/Enseignants';
import MentionsParcours from './pages/MentionsParcours';
import Niveaux from './pages/Niveaux';
import ModulesMatieres from './pages/ModulesMatieres';
import Notes from './pages/Notes';
import AnneesSession from './pages/AnneesSession';
import GestionUtilisateurs from './pages/GestionUtilisateurs';
import Deliberation from './pages/Deliberation';
import Statistiques from './pages/Statistiques';
import Rapports from './pages/Rapports';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Chargement...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="etudiants" element={<Etudiants />} />
            <Route path="enseignants" element={<Enseignants />} />
            <Route path="mentions-parcours" element={<MentionsParcours />} />
            <Route path="niveaux" element={<Niveaux />} />
            <Route path="modules-matieres" element={<ModulesMatieres />} />
            <Route path="notes" element={<Notes />} />
            <Route path="annees-sessions" element={<AnneesSession />} />
            <Route path="deliberation" element={<RoleRoute roles={['admin']}><Deliberation /></RoleRoute>} />
            <Route path="statistiques" element={<Statistiques />} />
            <Route path="rapports" element={<Rapports />} />
            <Route path="utilisateurs" element={<RoleRoute roles={['admin']}><GestionUtilisateurs /></RoleRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            className: 'glass !rounded-xl !shadow-xl !border !border-[var(--color-border-card)]',
            style: {
              background: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              fontSize: '14px',
              fontWeight: '600',
              padding: '16px',
              backdropFilter: 'blur(12px)',
            },
            success: { 
              iconTheme: { primary: 'var(--color-success)', secondary: '#fff' } 
            },
            error: { 
              iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' } 
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
