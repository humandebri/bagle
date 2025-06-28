'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';
import PatternEditModal from './PatternEditModal';
import { toast } from 'sonner';

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

export default function RecurringHolidaysTab() {
  const [holidays, setHolidays] = useState<RecurringHoliday[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<RecurringHoliday | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // 定期休業日データを取得
  const fetchRecurringHolidays = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/business-calendar/recurring-holidays');
      
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const data = await response.json();
      setHolidays(data.holidays);
    } catch (error) {
      console.error('Error fetching recurring holidays:', error);
      toast.error('定期休業日データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurringHolidays();
  }, []);

  // 新規追加
  const handleCreate = () => {
    setSelectedHoliday(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  // 編集
  const handleEdit = (holiday: RecurringHoliday) => {
    setSelectedHoliday(holiday);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  // 削除
  const handleDelete = async (id: string) => {
    if (!confirm('この定期休業日パターンを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/business-calendar/recurring-holidays/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      toast.success('定期休業日パターンを削除しました');
      await fetchRecurringHolidays();
    } catch (error) {
      console.error('Error deleting recurring holiday:', error);
      toast.error('削除に失敗しました');
    }
  };

  // 保存
  const handleSave = async (data: Omit<RecurringHoliday, 'id'>) => {
    try {
      const url = isCreating
        ? '/api/admin/business-calendar/recurring-holidays'
        : `/api/admin/business-calendar/recurring-holidays/${selectedHoliday?.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      toast.success(isCreating ? '定期休業日パターンを作成しました' : '定期休業日パターンを更新しました');
      await fetchRecurringHolidays();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving recurring holiday:', error);
      toast.error('保存に失敗しました');
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <>
      <div className="mb-4">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#887c5d] text-white rounded-md hover:bg-[#6b5f48] transition"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </button>
      </div>

      {holidays.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          定期休業日パターンが登録されていません
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">パターン</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">状態</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium">{holiday.name}</div>
                      <div className="text-sm text-gray-500">
                        {holiday.type === 'monthly' && holiday.pattern.week && (
                          <>第{holiday.pattern.week}</>
                        )}
                        {DAY_NAMES[holiday.pattern.dayOfWeek]}曜日
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      holiday.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {holiday.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(holiday)}
                        className="text-[#887c5d] hover:text-[#6b5f48]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(holiday.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PatternEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pattern={selectedHoliday}
        onSave={handleSave}
      />
    </>
  );
}