import {expoClient} from '@better-auth/expo/client';
import {APP_SCHEME} from '@binary/shared';
import {createAuthClient} from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

/**
 * Talks to the Binary API from the phone. The Expo plugin keeps the session
 * cookie in the device's secure storage (Keychain / Keystore) instead of a
 * browser cookie jar, so the user stays signed in between app launches.
 */
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: APP_SCHEME,
      storage: SecureStore,
    }),
  ],
});
