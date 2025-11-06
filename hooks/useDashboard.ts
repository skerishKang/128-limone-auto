// 📁 hooks/useDashboard.ts

import { useState, useCallback } from 'react';

interface DashboardStats {
  gmail: number;
  calendar: number;
  telegram: number;
  drive: number;
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    gmail: 0,
    calendar: 0,
    telegram: 0,
    drive: 0,
  });

  const refreshAll = useCallback(async () => {
    // TODO: Implement actual data fetching
    console.log('Refreshing all widgets...');
  }, []);

  return {
    stats,
    refreshAll,
  };
}
