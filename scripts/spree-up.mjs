#!/usr/bin/env node
// Bring up the Docker "Spree matrix" (infra/spree) and seed it.
//
//   node scripts/spree-up.mjs 4.2|6.0|all [--reset] [--no-seed] [--json]
//
//   --reset    drop the version's containers AND database volumes first
//   --no-seed  start and wait for health only
//   --json     print one JSON object with URLs and credentials (nothing else on stdout)
//
// Plain Node 22, no dependencies. Needs Docker with the compose plugin.
// Behind a TLS-intercepting proxy, the 4.2 image build picks up HTTPS_PROXY and
// SSL_CERT_FILE (or SPREE_BUILD_PROXY / SPREE_BUILD_CA_FILE) automatically.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPOSE_FILE = resolve(ROOT, 'infra/spree/docker-compose.yml');

const VERSIONS = {
  4.2: {
    service: 'spree42',
    db: 'spree42-db',
    volumes: ['spree42_pg', 'spree42_storage'],
    baseUrl: 'http://localhost:3042',
    healthPath: '/api/v2/storefront/products?per_page=1', // 4.2 has no storefront /store endpoint
    // First boot migrates + loads spree_sample inside the entrypoint (~3 min).
    healthTimeoutMs: 15 * 60_000,
    adminUrl: 'http://localhost:3042/admin',
  },
  '6.0': {
    service: 'spree60',
    db: 'spree60-db',
    volumes: ['spree60_pg', 'spree60_storage'],
    baseUrl: 'http://localhost:3060',
    healthPath: '/up',
    healthTimeoutMs: 5 * 60_000,
    adminUrl: 'http://localhost:3060/dashboard',
  },
};

const ADMIN = { email: 'admin@example.com', password: 'spree123' };

// ------------------------------------------------------------------ args
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const target = args.find((a) => !a.startsWith('--'));
const known = new Set(['--reset', '--no-seed', '--json', '--help']);
const unknown = [...flags].filter((f) => !known.has(f));

if (!target || flags.has('--help') || unknown.length || !['4.2', '6.0', 'all'].includes(target)) {
  console.error('usage: node scripts/spree-up.mjs 4.2|6.0|all [--reset] [--no-seed] [--json]');
  if (unknown.length) console.error(`unknown flag(s): ${unknown.join(' ')}`);
  process.exit(2);
}

const versions = target === 'all' ? ['4.2', '6.0'] : [target];
const json = flags.has('--json');
const log = (...m) => (json ? console.error(...m) : console.log(...m));

// --------------------------------------------------------------- helpers
function run(cmd, cmdArgs, { capture = false, env = process.env, allowFail = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: ROOT,
      env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', json ? process.stderr : 'inherit', 'inherit'],
    });
    let out = '';
    let err = '';
    if (capture) {
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !allowFail) {
        const tail = (err || out).split('\n').filter(Boolean).slice(-25).join('\n');
        reject(new Error(`${cmd} ${cmdArgs.join(' ')} exited with ${code}\n${tail}`));
      } else resolvePromise({ code, out, err });
    });
  });
}

const compose = (composeArgs, opts) => run('docker', ['compose', '-f', COMPOSE_FILE, ...composeArgs], opts);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildEnv() {
  const env = { ...process.env };
  const proxy = env.SPREE_BUILD_PROXY ?? env.HTTPS_PROXY ?? env.https_proxy;
  if (proxy) env.SPREE_BUILD_PROXY = proxy;
  const ca = env.SPREE_BUILD_CA_FILE ?? env.SSL_CERT_FILE;
  if (ca && existsSync(ca)) env.SPREE_BUILD_CA_FILE = ca;
  else delete env.SPREE_BUILD_CA_FILE;
  return env;
}

