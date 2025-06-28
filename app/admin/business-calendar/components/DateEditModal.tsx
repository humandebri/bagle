'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X } from 'lucide-react';

interface BusinessDay {
  id: string;
  date: string;
  is_open: boolean;
  is_special: boolean;
  notes: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  businessDay: BusinessDay | null;
  onSave: (data: Omit<BusinessDay, 'id'>) => void;
}

export default function DateEditModal({ isOpen, onClose, date, businessDay, onSave }: Props) {
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);
  const [isSpecial, setIsSpecial] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (businessDay) {
      setIsBusinessOpen(businessDay.is_open);
      setIsSpecial(businessDay.is_special);
      setNotes(businessDay.notes || '');
    } else {
      setIsBusinessOpen(true);
      setIsSpecial(false);
      setNotes('');
    }
  }, [businessDay]);

  const handleSave = () => {
    onSave({
      date,
      is_open: isBusinessOpen,
      is_special: isSpecial,
      notes: notes.trim() || null
    });
  };

  if (!isOpen) return null;

  const formattedDate = format(new Date(date), 'yyyy年M月d日', { locale: ja });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{formattedDate}の設定</h2>
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
                <span>営業日</span>
              </label>
              <label className="flex items-center mt-2">
                <input
                  type="radio"
                  checked={!isBusinessOpen}
                  onChange={() => setIsBusinessOpen(false)}
                  className="mr-2"
                />
                <span>休業日</span>
              </label>
            </div>

            {isBusinessOpen && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSpecial}
                    onChange={(e) => setIsSpecial(e.target.checked)}
                    className="mr-2"
                  />
                  <span>特別営業日</span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例：臨時休業、イベント開催など"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#887c5d]"
                rows={3}
              />
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