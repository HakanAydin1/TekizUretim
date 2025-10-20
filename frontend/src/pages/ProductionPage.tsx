import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type ScheduleItem = {
  workcenter_id: number;
  order_id: number;
  start_ts: string;
  end_ts: string;
  sequence_no: number;
};

type ScheduleDraft = {
  schedule: {
    id: number;
    version: number;
  };
  items: ScheduleItem[];
};

const ProductionPage: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleDraft | null>(null);
  const [status, setStatus] = useState<string | null>('Plan bilgisi yükleniyor...');

  const grouped = useMemo(() => {
    if (!schedule) return [] as Array<{ workcenter: number; items: ScheduleItem[] }>;
    const map = new Map<number, ScheduleItem[]>();
    schedule.items.forEach((item) => {
      map.set(item.workcenter_id, [...(map.get(item.workcenter_id) ?? []), item]);
    });
    return Array.from(map.entries()).map(([workcenter, items]) => ({
      workcenter,
      items: items.sort((a, b) => a.sequence_no - b.sequence_no)
    }));
  }, [schedule]);

  const loadCurrent = async () => {
    try {
      const response = await api.get<ScheduleDraft>('/schedule/current');
      setSchedule(response.data);
      setStatus(`Versiyon ${response.data.schedule.version}`);
    } catch (error) {
      setSchedule(null);
      setStatus('Yayınlı plan bulunamadı');
    }
  };

  useEffect(() => {
    loadCurrent();
    const apiBase = (import.meta.env.VITE_API_BASE ?? '/api') as string;
    const basePath = apiBase.startsWith('http') ? new URL(apiBase).pathname : apiBase;
    const wsHost =
      (import.meta.env.VITE_WS_BASE as string | undefined) ??
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const ws = new WebSocket(`${wsHost}${basePath.replace(/\/$/, '')}/realtime`);
    ws.onmessage = () => {
      loadCurrent();
    };
    ws.onopen = () => setStatus((prev) => prev ?? 'Canlı bağlantı hazır');
    ws.onerror = () => setStatus('Canlı bağlantı hatası');
    return () => ws.close();
  }, []);

  return (
    <section className="space-y-4">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Üretim Sırası</h2>
        <p className="text-sm text-slate-600">{status}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map(({ workcenter, items }) => (
          <div key={workcenter} className="rounded bg-white p-4 shadow">
            <h3 className="text-sm font-semibold text-slate-700">Hat {workcenter}</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {items.map((item) => (
                <li key={item.sequence_no} className="rounded border border-slate-200 p-2">
                  <div className="font-medium">Sipariş #{item.order_id}</div>
                  <div>
                    {new Date(item.start_ts).toLocaleTimeString('tr-TR')} -
                    {new Date(item.end_ts).toLocaleTimeString('tr-TR')}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductionPage;
