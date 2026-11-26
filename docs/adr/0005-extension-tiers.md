# 5. Three extension tiers

- Status: Proposed · 2026-11-26

## Context
A runtime marketplace of downloaded JavaScript would conflict with App Store guideline
2.5.2 and widen the attack surface.

## Decision
Built-in extensions (compiled in, enabled per store), Blocks extensions (server-rendered
declarative JSON with signed responses), Native extensions (compiled into a fork's
distribution). The registry is a public Git repo; listings are pull requests.
