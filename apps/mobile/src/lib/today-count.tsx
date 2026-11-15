import {createContext, useCallback, useContext, useState} from 'react';

import {apiJson} from '@/lib/api';

interface TodayCount {
  /** Requests waiting for the user: the Today tab's badge. */
  pending: number;
  refresh: () => Promise<void>;
}

const TodayCountContext = createContext<TodayCount>({
  pending: 0,
  refresh: async () => {},
});

/** Shares the waiting count, so any screen that decides can update it. */
export function TodayCountProvider({children}: {children: React.ReactNode}) {
  const [pending, setPending] = useState(0);
  const refresh = useCallback(async () => {
    const {data} = await apiJson<{pending: number}>('/api/today/count');
    if (data) {
      setPending(data.pending);
    }
  }, []);
  return (
    <TodayCountContext.Provider value={{pending, refresh}}>
      {children}
    </TodayCountContext.Provider>
  );
}

export function useTodayCount() {
  return useContext(TodayCountContext);
}