async function waitForHealth(v) {
  const cfg = VERSIONS[v];
  const url = cfg.baseUrl + cfg.healthPath;
  const deadline = Date.now() + cfg.healthTimeoutMs;
  let lastNote = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    const { out } = await compose(['ps', '--all', '--format', '{{.Service}} {{.State}}', cfg.service], {
      capture: true,
      allowFail: true,
    });
    if (/\b(exited|dead)\b/.test(out)) {
      const logs = await compose(['logs', '--tail', '60', cfg.service], { capture: true, allowFail: true });
      throw new Error(`${cfg.service} stopped while starting:\n${logs.out}${logs.err}`);
    }
    if (Date.now() - lastNote > 30_000) {
      log(`  ... waiting for ${url}`);
      lastNote = Date.now();
    }
    await sleep(3_000);
  }
  throw new Error(`${url} did not become healthy within ${cfg.healthTimeoutMs / 60_000} min`);
}

async function rails(v, script) {
  const { service } = VERSIONS[v];
  return compose(['exec', '-T', service, 'bin/rails', 'runner', script], { capture: true });
}

function parseSeedOutput(out) {
  const lines = out.split('\n');
  const summary = lines.filter((l) => l.startsWith('[seed '));
  const creds = Object.fromEntries(
    lines
      .map((l) => /^(SPREE\d\d_[A-Z0-9_]+)=(.*)$/.exec(l.trim()))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  return { summary, creds };
}

// ------------------------------------------------------------------ main
const result = {};

try {
  await run('docker', ['info', '--format', '{{.ServerVersion}}'], { capture: true }).catch(() => {
    throw new Error('Docker daemon is not reachable (is dockerd / Docker Desktop running?)');
  });

  const services = versions.flatMap((v) => [VERSIONS[v].db, VERSIONS[v].service]);

  if (flags.has('--reset')) {
    log(`==> resetting ${versions.join(', ')} (containers + volumes)`);
    await compose(['rm', '--stop', '--force', ...services], { capture: true });
    const { out: project } = await compose(['config', '--format', 'json'], { capture: true });
    const name = JSON.parse(project).name;
    for (const v of versions) {
      for (const vol of VERSIONS[v].volumes) {
        await run('docker', ['volume', 'rm', '--force', `${name}_${vol}`], {
          capture: true,
          allowFail: true,
        });
      }
    }
  }

  if (versions.includes('4.2')) {
    log('==> building spree42 image (first build ~5 min, cached afterwards)');
    await compose(['build', 'spree42'], { env: buildEnv() });
  }

  log(`==> starting ${services.join(', ')}`);
  await compose(['up', '-d', ...services]);

  for (const v of versions) {
    const cfg = VERSIONS[v];
    log(`==> waiting for Spree ${v} at ${cfg.baseUrl}`);
    await waitForHealth(v);

    if (v === '6.0' && !flags.has('--no-seed')) {
      // The image's entrypoint runs db:prepare (schema + core seeds + admin
      // from ADMIN_EMAIL/ADMIN_PASSWORD); sample data is a separate task.
      const { out } = await rails(v, 'puts "PRODUCTS=#{Spree::Product.count}"');
      if (/^PRODUCTS=0$/m.test(out)) {
        log('==> loading Spree 6 sample data (~1 min)');
        await compose(['exec', '-T', cfg.service, 'bin/rails', 'spree:load_sample_data'], { capture: true });
      }
    }

    const entry = { version: v, baseUrl: cfg.baseUrl, adminUrl: cfg.adminUrl, admin: ADMIN };
    if (!flags.has('--no-seed')) {
      log(`==> seeding Spree ${v} scenario (infra/spree/${v}/seed.rb)`);
      const { out } = await rails(v, '/seed/seed.rb');
      const { summary, creds } = parseSeedOutput(out);
      summary.forEach((l) => log(`  ${l}`));
      entry.credentials = creds;
    }
    result[v] = entry;
  }
} catch (e) {
  console.error(`\nspree-up failed: ${e.message}`);
  process.exit(1);
}

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const entry of Object.values(result)) {
    console.log(`\nSpree ${entry.version}`);
    console.log(`  base URL : ${entry.baseUrl}`);
    console.log(`  admin UI : ${entry.adminUrl}`);
    console.log(`  admin    : ${entry.admin.email} / ${entry.admin.password}`);
    for (const [k, val] of Object.entries(entry.credentials ?? {})) console.log(`  ${k} = ${val}`);
  }
}
