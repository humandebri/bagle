'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

interface BulkOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentMonth: Date;
}

const weekdays = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
];

export default function BulkOperationModal({
  isOpen,
  onClose,
  onComplete,
  currentMonth
}: BulkOperationModalProps) {
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [isOpen営業, setIsOpen営業] = useState(true);
  const [isSpecial, setIsSpecial] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWeekdayToggle = (weekday: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(weekday)
        ? prev.filter(w => w !== weekday)
        : [...prev, weekday]
    );
  };

  const handleBulkAdd = async () => {
    if (selectedWeekdays.length === 0) {
      toast.error('曜日を選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/business-calendar/days', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: currentMonth.getFullYear(),
          month: currentMonth.getMonth(),
          weekdays: selectedWeekdays,
          is_open: isOpen営業,
          is_special: isSpecial,
          notes: notes || null
        }),
      });

      if (!response.ok) {
        throw new Error('一括更新に失敗しました');
      }

      const result = await response.json();
      toast.success(`${result.count}件の営業日を更新しました`);
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('一括更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="営業日の一括設定"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月の営業日を設定
          </h3>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">曜日を選択</label>
          <div className="grid grid-cols-2 gap-2">
            {weekdays.map(weekday => (
              <label
                key={weekday.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedWeekdays.includes(weekday.value)}
                  onCheckedChange={() => handleWeekdayToggle(weekday.value)}
                />
                <span className="text-sm">{weekday.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              checked={isOpen営業}
              onCheckedChange={(checked) => setIsOpen営業(!!checked)}
            />
            <span className="text-sm">営業日として設定</span>
          </label>

          {isOpen営業 && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={isSpecial}
                onCheckedChange={(checked) => setIsSpecial(!!checked)}
              />
              <span className="text-sm">特別営業日として設定</span>
            </label>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">備考・イベント情報（選択した日すべてに適用）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            rows={2}
            placeholder="例: ○○マルシェに出店、△△イベント参加、営業時間変更など"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleBulkAdd}
            disabled={loading || selectedWeekdays.length === 0}
          >
            <Calendar className="w-4 h-4 mr-2" />
            一括設定
          </Button>
        </div>
      </div>
    </Modal>
  );
}