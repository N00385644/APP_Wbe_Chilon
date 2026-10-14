import { describe, it, expect } from 'vitest';
import { searchCatalog } from '../features/chatbot/engine/chatSearch';

const tours = [
  { slug: 'cumbemayo', title: 'Cumbemayo — Bosque de Piedras', destination: 'Cumbemayo', short_description: 'Acueducto preincaico y frailones' },
];
const faqs = [
  { category: 'Pagos', question: '¿Qué métodos de pago admiten?', answer: 'Yape, Plin y transferencia' },
];

describe('searchCatalog (motor del menú guiado)', () => {
  it('encuentra tour por palabra clave', () => {
    const r = searchCatalog(tours, faqs, 'Quiero ir a Cumbemayo');
    expect(r.kind).toBe('tour');
  });
  it('tolera tildes y mayúsculas', () => {
    const r = searchCatalog(tours, [], 'CUMBEMAYO');
    expect(r.kind).toBe('tour');
  });
  it('cae a FAQ si no hay tour', () => {
    const r = searchCatalog([], faqs, '¿Aceptan yape?');
    expect(r.kind).toBe('faq');
  });
  it('devuelve none si no hay match', () => {
    expect(searchCatalog([], [], 'zzzqqq').kind).toBe('none');
  });
});
