import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Workers Builds sets WORKERS_CI=1 (the same marker Wrangler uses).
// Keep old dashboard build commands usable without starting an endless dev server.
const cloudflareBuild = process.env.WORKERS_CI === '1';
const command = cloudflareBuild
  ? [process.env.npm_execpath, 'run', 'build']
  : [fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)), 'dev'];
if (!command[0]) throw new Error('Run this command through npm run dev:cloud.');
if (cloudflareBuild) console.log('Cloudflare Workers Builds detected: building production assets. Local dev server skipped.');
const result = spawnSync(process.execPath, command, { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
