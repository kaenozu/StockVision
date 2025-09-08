import React, { useState, useEffect } from 'react';
import { WatchlistItem } from '../../types/stock';
import Button from '../UI/Button';
import { InlineErrorMessage } from '../UI/ErrorMessage';

interface EditWatchlistItemModalProps {
  item: WatchlistItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (stockCode: string, alertPriceHigh: number | null, alertPriceLow: number | null, notes: string | null) => Promise<void>;
  isSaving?: boolean;
}

export function EditWatchlistItemModal({
  item,
  isOpen,
  onClose,
  onSave,
  isSaving = false
}: EditWatchlistItemModalProps) {
  const [alertPriceHigh, setAlertPriceHigh] = useState<string>(item.alert_price_high?.toString() || '');
  const [alertPriceLow, setAlertPriceLow] = useState<string>(item.alert_price_low?.toString() || '');
  const [notes, setNotes] = useState<string>(item.notes || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAlertPriceHigh(item.alert_price_high?.toString() || '');
      setAlertPriceLow(item.alert_price_low?.toString() || '');
      setNotes(item.notes || '');
      setError(null);
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const high = alertPriceHigh ? parseFloat(alertPriceHigh) : null;
      const low = alertPriceLow ? parseFloat(alertPriceLow) : null;

      // バリデーション
      if (high !== null && isNaN(high)) {
        throw new Error('高値アラート価格は数値で入力してください');
      }
      if (low !== null && isNaN(low)) {
        throw new Error('安値アラート価格は数値で入力してください');
      }
      if (high !== null && high <= 0) {
        throw new Error('高値アラート価格は0より大きい値を入力してください');
      }
      if (low !== null && low <= 0) {
        throw new Error('安値アラート価格は0より大きい値を入力してください');
      }
      if (high !== null && low !== null && high <= low) {
        throw new Error('高値アラート価格は安値アラート価格より大きい値を入力してください');
      }

      await onSave(item.stock_code, high, low, notes || null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            アラート設定 - {item.stock_code} {item.company_name}
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <InlineErrorMessage error={error} />
            )}

            <div>
              <label htmlFor="alert-price-high" className="block text-sm font-medium text-gray-700 mb-1">
                高値アラート価格
              </label>
              <input
                id="alert-price-high"
                type="number"
                step="0.01"
                min="0"
                value={alertPriceHigh}
                onChange={(e) => setAlertPriceHigh(e.target.value)}
                placeholder="例: 5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                株価がこの価格以上になったときに通知します
              </p>
            </div>

            <div>
              <label htmlFor="alert-price-low" className="block text-sm font-medium text-gray-700 mb-1">
                安値アラート価格
              </label>
              <input
                id="alert-price-low"
                type="number"
                step="0.01"
                min="0"
                value={alertPriceLow}
                onChange={(e) => setAlertPriceLow(e.target.value)}
                placeholder="例: 3000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                株価がこの価格以下になったときに通知します
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="この銘柄についてのメモ..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {notes.length}/500
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSaving}
              disabled={isSaving}
            >
              保存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
