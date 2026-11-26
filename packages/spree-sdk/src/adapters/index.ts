import type { ApiFamily } from '../capabilities/types';
import { type CompanionPort, companion } from '../companion';
import type { SpreeAdapter } from '../ports';
import type { Transport } from '../transport';
import { adminV3Orders } from './admin-v3/orders';
import { apiV1Orders } from './api-v1/orders';
import { platformV2Orders } from './platform-v2/orders';
import { unsupportedCustomers, unsupportedProducts, unsupportedPromotions } from './unsupported';

export { mapOrder as mapAdminV3Order } from './admin-v3/mapOrder';
export { mapV1Order as mapApiV1Order } from './api-v1/mapOrder';
export { mapOrderDocument as mapPlatformV2Orders } from './platform-v2/mapOrder';
export { unsupportedCustomers, unsupportedProducts, unsupportedPromotions } from './unsupported';

/** The adapter for a store's preferred API family. `transport` must already carry auth. */
export function createAdapter(
  family: ApiFamily,
  transport: Transport,
  options: { companion?: boolean } = {},
): SpreeAdapter {
  const gem = options.companion ? companion(transport) : undefined;
  const base = baseAdapter(family, transport, gem);
  return gem ? { ...base, companion: gem } : base;
}

// Filled in per family as each area lands (products/customers, promotions).
const pending = {
  products: unsupportedProducts,
  customers: unsupportedCustomers,
  promotions: unsupportedPromotions,
};

function baseAdapter(family: ApiFamily, transport: Transport, gem?: CompanionPort): SpreeAdapter {
  switch (family) {
    case 'api-v1':
      return { family, orders: apiV1Orders(transport, gem), ...pending };
    case 'platform-v2':
      return { family, orders: platformV2Orders(transport), ...pending };
    case 'admin-v3':
      return { family, orders: adminV3Orders(transport), ...pending };
  }
}
