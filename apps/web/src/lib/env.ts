import {z} from 'zod';

// Next.js copies NEXT_PUBLIC_* values into the bundle when it builds, so a
// missing value must fail loudly here instead of becoming "undefined/api/...".
export const API_URL = z
  .url('Set NEXT_PUBLIC_API_URL in the root .env file (see .env.example).')
  .parse(process.env.NEXT_PUBLIC_API_URL);
