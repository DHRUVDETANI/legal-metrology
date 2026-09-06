import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { env } from '@/config/env';

describe('Phase 0 Foundation Smoke Test', () => {
  it('correctly merges CSS class names with cn()', () => {
    const result = cn('base-class', false && 'hidden', 'text-primary');
    expect(result).toBe('base-class text-primary');
  });

  it('provides safe environment configuration', () => {
    expect(env.supabaseUrl).toBeDefined();
    expect(typeof env.supabaseUrl).toBe('string');
    expect(env.cvServiceUrl).toBe('http://localhost:8000');
  });
});
