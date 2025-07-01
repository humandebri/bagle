'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BusinessHours {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dayOfWeek: number;
  hours: BusinessHours;
  onSave: (data: {
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
  }) => void;
}

const DAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

export default function HoursEditModal({ isOpen, onClose, dayOfWeek, hours, onSave }: Props) {
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);
  const [openTime, setOpenTime] = useState('11:00');
  const [closeTime, setCloseTime] = useState('13:00');

  useEffect(() => {
    if (hours) {
      setIsBusinessOpen(!hours.is_closed);
      setOpenTime(hours.open_time || '11:00');
      setCloseTime(hours.close_time || '13:00');
    }
  }, [hours]);

  const handleSave = () => {
    onSave({
      day_of_week: dayOfWeek,
      open_time: isBusinessOpen ? openTime : null,
      close_time: isBusinessOpen ? closeTime : null,
      is_closed: !isBusinessOpen
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{DAY_NAMES[dayOfWeek]}の営業時間</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={isBusinessOpen}
                  onChange={() => setIsBusinessOpen(true)}
                  className="mr-2"
                />
                <span>営業</span>
              </label>
              <label className="flex items-center mt-2">
                <input
                  type="radio"
                  checked={!isBusinessOpen}
                  onChange={() => setIsBusinessOpen(false)}
                  className="mr-2"
                />
                <span>定休日</span>
              </label>
            </div>

            {isBusinessOpen && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開店時間
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#887c5d]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    閉店時間
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#887c5d]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-white bg-[#887c5d] rounded-md hover:bg-[#6b5f48] transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}