'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from './api';

export function useHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 60_000,
    retry: false,
  });
}
