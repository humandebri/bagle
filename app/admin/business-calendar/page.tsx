'use client';

import { useState } from 'react';
import CalendarTab from './components/CalendarTab';
import RecurringHolidaysTab from './components/RecurringHolidaysTab';

export default function BusinessCalendarPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'holidays'>('calendar');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">営業日カレンダー管理</h1>
      
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-[#887c5d] text-[#887c5d]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            カレンダー
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'holidays'
                ? 'border-[#887c5d] text-[#887c5d]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            定期休業日
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'holidays' && <RecurringHolidaysTab />}
      </div>
    </div>
  );
}