import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Gösterge', roles: ['sales', 'planner', 'production', 'admin'] },
  { to: '/orders', label: 'Siparişler', roles: ['sales', 'admin'] },
  { to: '/board', label: 'Planlama Tahtası', roles: ['planner', 'admin'] },
  { to: '/production', label: 'Üretim', roles: ['production', 'planner', 'admin'] },
  { to: '/settings', label: 'Ayarlar', roles: ['admin'] },
  { to: '/log', label: 'Log', roles: ['sales', 'planner', 'production', 'admin'] }
] as const;

const AppLayout: React.FC = () => {
  const {
    state: { userName, role },
    logout
  } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-primary">Üretim Planlama</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{userName ?? 'Anonim'} ({role ?? 'rol yok'})</span>
            <button
              onClick={logout}
              className="rounded bg-primary px-3 py-1 text-white transition hover:bg-blue-600"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <nav className="w-48 space-y-2">
          {links
            .filter((link) => !role || link.roles.includes(role))
            .map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block rounded px-3 py-2 text-sm font-medium transition ${
                  pathname === link.to ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
        </nav>
        <main className="flex-1 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
