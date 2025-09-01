'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import jaLocale from '@fullcalendar/core/locales/ja';

interface CalendarEvent {
  title: string;
  date: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  classNames?: string[];
  extendedProps?: {
    notes?: string | null;
  };
}

interface BusinessDay {
  date: string;
  is_open: boolean;
  is_special?: boolean;
  notes?: string | null;
}

export default function BusinessCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    const fetchBusinessDays = async () => {
      try {
        let start: string;
        let end: string;
        if (visibleRange) {
          start = new Date(visibleRange.start).toISOString().split('T')[0];
          end = new Date(visibleRange.end).toISOString().split('T')[0];
        } else {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth();
          start = new Date(year, month, 1).toISOString().split('T')[0];
          end = new Date(year, month + 1, 0).toISOString().split('T')[0];
        }

        const response = await fetch(`/api/business-calendar?start=${start}&end=${end}`);
        const data = await response.json();

        const calendarEvents: CalendarEvent[] = data.days.map((day: BusinessDay) => {
          const isClosed = !day.is_open;
          return {
            title: isClosed ? '休業日' : (day.is_special ? '特別営業' : '営業日'),
            date: day.date,
            // 休業日はトーンを落とした薄いグレーに変更
            backgroundColor: isClosed ? '#e5e7eb' : (day.is_special ? '#3b82f6' : '#4ade80'),
            borderColor: isClosed ? '#d1d5db' : (day.is_special ? '#2563eb' : '#22c55e'),
            textColor: isClosed ? '#1f2937' : '#ffffff',
            classNames: day.notes ? ['has-notes'] : [],
            extendedProps: {
              notes: day.notes
            }
          };
        });

        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error fetching business days:', error);
        // エラー時は空の配列を設定
        setEvents([]);
      }
    };

    fetchBusinessDays();
  }, [currentMonth, visibleRange]);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <div className="fc-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale={jaLocale}
          fixedWeekCount={false}
          showNonCurrentDates={true}
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
          datesSet={(arg) => {
            setCurrentMonth(arg.view.currentStart);
            setVisibleRange({ start: arg.view.activeStart, end: arg.view.activeEnd });
          }}
          eventContent={(eventInfo) => {
            const notes = eventInfo.event.extendedProps.notes;
            return (
              <div className="fc-event-custom">
                <div className="fc-event-title">{eventInfo.event.title}</div>
                {notes && (
                  <div className="fc-event-notes text-xs mt-1">{notes}</div>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className="mt-4 flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span>営業日</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100"></div>
          <span>休業日</span>
        </div>
      </div>
    </div>
  );
}
