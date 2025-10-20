import React, { useEffect, useState } from 'react';
import api from '../services/api';

type EventEntry = {
  timestamp: string;
  actor?: string | number | null;
  event: string;
  payload: Record<string, unknown>;
};

const LogPage: React.FC = () => {
  const [events, setEvents] = useState<EventEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get<EventEntry[]>('/log');
      setEvents(response.data.reverse());
    };
    load();
  }, []);

  return (
    <section className="space-y-4">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Olay Günlüğü</h2>
        <div className="mt-4 space-y-3">
          {events.map((entry, index) => (
            <div key={index} className="rounded border border-slate-200 p-3 text-sm text-slate-600">
              <div className="flex justify-between text-xs uppercase text-slate-400">
                <span>{new Date(entry.timestamp).toLocaleString('tr-TR')}</span>
                <span>{entry.actor ?? 'sistem'}</span>
              </div>
              <div className="mt-1 font-medium text-slate-700">{entry.event}</div>
              <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-500">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogPage;
