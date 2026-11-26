# 3. Capability negotiation instead of version checks

- Status: Accepted · 2026-11-26

## Decision
Feature availability is a set of capabilities discovered at connect time (companion gem
endpoint first, then API probes). UI and procedures depend on capabilities, never on
Spree version numbers. Contract tests against real Spree versions prove which capabilities
each version has and generate the compatibility matrix.

## Consequences
Supporting a new Spree version means adding it to the CI matrix and, if needed, an adapter
change. No UI changes.
