import React, { useEffect, useState } from 'react';
import api from '../services/api';

type Weights = {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
};

type SetupRow = {
  from_key: string;
  to_key: string;
  setup_minutes: number;
};

const SettingsPage: React.FC = () => {
  const [weights, setWeights] = useState<Weights>({ w1: 3, w2: 5, w3: 1, w4: 2 });
  const [matrix, setMatrix] = useState<SetupRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [weightsRes, matrixRes] = await Promise.all([
          api.get<Weights>('/settings/weights'),
          api.get<SetupRow[]>('/settings/setup-matrix')
        ]);
        setWeights(weightsRes.data);
        setMatrix(matrixRes.data);
      } catch (error) {
        setMessage('Ayarlar yüklenemedi.');
      }
    };
    load();
  }, []);

  const updateWeights = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/settings/weights', weights);
      setMessage('Ağırlıklar güncellendi.');
    } catch (error) {
      setMessage('Ağırlık güncelleme hatası.');
    }
  };

  const updateMatrix = async () => {
    try {
      await api.post('/settings/setup-matrix', { rows: matrix });
      setMessage('Setup matrisi kaydedildi.');
    } catch (error) {
      setMessage('Setup matrisi kaydedilemedi.');
    }
  };

  const addRow = () => setMatrix((prev) => [...prev, { from_key: '', to_key: '', setup_minutes: 0 }]);

  return (
    <section className="space-y-6">
      {message && <div className="rounded bg-blue-50 px-4 py-2 text-sm text-blue-700">{message}</div>}
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Planlama Ağırlıkları</h2>
        <form onSubmit={updateWeights} className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {(['w1', 'w2', 'w3', 'w4'] as Array<keyof Weights>).map((key) => (
            <label key={key} className="space-y-1 text-sm text-slate-600">
              <span>{key.toUpperCase()}</span>
              <input
                type="number"
                min={0}
                max={10}
                value={weights[key]}
                onChange={(event) => setWeights((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          ))}
          <div className="sm:col-span-2 md:col-span-4">
            <button type="submit" className="rounded bg-primary px-4 py-2 text-white hover:bg-blue-600">
              Kaydet
            </button>
          </div>
        </form>
      </div>
      <div className="rounded bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Setup Matrisi</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded border border-primary px-3 py-1 text-primary hover:bg-blue-50"
          >
            Satır Ekle
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Setup (dk)</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, index) => (
                <tr key={index} className="border-b last:border-none">
                  <td className="px-3 py-2">
                    <input
                      value={row.from_key}
                      onChange={(event) =>
                        setMatrix((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, from_key: event.target.value } : item))
                        )
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.to_key}
                      onChange={(event) =>
                        setMatrix((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, to_key: event.target.value } : item))
                        )
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.setup_minutes}
                      onChange={(event) =>
                        setMatrix((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, setup_minutes: Number(event.target.value) } : item
                          )
                        )
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={updateMatrix}
          className="mt-4 rounded bg-primary px-4 py-2 text-white hover:bg-blue-600"
        >
          Kaydet
        </button>
      </div>
    </section>
  );
};

export default SettingsPage;
