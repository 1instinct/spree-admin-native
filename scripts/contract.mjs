#!/usr/bin/env node
// `pnpm contract --spree 4.2` runs the contract suite against a store listed in infra/spree/targets.json.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const i = process.argv.indexOf('--spree');
const wanted = i > -1 ? process.argv[i + 1] : 'all';
const targets = JSON.parse(readFileSync('infra/spree/targets.json', 'utf8'));
const selected = wanted === 'all' ? targets : targets.filter((t) => t.label === wanted);
if (!selected.length) {
  console.error(`No target "${wanted}". Known: ${targets.map((t) => t.label).join(', ')}`);
  process.exit(1);
}

let failed = false;
for (const t of selected) {
  console.log(`\n▶ Spree ${t.label} at ${t.url}`);
  const env = {
    ...process.env,
    SPREE_URL: t.url,
    SPREE_LABEL: t.label,
    SPREE_EXPECT_FAMILY: t.family,
    ...t.env,
  };
  const r = spawnSync('pnpm', ['--filter', '@spree-native/spree-sdk', 'contract'], { stdio: 'inherit', env });
  failed ||= r.status !== 0;
}
spawnSync('node', ['scripts/compat-matrix.mjs'], { stdio: 'inherit' });
process.exit(failed ? 1 : 0);
