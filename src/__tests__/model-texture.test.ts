import { describe, expect, it } from 'vitest';
import headers from '../../public/_headers?raw';

describe('published GLB texture loading', () => {
  it('allows GLTFLoader to fetch embedded texture blobs under the production CSP', () => {
    const policy = headers.match(/Content-Security-Policy: (.+)/)![1];
    const sources = (name: string) => policy.split(';').map((value) => value.trim().split(/\s+/)).find(([directive]) => directive === name)?.slice(1);
    expect(sources('connect-src')).toContain('blob:');
    expect(sources('img-src')).toContain('blob:');
    expect(sources('script-src')).toEqual(["'self'"]);
  });
});
