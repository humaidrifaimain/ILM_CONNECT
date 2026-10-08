const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config({ quiet: true });

const connection =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;
if (!connection)
  throw new Error('DATABASE_URL is required to apply database migrations');
const url = new URL(connection);
if (url.hostname.endsWith('.neon.tech'))
  url.hostname = url.hostname.replace('-pooler', '');

const result = spawnSync(
  process.execPath,
  [
    path.resolve(__dirname, '../node_modules/prisma/build/index.js'),
    'migrate',
    'deploy',
  ],
  {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'inherit',
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
