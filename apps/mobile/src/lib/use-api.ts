import {useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';

import {apiJson} from '@/lib/api';

/**
 * Loads one API path, and loads it again each time the screen comes back
 * into view, so a list is fresh after you return from a chat.
 */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await apiJson<T>(path);
    if (result.data) {
      setData(result.data);
    }
    setError(result.error ?? '');
    setIsLoading(false);
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return {data, error, isLoading, reload};
}
