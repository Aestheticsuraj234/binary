import {existsSync} from 'node:fs';
import path from 'node:path';

import type {NextConfig} from 'next';

// The whole monorepo shares one `.env` file in the repo root. In CI or on a
// host the values come from real environment variables, so the file is optional.
const rootEnvFile = path.resolve(import.meta.dirname, '../../.env');
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source, so Next.js compiles it.
  transpilePackages: ['@binary/shared'],
};

// Next.js reads its config from the default export.
// eslint-disable-next-line no-restricted-syntax
export default nextConfig;
