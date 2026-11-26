import {
  apiKeyAuth,
  createTransport,
  oauthClientCredentials,
  oauthPasswordGrant,
  probeStore,
  type StoredCredential,
  type StoreProbe,
  type TransportOptions,
} from '@spree-native/spree-sdk';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router, storeProcedure } from '../trpc';

const SignInInput = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('password'),
    url: z.string().min(3),
    email: z.string().trim().min(3),
    password: z.string().min(1),
  }),
  z.object({
    method: z.literal('oauthClient'),
    url: z.string().min(3),
    clientId: z.string().trim().min(1),
    clientSecret: z.string().min(1),
  }),
  z.object({ method: z.literal('apiKey'), url: z.string().min(3), apiKey: z.string().trim().min(8) }),
]);

export const storeRouter = router({
  /** Look at an address before sign-in: is it Spree, which API, which sign-in methods. */
  probe: publicProcedure
    .input(z.object({ url: z.string().min(3) }))
    .mutation(({ ctx, input }) =>
      probeStore(ctx.fetch ? { baseUrl: input.url, fetch: ctx.fetch } : { baseUrl: input.url }),
    ),

  /**
   * Sign in and return what the app should keep in the keychain. The router holds no state;
   * the app builds the next session from the returned credential.
   */
  signIn: publicProcedure
    .input(SignInInput)
    .mutation(async ({ ctx, input }): Promise<{ probe: StoreProbe; credential: StoredCredential }> => {
      const probe = await probeStore(
        ctx.fetch ? { baseUrl: input.url, fetch: ctx.fetch } : { baseUrl: input.url },
      );
      const options: TransportOptions = { baseUrl: probe.baseUrl };
      if (ctx.fetch) options.fetch = ctx.fetch;
      const transport = createTransport(options);
      const family = probe.preferredApi;

      if (input.method === 'apiKey') {
        if (family !== 'admin-v3')
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'API keys need Spree 5.4 or later. Sign in with email and password instead.',
          });
        return { probe, credential: apiKeyAuth(input.apiKey).serialize() };
      }
      if (input.method === 'oauthClient') {
        if (family !== 'platform-v2')
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'OAuth applications are for Spree 4.2–5.x. Use an API key instead.',
          });
        const auth = await oauthClientCredentials.signIn(transport, input);
        return { probe, credential: auth.serialize() };
      }
      if (family === 'admin-v3') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email sign-in for Spree 5.4+ is coming in this release. Use a secret API key for now.',
        });
      }
      const auth = await oauthPasswordGrant.signIn(transport, {
        email: input.email,
        password: input.password,
      });
      return { probe, credential: auth.serialize() };
    }),

  current: storeProcedure.query(({ ctx }) => ctx.session.probe),
});
