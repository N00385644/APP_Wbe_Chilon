import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { REQUEST_STATUS_LABEL } from '../../../lib/types';
import { formatFechaHoraLima } from '../../../lib/format';

export function StatsAdmin() {
  const [stats, setStats] = useState<{ status: string; count: number }[]>([]);
  const [top, setTop] = useState<{ requested_destination: string; count: number }[]>([]);
  const [unanswered, setUnanswered] = useState<{ content: string; created_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('tour_requests').select('status');
      const map = new Map<string, number>();
      ((s ?? []) as { status: string }[]).forEach((r) => map.set(r.status, (map.get(r.status) ?? 0) + 1));
      setStats([...map.entries()].map(([status, count]) => ({ status, count })));
      const { data: d } = await supabase.from('tour_requests').select('requested_destination');
      const m2 = new Map<string, number>();
      ((d ?? []) as { requested_destination: string | null }[]).forEach((r) => {
        const k = r.requested_destination || '(sin destino)';
        m2.set(k, (m2.get(k) ?? 0) + 1);
      });
      setTop([...m2.entries()].map(([requested_destination, count]) => ({ requested_destination, count })).sort((a, b) => b.count - a.count).slice(0, 10));
      const { data: u } = await supabase.from('unanswered_questions').select('content,created_at').order('created_at', { ascending: false }).limit(20);
      setUnanswered((u ?? []) as { content: string; created_at: string }[]);
    })();
  }, []);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="flex items-center gap-2 font-bold"><BarChart3 size={16} aria-hidden /> Solicitudes por estado</h3>
        <ul className="mt-2 space-y-1">
          {stats.map((s) => <li key={s.status} className="flex justify-between"><span>{REQUEST_STATUS_LABEL[s.status] ?? s.status}</span><b>{s.count}</b></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="font-bold">Destinos más solicitados</h3>
        <ul className="mt-2 space-y-1">
          {top.map((t) => <li key={t.requested_destination} className="flex justify-between"><span>{t.requested_destination}</span><b>{t.count}</b></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="font-bold">Preguntas no respondidas por el chatbot</h3>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">
          {unanswered.map((u, i) => <li key={i} className="rounded-lg bg-stone-50 p-2">{u.content} <span className="text-stone-500">· {formatFechaHoraLima(u.created_at)}</span></li>)}
          {unanswered.length === 0 && <li>Sin registros. Aquí aparecen las consultas que el menú guiado no pudo resolver.</li>}
        </ul>
      </div>
    </div>
  );
}
