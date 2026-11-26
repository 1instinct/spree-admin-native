import type { ApiFamily } from '../capabilities/types';
import type { SpreeAdapter } from '../ports';
import type { Transport } from '../transport';
import { adminV3Orders } from './admin-v3/orders';
import { platformV2Orders } from './platform-v2/orders';

export { mapOrder as mapAdminV3Order } from './admin-v3/mapOrder';
export { mapOrderDocument as mapPlatformV2Orders } from './platform-v2/mapOrder';

/** The adapter for a store's preferred API family. `transport` must already carry auth. */
export function createAdapter(family: ApiFamily, transport: Transport): SpreeAdapter {
  switch (family) {
    case 'platform-v2':
      return { family, orders: platformV2Orders(transport) };
    case 'admin-v3':
      return { family, orders: adminV3Orders(transport) };
  }
}
