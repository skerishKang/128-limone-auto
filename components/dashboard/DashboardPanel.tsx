// 📁 components/dashboard/DashboardPanel.tsx
// 목표: 150줄 이하

import GmailWidget from './GmailWidget';
import CalendarWidget from './CalendarWidget';
import TelegramWidget from './TelegramWidget';
import DriveWidget from './DriveWidget';
import { useDashboard } from '@/hooks/useDashboard';

export default function DashboardPanel() {
  const { stats, refreshAll } = useDashboard();

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-800 p-4 space-y-4">
      <header className="flex justify-between items-center">
        <h2 className="text-lg font-bold">📊 Dashboard</h2>
        <button onClick={refreshAll} className="text-sm text-blue-500">
          새로고침
        </button>
      </header>

      <div className="space-y-3">
        <GmailWidget count={stats.gmail} />
        <CalendarWidget count={stats.calendar} />
        <TelegramWidget count={stats.telegram} />
        <DriveWidget count={stats.drive} />
      </div>
    </div>
  );
}
