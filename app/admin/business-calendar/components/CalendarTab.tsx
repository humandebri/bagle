'use client';

import { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import jaLocale from '@fullcalendar/core/locales/ja';
import { format } from 'date-fns';
import DateEditModal from './DateEditModal';
import BulkOperationModal from './BulkOperationModal';
import BulkDeleteModal from './BulkDeleteModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar, Trash2 } from 'lucide-react';

interface BusinessDay {
  id: string;
  date: string;
  is_open: boolean;
  is_special: boolean;
  notes: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    is_open: boolean;
    is_special: boolean;
    notes: string | null;
  };
}

export default function CalendarTab() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<BusinessDay | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  // 営業日データを取得
  const fetchBusinessDays = useCallback(async (start: Date, end: Date) => {
    try {
      const response = await fetch(
        `/api/admin/business-calendar/days?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
      );
      
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const data = await response.json();
      const calendarEvents: CalendarEvent[] = data.days.map((day: BusinessDay) => {
        const isClosed = !day.is_open;
        return {
          id: day.id,
          title: isClosed ? '休業日' : (day.is_special ? '特別営業' : '営業日'),
          date: day.date,
          // 休業日はトーンを落とした薄いグレーに変更
          backgroundColor: isClosed ? '#e5e7eb' : (day.is_special ? '#3b82f6' : '#4ade80'),
          borderColor: isClosed ? '#d1d5db' : (day.is_special ? '#2563eb' : '#22c55e'),
          textColor: isClosed ? '#1f2937' : '#ffffff',
          classNames: day.notes ? ['has-notes'] : [],
          extendedProps: {
            is_open: day.is_open,
            is_special: day.is_special,
            notes: day.notes
          }
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching business days:', error);
      toast.error('営業日データの取得に失敗しました');
    }
  }, []);

  // 表示範囲が変わったときにデータを再取得（前後月の表示領域も含める）
  useEffect(() => {
    if (visibleRange) {
      fetchBusinessDays(visibleRange.start, visibleRange.end);
    } else {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      fetchBusinessDays(start, end);
    }
  }, [visibleRange, currentMonth, fetchBusinessDays]);

  // 日付をクリックしたとき
  const handleDateClick = (info: { dateStr: string }) => {
    const clickedDate = info.dateStr;
    setSelectedDate(clickedDate);
    
    // 既存のイベントを探す
    const existingEvent = events.find(event => event.date === clickedDate);
    if (existingEvent) {
      setSelectedDay({
        id: existingEvent.id,
        date: clickedDate,
        is_open: existingEvent.extendedProps.is_open,
        is_special: existingEvent.extendedProps.is_special,
        notes: existingEvent.extendedProps.notes
      });
    } else {
      setSelectedDay({
        id: '',
        date: clickedDate,
        is_open: true,
        is_special: false,
        notes: null
      });
    }
    
    setIsModalOpen(true);
  };

  // イベント（営業日/休業日の文言）をクリックしたとき
  const handleEventClick = (info: EventClickArg) => {
    const clickedDate = info.event.startStr;
    setSelectedDate(clickedDate);
    setSelectedDay({
      id: info.event.id,
      date: clickedDate,
      is_open: info.event.extendedProps.is_open,
      is_special: info.event.extendedProps.is_special,
      notes: info.event.extendedProps.notes
    });
    setIsModalOpen(true);
  };

  // 営業日情報を保存
  const handleSave = async (data: Omit<BusinessDay, 'id'>) => {
    try {
      const response = await fetch('/api/admin/business-calendar/days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      toast.success('営業日情報を更新しました');
      
      // 現在表示中の範囲で再取得（前後月の表示分も含める）
      if (visibleRange) {
        await fetchBusinessDays(visibleRange.start, visibleRange.end);
      } else {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        await fetchBusinessDays(start, end);
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving business day:', error);
      toast.error('保存に失敗しました');
    }
  };

  return (
    <>
      <div className="mb-4 flex gap-2 justify-end">
        <Button
          onClick={() => setIsBulkModalOpen(true)}
          variant="outline"
          size="sm"
        >
          <Calendar className="w-4 h-4 mr-2" />
          月の営業日を一括設定
        </Button>
        <Button
          onClick={() => setIsDeleteModalOpen(true)}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          期間を選択して削除
        </Button>
      </div>
      
      <div className="fc-admin-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={jaLocale}
          fixedWeekCount={false}
          showNonCurrentDates={true}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <span>特別営業</span>
        </div>
      </div>

      {selectedDate && (
        <DateEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          date={selectedDate}
          businessDay={selectedDay}
          onSave={handleSave}
        />
      )}
      
      <BulkOperationModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onComplete={async () => {
          if (visibleRange) {
            await fetchBusinessDays(visibleRange.start, visibleRange.end);
          } else {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            await fetchBusinessDays(start, end);
          }
        }}
        currentMonth={currentMonth}
      />
      
      <BulkDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onComplete={async () => {
          if (visibleRange) {
            await fetchBusinessDays(visibleRange.start, visibleRange.end);
          } else {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            await fetchBusinessDays(start, end);
          }
        }}
      />
    </>
  );
}
