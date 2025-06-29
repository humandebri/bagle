'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function BulkDeleteModal({
  isOpen,
  onClose,
  onComplete
}: BulkDeleteModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!startDate || !endDate) {
      toast.error('開始日と終了日を入力してください');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('開始日は終了日より前の日付を選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/business-calendar/days?start=${startDate}&end=${endDate}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      toast.success(
        `${format(new Date(startDate), 'yyyy年M月d日', { locale: ja })}から` +
        `${format(new Date(endDate), 'yyyy年M月d日', { locale: ja })}までの` +
        `営業日設定を削除しました`
      );
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="営業日の一括削除"
    >
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">注意</p>
            <p>選択した期間の営業日設定がすべて削除されます。</p>
            <p>この操作は取り消せません。</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">開始日</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">終了日</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        {startDate && endDate && new Date(startDate) <= new Date(endDate) && (
          <div className="bg-gray-50 rounded-md p-3 text-sm">
            <p className="text-gray-700">
              削除対象期間：
              <span className="font-medium">
                {format(new Date(startDate), 'yyyy年M月d日', { locale: ja })}
              </span>
              〜
              <span className="font-medium">
                {format(new Date(endDate), 'yyyy年M月d日', { locale: ja })}
              </span>
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !startDate || !endDate}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            削除する
          </Button>
        </div>
      </div>
    </Modal>
  );
}