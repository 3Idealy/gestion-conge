import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Layers,
  FileText, CalendarDays, LogOut, Menu, X, ChevronRight, ArrowUpCircle, Shield, Gavel, BarChart2, Printer
} from 'lucide-react';

const allNavItems = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'enseignant', 'secretaire'] },
  { path: '/etudiants', label: 'Étudiants', icon: Users, roles: ['admin', 'secretaire'] },
  { path: '/enseignants', label: 'Enseignants', icon: GraduationCap, roles: ['admin', 'secretaire'] },
  { path: '/mentions-parcours', label: 'Mentions & Parcours', icon: BookOpen, roles: ['admin', 'secretaire'] },
  { path: '/niveaux', label: 'Niveaux', icon: ArrowUpCircle, roles: ['admin', 'secretaire'] },
  { path: '/modules-matieres', label: 'Modules & Matières', icon: Layers, roles: ['admin', 'secretaire'] },
  { path: '/notes', label: 'Notes', icon: FileText, roles: ['admin', 'enseignant', 'secretaire'] },
  { path: '/statistiques', label: 'Statistiques', icon: BarChart2, roles: ['admin', 'enseignant', 'secretaire'] },
  { path: '/rapports', label: 'Rapports', icon: Printer, roles: ['admin', 'secretaire'] },
  { path: '/annees-sessions', label: 'Années & Sessions', icon: CalendarDays, roles: ['admin', 'secretaire'] },
  { path: '/deliberation', label: 'Délibérations', icon: Gavel, roles: ['admin'] },
  { path: '/utilisateurs', label: 'Utilisateurs', icon: Shield, roles: ['admin'] },
];

const ADMIN_SECTION_PATHS = ['/niveaux', '/modules-matieres', '/annees-sessions', '/deliberation', '/utilisateurs'];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = allNavItems.filter(item => {
    if (!user) return true;
    return item.roles.includes(user.role);
  });

  const mainItems = navItems.filter(i => {
    if (user?.role === 'admin') {
      return !ADMIN_SECTION_PATHS.includes(i.path);
    }
    return !['/deliberation', '/utilisateurs'].includes(i.path);
  });

  const adminItems = user?.role === 'admin'
    ? navItems.filter(i => ADMIN_SECTION_PATHS.includes(i.path))
    : navItems.filter(i => ['/deliberation', '/utilisateurs'].includes(i.path));

  const renderNavItem = (item, index) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
          isActive
            ? 'text-white shadow-lg shadow-emerald-900/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 -z-10 rounded-xl" />
        )}
        
        <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`} />
        
        {!collapsed && (
          <span className="relative z-10 truncate">{item.label}</span>
        )}
        
        {!collapsed && isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden text-white w-full">
      <div className="flex items-center gap-3.5 px-5 py-7">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg shadow-emerald-500/20 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex-shrink-0 transition-transform hover:scale-105">
          GN
        </div>
        {!collapsed && (
          <div className="animate-fade-in flex-1 min-w-0">
            <h1 className="text-white font-extrabold text-xl tracking-tight leading-tight">GestNotes</h1>
            <p className="text-[10px] font-semibold text-emerald-300/60 uppercase tracking-widest mt-0.5">Université</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="space-y-0.5">
          {mainItems.map(renderNavItem)}
        </div>

        {adminItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="pt-5 pb-2 px-1">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Administration</p>
              </div>
            )}
            {collapsed && <div className="pt-4" />}
            <div className="space-y-0.5">
              {adminItems.map(renderNavItem)}
            </div>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/5 mt-auto">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-3 mb-3 rounded-xl bg-white/5 group cursor-pointer hover:bg-white/8 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
              <span className="text-xs font-bold text-white">{user.nom?.charAt(0)}{user.prenom?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{user.nom} {user.prenom}</p>
              <p className="text-[10px] text-slate-500 truncate font-semibold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group
            bg-white/5 hover:bg-red-500/15 text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-500/20"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-11 h-11 rounded-xl flex items-center justify-center shadow-lg bg-emerald-600 text-white border border-emerald-500/50"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-40 w-[260px] shadow-2xl transition-transform duration-300 ease-out lg:hidden glass-sidebar ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <div className={`hidden lg:block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${collapsed ? 'w-[80px]' : 'w-[260px]'}`} />
      <aside
        className={`hidden lg:flex flex-col h-screen fixed top-0 left-0 border-r border-white/5 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 glass-sidebar ${
          collapsed ? 'w-[80px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-10 w-7 h-7 rounded-full border border-slate-700/50 flex items-center justify-center shadow-lg bg-slate-800 text-slate-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all duration-200 z-50 hover:scale-110"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>
    </>
  );
}
