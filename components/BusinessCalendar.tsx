'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import jaLocale from '@fullcalendar/core/locales/ja';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CalendarEvent {
  title: string;
  date: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export default function BusinessCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // 営業日と休業日のサンプルデータ
    // 実際の運用では、APIから取得することを想定
    const businessDays = [
      { date: '2025-01-14', isOpen: true },
      { date: '2025-01-15', isOpen: true },
      { date: '2025-01-16', isOpen: false },
      { date: '2025-01-17', isOpen: true },
      { date: '2025-01-18', isOpen: true },
      { date: '2025-01-19', isOpen: true },
      { date: '2025-01-20', isOpen: false },
    ];

    const calendarEvents: CalendarEvent[] = businessDays.map(day => ({
      title: day.isOpen ? '営業日' : '休業日',
      date: day.date,
      backgroundColor: day.isOpen ? '#4ade80' : '#f87171',
      borderColor: day.isOpen ? '#22c55e' : '#ef4444',
      textColor: '#ffffff'
    }));

    setEvents(calendarEvents);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <div className="fc-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale={jaLocale}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: 'today'
          }}
          events={events}
          height="auto"
          dayCellClassNames={(arg) => {
            const dayOfWeek = arg.date.getDay();
            if (dayOfWeek === 0) return 'fc-day-sun';
            if (dayOfWeek === 6) return 'fc-day-sat';
            return '';
          }}
          eventDisplay="block"
          dayHeaderFormat={{ weekday: 'short' }}
          aspectRatio={1.2}
        />
      </div>
      <div className="mt-4 flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span>営業日</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded"></div>
          <span>休業日</span>
        </div>
      </div>
    </div>
  );
}