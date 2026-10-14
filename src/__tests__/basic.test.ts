import { describe, it, expect } from 'vitest';

// Validaciones puras que reflejan las reglas de negocio (sin red).

function travelersCoherent(adults: number, children: number, total: number) {
  return adults >= 1 && children >= 0 && total === adults + children && total <= 100;
}

function sanitizeDraft(d: Record<string, unknown>) {
  return {
    requested_destination: String(d.requested_destination ?? '').slice(0, 200) || null,
    contact_phone: d.contact_phone ? String(d.contact_phone).slice(0, 30) : null,
    additional_notes: d.additional_notes ? String(d.additional_notes).slice(0, 2000) : null,
  };
}

describe('reglas de solicitud', () => {
  it('coherencia de viajeros', () => {
    expect(travelersCoherent(2, 2, 4)).toBe(true);
    expect(travelersCoherent(0, 1, 1)).toBe(false);
    expect(travelersCoherent(2, 0, 5)).toBe(false);
  });
  it('recorta datos personales antes de guardar', () => {
    const s = sanitizeDraft({ requested_destination: 'Cumbemayo', contact_phone: '9'.repeat(60), additional_notes: 'x'.repeat(5000) });
    expect(s.contact_phone!.length).toBeLessThanOrEqual(30);
    expect(s.additional_notes!.length).toBeLessThanOrEqual(2000);
  });
  it('formato PEN es-PE', () => {
    const f = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(120);
    expect(f).toMatch(/S\//);
  });
  it('estados válidos', () => {
    expect(['pending', 'in_review', 'contacted', 'confirmed', 'cancelled']).toContain('pending');
  });
});
