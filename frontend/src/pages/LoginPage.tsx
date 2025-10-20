import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type LoginResponse = {
  access_token: string;
  role: 'admin' | 'sales' | 'planner' | 'production';
  user_name: string;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      login({ token: response.data.access_token, role: response.data.role, userName: response.data.user_name });
      navigate('/');
    } catch (err) {
      setError('Giriş başarısız, bilgileri kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded bg-white p-6 shadow">
        <h2 className="text-center text-xl font-semibold text-primary">Sisteme Giriş</h2>
        {error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="password">
            Şifre
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary py-2 text-white transition hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </button>
        <p className="text-center text-xs text-slate-400">Admin: admin@example.com / admin</p>
      </form>
    </div>
  );
};

export default LoginPage;
