import { probeStore } from '@spree-native/spree-sdk';
import { z } from 'zod';
import { publicProcedure, router, storeProcedure } from '../trpc';

export const storeRouter = router({
  /** Look at an address before sign-in: is it Spree, which API, which sign-in methods. */
  probe: publicProcedure
    .input(z.object({ url: z.string().min(3) }))
    .mutation(({ ctx, input }) =>
      probeStore(ctx.fetch ? { baseUrl: input.url, fetch: ctx.fetch } : { baseUrl: input.url }),
    ),
  current: storeProcedure.query(({ ctx }) => ctx.session.probe),
});
