import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = {
  allow?: Array<'admin' | 'sales' | 'planner' | 'production'>;
};

const ProtectedRoute: React.FC<Props> = ({ allow }) => {
  const {
    state: { token, role },
    hydrated
  } = useAuth();

  if (!hydrated) {
    return <div className="p-6 text-sm text-slate-500">Oturum doğrulanıyor...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allow && role && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
