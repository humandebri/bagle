'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RecurringHoliday {
  id: string;
  name: string;
  type: 'weekly' | 'monthly';
  pattern: {
    week?: number;
    dayOfWeek: number;
  };
  is_active: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pattern: RecurringHoliday | null;
  onSave: (data: Omit<RecurringHoliday, 'id'>) => void;
}

const DAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

export default function PatternEditModal({ isOpen, onClose, pattern, onSave }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'monthly' | 'weekly'>('monthly');
  const [week, setWeek] = useState(4);
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (pattern) {
      setName(pattern.name);
      setType(pattern.type);
      setWeek(pattern.pattern.week || 4);
      setDayOfWeek(pattern.pattern.dayOfWeek);
      setIsActive(pattern.is_active);
    } else {
      // 新規作成時のデフォルト値
      setName('第4日曜日');
      setType('monthly');
      setWeek(4);
      setDayOfWeek(0);
      setIsActive(true);
    }
  }, [pattern]);

  const handleSave = () => {
    const patternData: any = {
      dayOfWeek
    };
    
    if (type === 'monthly') {
      patternData.week = week;
    }

    onSave({
      name,
      type,
      pattern: patternData,
      is_active: isActive
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {pattern ? '定期休業日パターンの編集' : '定期休業日パターンの追加'}
          </h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パターン名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：第4日曜日"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#887c5d]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイプ
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={type === 'monthly'}
                  onChange={() => setType('monthly')}
                  className="mr-2"
                />
                <span>毎月</span>
              </label>
            </div>

            {type === 'monthly' && (
              <div className="flex gap-2 items-center">
                <span>第</span>
                <select
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#887c5d]"
                >
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <span>週の</span>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#887c5d]"
                >
                  {DAY_NAMES.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="mr-2"
                />
                <span>有効</span>
              </label>
            </div>
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