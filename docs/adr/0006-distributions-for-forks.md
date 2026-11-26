# 6. Distributions folder as the fork contract

- Status: Accepted · 2026-11-26

## Decision
Brand, theme, assets, bundle identifiers, EAS project and enabled extensions live in
`distributions/<name>/`. `app.config.ts` selects one with `APP_DISTRIBUTION`. Upstream
only changes `distributions/default`; forks only change their own distribution and
`extensions/`. A scheduled workflow in each fork opens upstream sync pull requests.
