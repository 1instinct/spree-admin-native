# Contributing

Thanks for helping. This project aims to be the best way to run a Spree store from a phone,
and to stay easy to fork.

## Ground rules

- **Capabilities, not versions.** Never branch on a Spree version in UI code. Add or use a
  capability (see ADR 0003).
- **Screens talk to tRPC only.** Spree payloads stay inside `packages/spree-sdk` adapters.
- **Tests first.** New adapter behaviour needs a recorded fixture and a conformance test;
  new Spree behaviour claims need a contract test.
- **Don't touch other distributions.** Upstream changes `distributions/default` only.

## Getting started (once Phase 0 lands)

```sh
corepack enable
pnpm install
pnpm spree:up 4.2      # Dockerised Spree 4.2 with sample data on :3042
pnpm dev               # Expo dev server
pnpm test              # unit tests
pnpm contract --spree 4.2
```

## Commits and changes

- Commit messages: `[Type]: Title. Changes:` followed by a numbered list (`1.` per line).
  Types: Feature, Fix, Chore, Docs, Refactor, Test.
- Package changes need a Changeset (`pnpm changeset`).
- Architecture changes need an ADR; extension API changes need an RFC in Discussions first.

## Reporting compatibility

If something doesn't work with your Spree version, open a **Compatibility report** issue
with your Spree version, installed Spree extensions and the capability shown in
*More → About this store*.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
