import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { X, Bell, Send } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  toUserId: string;
  toName: string;
  groupId: string;
  amount: number;
  currency: CurrencyCode;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  toUserId,
  toName,
  groupId,
  amount,
  currency
}) => {
  const { showToast } = useNotification();
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await api.sendReminder({
        toUserId,
        groupId,
        amount,
        currency
      });
      showToast(`Friendly reminder sent to ${toName}!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reminder', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Send Payment Reminder</h2>
              <p className="text-[11px] text-slate-500">Notify member about pending balance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSendReminder} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900">Recipient:</span>
              <span className="font-bold text-slate-900">{toName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900">Pending Debt:</span>
              <span className="font-bold text-rose-700 text-sm">{formatCurrency(amount, currency)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message Preview
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 italic">
              "Hi {toName}, this is a friendly reminder regarding the pending balance of {formatCurrency(amount, currency)} on Hisaabdo. Whenever you have a moment to square up!"
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
