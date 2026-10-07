import { describe, expect, test } from 'bun:test';
import {
  defaultNavigationProviderCapabilities,
  renderableNavigationProviders,
} from './navigation-providers';

describe('navigation provider capabilities', () => {
  test('inDrive is dormant by default', () => {
    const providers = defaultNavigationProviderCapabilities();
    const inDrive = providers.find((provider) => provider.provider === 'INDRIVE');
    expect(inDrive).toEqual({ provider: 'INDRIVE', enabled: false, href: null });
  });

  test('disabled provider never renders even with a destination', () => {
    const visible = renderableNavigationProviders([
      { provider: 'INDRIVE', enabled: false, href: 'https://example.invalid/ride' },
    ]);
    expect(visible).toEqual([]);
  });

  test('enabled provider without a real destination never renders', () => {
    const visible = renderableNavigationProviders([
      { provider: 'INDRIVE', enabled: true, href: null },
    ]);
    expect(visible).toEqual([]);
  });

  test('provider renders only after explicit enablement and destination', () => {
    const provider = { provider: 'INDRIVE' as const, enabled: true, href: 'https://example.com/ride' };
    expect(renderableNavigationProviders([provider])).toEqual([provider]);
  });
});
