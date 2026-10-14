import React, { useState } from 'react';
import { User, CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import {
  X,
  Copy,
  Check,
  Mail,
  Phone,
  CreditCard,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface MemberProfileModalProps {
  member: User | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettle?: (receiverId: string) => void;
  netBalance?: number; // Optional balance between current user and this member
  currency?: CurrencyCode | string;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  isOpen,
  onClose,
  onOpenSettle,
  netBalance,
  currency = 'INR'
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen || !member) return null;

  const isSelf = user?.id === member.id;
  const upiId = member.upiId || member.phone || '';

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    showToast('UPI ID copied to clipboard!', 'success');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId || member.email)}&pn=${encodeURIComponent(member.name)}&cu=INR&tn=${encodeURIComponent('Hisaabdo Settlement')}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Member Payment Profile</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct UPI payment credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Avatar and Basic Details */}
          <div className="flex items-center gap-4">
            <img
              src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
              alt={member.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-900 dark:text-white text-lg truncate">{member.name}</h4>
                {isSelf && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{member.email}</span>
              </p>
              {member.phone && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{member.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Optional Net Balance with focal user */}
          {netBalance !== undefined && (
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              netBalance < -0.01
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : netBalance > 0.01
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              <div className="flex items-center gap-2">
                {netBalance < -0.01 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                <span className="text-xs font-semibold">
                  {netBalance < -0.01 ? 'You owe this member:' : netBalance > 0.01 ? 'Owes you:' : 'Balance:'}
                </span>
              </div>
              <span className="text-sm font-black">
                {formatCurrency(Math.abs(netBalance), (currency as CurrencyCode) || 'INR')}
              </span>
            </div>
          )}

          {/* UPI Payment Credentials Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-800/60 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>UPI Payment Details</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                Instant Transfer
              </span>
            </div>

            {/* UPI ID Display & Copy */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 block font-medium">UPI ID / VPA</span>
                <span className="text-sm font-mono font-bold text-slate-900 dark:text-white truncate block">
                  {upiId || member.email}
                </span>
              </div>
              {upiId && (
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer flex-shrink-0"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tap <strong>Launch UPI App</strong> below to open Google Pay, PhonePe, Paytm, or BHIM directly.
            </p>

            {/* Launch UPI CTA */}
            <a
              href={upiIntentUrl}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition text-center"
            >
              <CreditCard className="w-4 h-4" />
              <span>Launch UPI App & Pay</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Hisaabdo Verified Payment Profile</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
