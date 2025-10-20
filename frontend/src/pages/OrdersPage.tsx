import React, { useEffect, useState } from 'react';
import api from '../services/api';

type Order = {
  id: number;
  product_code: string;
  quantity: number;
  due_date: string;
  priority: number;
  is_rush: boolean;
  status: string;
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ product_code: '', quantity: 1, due_date: '', priority: 1, is_rush: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const response = await api.get<Order[]>('/orders');
      setOrders(response.data);
    } catch (err) {
      setError('Siparişler yüklenemedi');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/orders', {
        ...form,
        quantity: Number(form.quantity),
        priority: Number(form.priority),
        due_date: new Date(form.due_date).toISOString()
      });
      await loadOrders();
      setForm({ product_code: '', quantity: 1, due_date: '', priority: 1, is_rush: false });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      {error && <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Yeni Sipariş</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Ürün Kodu</label>
            <input
              value={form.product_code}
              onChange={(event) => setForm((prev) => ({ ...prev, product_code: event.target.value }))}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="P-100"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Miktar</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
              className="w-full rounded border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Termin Tarihi</label>
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
              className="w-full rounded border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Öncelik</label>
            <input
              type="number"
              min={1}
              max={5}
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.is_rush}
              onChange={(event) => setForm((prev) => ({ ...prev, is_rush: event.target.checked }))}
            />
            Acil Sipariş
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Siparişler</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Ürün</th>
                <th className="px-3 py-2">Miktar</th>
                <th className="px-3 py-2">Termin</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-none">
                  <td className="px-3 py-2">{order.id}</td>
                  <td className="px-3 py-2">{order.product_code}</td>
                  <td className="px-3 py-2">{order.quantity}</td>
                  <td className="px-3 py-2">{new Date(order.due_date).toLocaleString('tr-TR')}</td>
                  <td className="px-3 py-2 capitalize">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default OrdersPage;
