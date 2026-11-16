import { describe, expect, it } from 'vitest';
import { validateBuildEnv } from '../../scripts/build-env';

const valid = { VITE_SUPABASE_URL: 'https://test-project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testing_public_key_123456' };
const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.signature`;

describe('production build configuration', () => {
  it('accepts publishable and legacy anon keys', () => {
    expect(() => validateBuildEnv(valid)).not.toThrow();
    expect(() => validateBuildEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') })).not.toThrow();
  });
  it('blocks missing inputs, placeholders and local addresses', () => {
    expect(() => validateBuildEnv({})).toThrow();
    for (const url of ['http://localhost:54321', 'https://tu-proyecto.supabase.co', 'https://example.supabase.co', 'https://user:pass@test.supabase.co']) {
      expect(() => validateBuildEnv({ ...valid, VITE_SUPABASE_URL: url })).toThrow();
    }
  });
  it('blocks privileged keys without exposing their values', () => {
    for (const key of [jwt('service_role'), 'sb_secret_secret-value', 'ci-placeholder']) {
      expect(() => validateBuildEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow(/publicable/);
    }
    expect(() => validateBuildEnv({ ...valid, VITE_SERVICE_ROLE_KEY: 'sensitive' })).toThrow(/expondría/);
  });
});
