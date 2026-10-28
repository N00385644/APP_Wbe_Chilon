import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { OverviewAdmin } from './OverviewAdmin';
import { RequestsAdmin } from './RequestsAdmin';
import { ToursAdmin } from './ToursAdmin';
import { FaqsAdmin } from './FaqsAdmin';
import { StatsAdmin } from './StatsAdmin';
import { BillingAdmin } from './BillingAdmin';

const TABS = [
  { key: 'overview', label: 'Resumen' },
  { key: 'requests', label: 'Solicitudes' },
  { key: 'tours', label: 'Tours' },
  { key: 'faqs', label: 'Preguntas frecuentes' },
  { key: 'stats', label: 'Estadísticas' },
  { key: 'billing', label: 'Facturación' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const PANEL_ID = 'admin-tabpanel';

export function AdminPanel() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const openRequest = useCallback((id: string) => {
    setFocusRequestId(id);
    setTab('requests');
  }, []);

  const consumeFocus = useCallback(() => setFocusRequestId(null), []);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % TABS.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + TABS.length) % TABS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Secciones del panel administrativo"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map(({ key, label }, index) => (
          <button
            key={key}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={`admin-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={PANEL_ID}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={`min-h-11 flex-none whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-andino-600 ${
              tab === key
                ? 'bg-andino-700 text-white shadow-sm'
                : 'border border-stone-300 bg-white text-stone-800 hover:border-stone-400 hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`admin-tab-${tab}`}
        tabIndex={0}
        className="mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-andino-600"
      >
        {tab === 'overview' && <OverviewAdmin onOpenRequest={openRequest} />}
        {tab === 'requests' && (
          <RequestsAdmin focusRequestId={focusRequestId} onFocusConsumed={consumeFocus} />
        )}
        {tab === 'tours' && <ToursAdmin />}
        {tab === 'faqs' && <FaqsAdmin />}
        {tab === 'stats' && <StatsAdmin />}
        {tab === 'billing' && <BillingAdmin />}
      </div>
    </div>
  );
}
