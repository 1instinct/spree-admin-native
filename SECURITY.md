# Security Policy

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this
repository. Do not open public issues for security problems. We aim to acknowledge within
3 working days and to ship a fix or mitigation within 30 days for high-severity issues.

## Scope and design notes

- Store credentials and API keys are stored only in the platform keychain/keystore
  (`expo-secure-store`) and never sent anywhere except the store itself, unless the owner
  enables server-side Relay mode.
- Device pairing tokens issued by `spree_admin_native` are short-lived, scoped and revocable.
- Blocks extension responses are signed; the app rejects unsigned or expired responses.
- Supported versions: the latest minor release of the app, gem and relay.
