import { describe, it, expect } from 'vitest';
import { buildTourRequestPayload, clampTravelers } from '../schemas/requests';

// Regla única de construcción de solicitudes (chat + contacto usan lo mismo).
describe('buildTourRequestPayload', () => {
  it('recorta campos y calcula travelers_count', () => {
    const p = buildTourRequestPayload({
      userId: 'u1',
      draft: {
        requested_destination: 'Cumbemayo',
        preferred_date: '2026-11-20',
        adults: 2,
        children: 1,
        contact_phone: '9'.repeat(60),
        additional_notes: 'x'.repeat(5000),
      },
      tourId: null,
    });
    expect(p.status).toBe('pending');
    expect(p.travelers_count).toBe(3);
    expect(p.contact_phone!.length).toBeLessThanOrEqual(30);
    expect(p.additional_notes!.length).toBeLessThanOrEqual(2000);
  });
  it('descarta tour_id no-UUID (nunca inventa relaciones)', () => {
    const p = buildTourRequestPayload({
      userId: 'u1',
      draft: { requested_destination: 'X' },
      tourId: 'cumbemayo',
    });
    expect(p.tour_id).toBeNull();
  });
  it('acepta tour_id UUID validado', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const p = buildTourRequestPayload({ userId: 'u1', draft: { requested_destination: 'X' }, tourId: id });
    expect(p.tour_id).toBe(id);
  });
  it('clampTravelers acota a rangos válidos', () => {
    expect(clampTravelers(0, 0)).toEqual({ adults: 1, children: 0 });
    expect(clampTravelers(99, 99)).toEqual({ adults: 50, children: 50 });
  });
});
