import React, { useState, useEffect } from 'react';
import { GroupItem, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { formatCurrency, CURRENCY_SYMBOLS } from '../utils/formatters';
import { X, CheckCircle2, ArrowRight, DollarSign, Calendar, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupItem[];
  defaultGroupId?: string;
  defaultPayerId?: string;
  defaultReceiverId?: string;
  defaultAmount?: number;
  onSettlementRecorded: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
  defaultPayerId,
  defaultReceiverId,
  defaultAmount,
  onSettlementRecorded
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || groups[0]?.id || '');
  const [payerId, setPayerId] = useState<string>('');
  const [receiverId, setReceiverId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('Paid via UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const members = currentGroup?.members || [];
  const currency = currentGroup?.defaultCurrency || 'INR';

  useEffect(() => {
    if (defaultGroupId) {
      setSelectedGroupId(defaultGroupId);
    } else if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [defaultGroupId, groups]);

  useEffect(() => {
    if (members.length >= 2) {
      setPayerId(defaultPayerId || user?.id || members[0].userId);
      const otherMember = members.find(m => m.userId !== (defaultPayerId || user?.id || members[0].userId));
      setReceiverId(defaultReceiverId || otherMember?.userId || members[1].userId);
    }
    if (defaultAmount !== undefined && defaultAmount > 0) {
      setAmount(defaultAmount.toString());
    }
  }, [selectedGroupId, defaultPayerId, defaultReceiverId, defaultAmount, members.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;

    if (numAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (payerId === receiverId) {
      showToast('Payer and receiver cannot be the same person', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createSettlement(selectedGroupId, {
        payerId,
        receiverId,
        amount: numAmount,
        date,
        notes: notes.trim()
      });

      // Joyful confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore if not supported
      }

      showToast(`Settlement of ${formatCurrency(numAmount, currency)} recorded successfully!`, 'success');
      onSettlementRecorded();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to record settlement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const payer = members.find(m => m.userId === payerId);
  const receiver = members.find(m => m.userId === receiverId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Record a Settlement</h2>
              <p className="text-[11px] text-slate-500">Record payments made to square up balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        {groups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">No groups found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              You need to join or create a group with expenses before recording settlements.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Group Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.defaultCurrency})</option>
              ))}
            </select>
          </div>

          {/* Visual Settlement Flow */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
            <div className="text-center flex-1">
              <img
                src={payer?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payer?.name || 'Payer'}`}
                alt={payer?.name || 'Payer'}
                className="w-10 h-10 rounded-full mx-auto object-cover border border-slate-200"
              />
              <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                {payer?.name} {payer?.userId === user?.id && '(You)'}
              </span>
              <span className="text-[10px] text-slate-400">Payer</span>
            </div>

            <div className="flex flex-col items-center">
              <ArrowRight className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Paid</span>
            </div>

            <div className="text-center flex-1">
              <img
                src={receiver?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${receiver?.name || 'Receiver'}`}
                alt={receiver?.name || 'Receiver'}
                className="w-10 h-10 rounded-full mx-auto object-cover border border-slate-200"
              />
              <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                {receiver?.name} {receiver?.userId === user?.id && '(You)'}
              </span>
              <span className="text-[10px] text-slate-400">Receiver</span>
            </div>
          </div>

          {/* Payer & Receiver Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Who paid?</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
              >
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} {m.userId === user?.id && '(You)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Who received?</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
              >
                {members.map(m => (
                  <option key={m.userId} value={m.userId} disabled={m.userId === payerId}>
                    {m.name} {m.userId === user?.id && '(You)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Settled ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                {CURRENCY_SYMBOLS[currency] || '₹'}
              </span>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-2.5 text-base font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method / Note</label>
              <input
                type="text"
                placeholder="e.g. Google Pay, UPI, Cash"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
