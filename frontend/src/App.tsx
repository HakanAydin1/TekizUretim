import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import BoardPage from './pages/BoardPage';
import DashboardPage from './pages/DashboardPage';
import LogPage from './pages/LogPage';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import ProductionPage from './pages/ProductionPage';
import SettingsPage from './pages/SettingsPage';
import { setAuthToken } from './services/api';

const AppRoutes: React.FC = () => {
  const { state, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    setAuthToken(state.token);
  }, [hydrated, state.token]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route element={<ProtectedRoute allow={['sales', 'admin']} />}>
            <Route path="orders" element={<OrdersPage />} />
          </Route>
          <Route element={<ProtectedRoute allow={['planner', 'admin']} />}>
            <Route path="board" element={<BoardPage />} />
          </Route>
          <Route element={<ProtectedRoute allow={['production', 'planner', 'admin']} />}>
            <Route path="production" element={<ProductionPage />} />
          </Route>
          <Route element={<ProtectedRoute allow={['admin']} />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="log" element={<LogPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
