export type NavigationProvider = 'GOOGLE_MAPS' | 'WAZE' | 'UBER' | 'INDRIVE';

export type NavigationProviderConfig = {
  provider: NavigationProvider;
  enabled: boolean;
  href: string | null;
};

/**
 * INDRIVE is intentionally dormant. A provider is renderable only when both
 * explicitly enabled and backed by a real destination. This prevents dead or
 * decorative buttons from leaking into public Direcciones507 pages.
 */
export function renderableNavigationProviders(
  providers: NavigationProviderConfig[],
): NavigationProviderConfig[] {
  return providers.filter((provider) => provider.enabled && Boolean(provider.href));
}

export function defaultNavigationProviderCapabilities(): NavigationProviderConfig[] {
  return [
    { provider: 'GOOGLE_MAPS', enabled: true, href: null },
    { provider: 'WAZE', enabled: true, href: null },
    { provider: 'UBER', enabled: true, href: null },
    { provider: 'INDRIVE', enabled: false, href: null },
  ];
}
