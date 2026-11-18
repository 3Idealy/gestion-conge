import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search, Check, CheckCheck, X, Settings } from 'lucide-react';
import { notificationApi } from '../../services/api';

const pageTitles = {
  '/': 'Tableau de bord',
  '/etudiants': 'Étudiants',
  '/enseignants': 'Enseignants',
  '/mentions-parcours': 'Mentions & Parcours',
  '/niveaux': 'Niveaux',
  '/modules-matieres': 'Modules & Matières',
  '/notes': 'Notes',
  '/annees-sessions': 'Années & Sessions',
  '/deliberation': 'Délibérations',
  '/utilisateurs': 'Utilisateurs',
  '/statistiques': 'Statistiques',
  '/rapports': 'Rapports',
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const pageTitle = pageTitles[location.pathname] || 'GestNotes';

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const [notifs, countData] = await Promise.all([
        notificationApi.getAll().catch(() => []),
        notificationApi.unreadCount().catch(() => ({ count: 0 })),
      ]);
      setNotifications(notifs.slice(0, 15));
      setUnreadCount(countData.count || 0);
    } catch { /* silently fail */ }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silently fail */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch { /* silently fail */ }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await notificationApi.delete(id);
      const n = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (n && !n.lu) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silently fail */ }
  };

  const getNotifIcon = (type) => {
    const icons = {
      note_publiee: '📝',
      delai_saisie: '⏰',
      deliberation: '📋',
      systeme: '⚙️',
      info: 'ℹ️',
    };
    return icons[type] || '🔔';
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-400">
        {/* Top Header Bar */}
        <header className="h-[72px] glass border-b border-[var(--color-border-card)] sticky top-0 z-20 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  {location.pathname === '/' ? `Bonjour, ${user?.prenom || 'Admin'} 👋` : pageTitle}
                </h2>
              </div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] capitalize">{date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search — masqué sur le dashboard */}
            {location.pathname !== '/' && (
            <div className="relative hidden lg:block group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
              <input 
                type="text" 
                placeholder="Recherche..." 
                className="w-56 pl-10 pr-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-[var(--color-bg-muted)] focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] transition-all outline-none"
              />
            </div>
            )}

            {/* Notification Bell — masqué sur le dashboard */}
            {location.pathname !== '/' && (
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 relative ${
                  notifOpen 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'border-[var(--color-border)] bg-white text-slate-500 hover:text-[var(--color-primary)] hover:bg-emerald-50 hover:border-emerald-200'
                }`}
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 border-2 border-white shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-50 animate-scale-in">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount} non lues</span>
                      )}
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors hover:bg-emerald-50 px-2 py-1 rounded-lg">
                          <CheckCheck className="w-3.5 h-3.5" /> Tout lire
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-slate-100/80">
                    {notifications.length === 0 ? (
                      <div className="py-14 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400">Aucune notification</p>
                        <p className="text-xs text-slate-300 mt-0.5">Vous êtes à jour!</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group cursor-pointer ${
                            !n.lu ? 'bg-emerald-50/40' : ''
                          }`}
                          onClick={() => !n.lu && handleMarkAsRead(n.id)}
                        >
                          <span className="text-base mt-0.5 flex-shrink-0">{getNotifIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.lu ? 'font-bold text-slate-800' : 'font-medium text-slate-600'} leading-snug`}>{n.titre}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {!n.lu && (
                              <button onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                                className="w-7 h-7 rounded-lg hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors" title="Lu">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNotif(n.id); }}
                              className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-400 transition-colors" title="Supprimer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {!n.lu && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* User avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-200/70 cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
               {user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-5 lg:p-8 flex-1 max-w-[1600px] w-full mx-auto relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
