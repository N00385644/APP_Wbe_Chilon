import { describe, it, expect } from 'vitest';
import { coerceTourLink } from '../features/chatbot/engine/chatTree';

// Regla Fase 1 P4: un slug jamás equivale a un UUID; tour_id inválido -> null
// y la solicitud sigue válida como destino libre.
describe('vínculo tour_id de solicitudes', () => {
  it('acepta UUID válido', () => {
    expect(coerceTourLink('123e4567-e89b-12d3-a456-426614174000')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });
  it('rechaza slug como tour_id', () => {
    expect(coerceTourLink('cumbemayo')).toBeNull();
    expect(coerceTourLink('ventanillas-otuzco')).toBeNull();
  });
  it('rechaza vacío/nulo', () => {
    expect(coerceTourLink(null)).toBeNull();
    expect(coerceTourLink(undefined)).toBeNull();
    expect(coerceTourLink('')).toBeNull();
    expect(coerceTourLink('   ')).toBeNull();
  });
  it('rechaza UUID malformado', () => {
    expect(coerceTourLink('not-a-uuid')).toBeNull();
    expect(coerceTourLink('12345')).toBeNull();
  });
});
