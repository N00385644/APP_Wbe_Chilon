// Contrato estático del repositorio (NO es prueba viva de Supabase).
// Lee los .sql y el toml del repo y afirma que el contrato de seguridad
// sigue declarado: RLS pending-only, triggers 0006/0007, IA deshabilitada.
// La verificación real contra staging está en docs/STAGING_RUNBOOK.md
// y sigue PENDIENTE (sin proyecto staging disponible).
import { describe, it, expect } from 'vitest';
import schema0001 from '../../supabase/migrations/0001_schema.sql?raw';
import guard0006 from '../../supabase/migrations/0006_harden_profiles.sql?raw';
import guard0007 from '../../supabase/migrations/0007_check_request_tour.sql?raw';
import configToml from '../../supabase/config.toml?raw';
import migrationsDoc from '../../docs/MIGRATIONS.md?raw';

describe('contrato estático de seguridad (repo, no DB viva)', () => {
  it('0001: inserción de solicitudes solo pending y sin auto-confirmación', () => {
    expect(schema0001).toMatch(/for insert with check \(auth\.uid\(\) = user_id and status in \('pending'\)\)/);
    expect(schema0001).toMatch(/and status in \('pending','cancelled'\)/);
    expect(schema0001).not.toMatch(/status in \('pending','confirmed'\)/);
  });
  it('0001: cliente no lee solicitudes ajenas (select propio)', () => {
    expect(schema0001).toMatch(/requests_select_own/);
    expect(schema0001).toMatch(/for select using \(auth\.uid\(\) = user_id\)/);
  });
  it('0006: guarda anti auto-admin declarada y sin tocar', () => {
    expect(guard0006).toMatch(/profiles_is_admin_guard/);
    expect(guard0006).toMatch(/prevent_is_admin_self_change/);
    expect(guard0006).toMatch(/no puede modificar su propio rol/);
  });
  it('0007: guarda de tour publicado declarada y sin tocar', () => {
    expect(guard0007).toMatch(/tour_requests_tour_published_check/);
    expect(guard0007).toMatch(/debe referenciar un tour publicado/);
  });
  it('chat-assistant sigue deshabilitado y sin código de IA en el esquema', () => {
    expect(configToml).toMatch(/enabled = false/);
    expect(schema0001).not.toMatch(/GEMINI|OPENAI|AI_PROVIDER/i);
  });
  it('documentación de migraciones cubre 0001..0007 sin renombrar 0003', () => {
    for (const f of ['0001_schema', '0002_seed_demo', '0003_tour_images', '0003_tour_schedule', '0004_seed_chilon', '0005_whatsapp_photos', '0006_harden_profiles', '0007_check_request_tour']) {
      expect(migrationsDoc, f).toContain(f);
    }
  });
});
