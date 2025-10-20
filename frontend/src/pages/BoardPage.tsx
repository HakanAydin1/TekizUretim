import React, { useState } from 'react';
import api from '../services/api';

type ScheduleItem = {
  workcenter_id: number;
  order_id: number;
  start_ts: string;
  end_ts: string;
  sequence_no: number;
};

type Schedule = {
  id: number;
  version: number;
  status: string;
};

type DraftResponse = {
  draft: {
    schedule: Schedule;
    items: ScheduleItem[];
  };
  kpi: {
    total_lateness_min: number;
    total_setup_min: number;
    change_count: number;
    avg_utilization: number;
  };
};

const BoardPage: React.FC = () => {
  const [draft, setDraft] = useState<DraftResponse['draft'] | null>(null);
  const [kpi, setKpi] = useState<DraftResponse['kpi'] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runProposal = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post<DraftResponse>('/schedule/run');
      setDraft(response.data.draft);
      setKpi(response.data.kpi);
      setMessage('Taslak oluşturuldu.');
    } catch (error) {
      setMessage('Taslak oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const publishDraft = async () => {
    if (!draft) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/schedule/publish', { schedule_id: draft.schedule.id });
      setMessage('Plan yayınlandı.');
      setDraft(null);
      setKpi(null);
    } catch (error) {
      setMessage('Yayın sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={runProposal}
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
        >
          Öneri Oluştur
        </button>
        <button
          type="button"
          onClick={publishDraft}
          disabled={!draft || loading}
          className="rounded border border-primary px-4 py-2 text-primary hover:bg-blue-50 disabled:opacity-60"
        >
          Yayınla
        </button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
      {kpi && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded bg-white p-4 shadow">
            <p className="text-xs uppercase text-slate-500">Toplam Gecikme</p>
            <p className="text-lg font-semibold text-slate-800">{kpi.total_lateness_min} dk</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-xs uppercase text-slate-500">Setup Süresi</p>
            <p className="text-lg font-semibold text-slate-800">{kpi.total_setup_min} dk</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-xs uppercase text-slate-500">Değişim Sayısı</p>
            <p className="text-lg font-semibold text-slate-800">{kpi.change_count}</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-xs uppercase text-slate-500">Ortalama Yüklenme</p>
            <p className="text-lg font-semibold text-slate-800">{Math.round(kpi.avg_utilization)} dk</p>
          </div>
        </div>
      )}
      {draft && (
        <div className="rounded bg-white p-4 shadow">
          <h2 className="text-lg font-semibold text-slate-800">Taslak #{draft.schedule.version}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Sıra</th>
                  <th className="px-3 py-2">İş Merkezi</th>
                  <th className="px-3 py-2">Sipariş</th>
                  <th className="px-3 py-2">Başlangıç</th>
                  <th className="px-3 py-2">Bitiş</th>
                </tr>
              </thead>
              <tbody>
                {[...draft.items]
                  .sort((a, b) => a.sequence_no - b.sequence_no)
                  .map((item) => (
                    <tr key={`${item.workcenter_id}-${item.sequence_no}`} className="border-b last:border-none">
                      <td className="px-3 py-2">{item.sequence_no}</td>
                      <td className="px-3 py-2">Hat {item.workcenter_id}</td>
                      <td className="px-3 py-2">#{item.order_id}</td>
                      <td className="px-3 py-2">{new Date(item.start_ts).toLocaleString('tr-TR')}</td>
                      <td className="px-3 py-2">{new Date(item.end_ts).toLocaleString('tr-TR')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default BoardPage;
