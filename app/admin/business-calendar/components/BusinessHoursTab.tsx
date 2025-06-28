'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import HoursEditModal from './HoursEditModal';
import { toast } from 'sonner';

interface BusinessHours {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

const DAY_NAMES = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

export default function BusinessHoursTab() {
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [selectedDay, setSelectedDay] = useState<BusinessHours | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 営業時間データを取得
  const fetchBusinessHours = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/business-calendar/hours');
      
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const data = await response.json();
      
      // 全曜日のデータを作成（存在しない曜日はデフォルト値で）
      const allDays: BusinessHours[] = [];
      for (let i = 0; i < 7; i++) {
        const existingDay = data.hours.find((h: BusinessHours) => h.day_of_week === i);
        if (existingDay) {
          allDays.push(existingDay);
        } else {
          allDays.push({
            id: '',
            day_of_week: i,
            open_time: null,
            close_time: null,
            is_closed: false
          });
        }
      }
      
      setHours(allDays);
    } catch (error) {
      console.error('Error fetching business hours:', error);
      toast.error('営業時間データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessHours();
  }, []);

  // 編集ボタンクリック
  const handleEdit = (dayHours: BusinessHours) => {
    setSelectedDay(dayHours);
    setIsModalOpen(true);
  };

  // 営業時間を保存
  const handleSave = async (data: {
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
  }) => {
    try {
      const response = await fetch(`/api/admin/business-calendar/hours/${data.day_of_week}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          open_time: data.open_time,
          close_time: data.close_time,
          is_closed: data.is_closed
        }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      toast.success('営業時間を更新しました');
      await fetchBusinessHours();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast.error('保存に失敗しました');
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-gray-700">曜日</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">営業時間</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((dayHours) => (
              <tr key={dayHours.day_of_week} className="border-b hover:bg-gray-50">
                <td className="py-4 px-4">
                  <span className={dayHours.day_of_week === 0 ? 'text-red-500' : 
                                  dayHours.day_of_week === 6 ? 'text-blue-500' : ''}>
                    {DAY_NAMES[dayHours.day_of_week]}
                  </span>
                </td>
                <td className="py-4 px-4">
                  {dayHours.is_closed ? (
                    <span className="text-red-500">定休日</span>
                  ) : dayHours.open_time && dayHours.close_time ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{dayHours.open_time} - {dayHours.close_time}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">未設定</span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={() => handleEdit(dayHours)}
                    className="text-[#887c5d] hover:text-[#6b5f48] font-medium"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDay && (
        <HoursEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dayOfWeek={selectedDay.day_of_week}
          hours={selectedDay}
          onSave={handleSave}
        />
      )}
    </>
  );
}