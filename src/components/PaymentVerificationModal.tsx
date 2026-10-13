import React, { useState, useEffect } from 'react';
import { SettlementClaim, CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  QrCode,
  Banknote,
  Users,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PaymentVerificationModalProps {
  onSettlementConfirmed: () => void;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  onSettlementConfirmed
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [claims, setClaims] = useState<SettlementClaim[]>([]);
  const [activeClaim, setActiveClaim] = useState<SettlementClaim | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll for pending settlement claims when user is logged in
  const checkPendingClaims = async () => {
    if (!user) return;
    try {
      const pending = await api.getPendingSettlementClaims();
      setClaims(pending);
      if (pending.length > 0 && !activeClaim) {
        setActiveClaim(pending[0]);
      } else if (pending.length === 0) {
        setActiveClaim(null);
      }
    } catch {
      // ignore network errors silently
    }
  };

  useEffect(() => {
    if (!user) return;
    checkPendingClaims();
    // Re-check periodically every 15 seconds
    const interval = setInterval(checkPendingClaims, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (!activeClaim) return null;

  const handleAccept = async () => {
    if (!activeClaim) return;
    setIsProcessing(true);
    try {
      const res = await api.acceptSettlementClaim(activeClaim.id);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      showToast(
        `Payment verified! Settled across ${res.settledCount} groups automatically. 🎉`,
        'success'
      );
      // Remove from list & advance
      const remaining = claims.filter(c => c.id !== activeClaim.id);
      setClaims(remaining);
      setActiveClaim(remaining[0] || null);
      onSettlementConfirmed();
    } catch (err: any) {
      showToast(err.message || 'Failed to accept settlement', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activeClaim) return;
    setIsProcessing(true);
    try {
      await api.rejectSettlementClaim(activeClaim.id, 'Receiver confirmed money was not received');
      showToast(`Settlement rejected. ${activeClaim.payerName} has been notified.`, 'info');
      // Remove from list & advance
      const remaining = claims.filter(c => c.id !== activeClaim.id);
      setClaims(remaining);
      setActiveClaim(remaining[0] || null);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject settlement', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const isCash = activeClaim.paymentMethod === 'CASH';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl border-2 border-indigo-500/40 dark:border-indigo-500/30 overflow-hidden max-h-[95vh] flex flex-col transition-colors animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <ShieldAlert className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-0.5">
                Action Required
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Payment Verification Request
              </h3>
            </div>
          </div>
          {claims.length > 1 && (
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
              1 of {claims.length}
            </span>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Payer and Claim Details */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {activeClaim.payerAvatar ? (
              <img
                src={activeClaim.payerAvatar}
                alt={activeClaim.payerName}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                {activeClaim.payerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Claim submitted by</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                {activeClaim.payerName}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isCash
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                }`}>
                  {isCash ? <Banknote className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                  <span>Claimed via {isCash ? 'Cash Payment' : 'QR Code Payment'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="text-center p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Amount Claimed to Have Been Paid
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
              {formatCurrency(activeClaim.totalAmount, 'INR')}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
              Did you receive this money from <strong>{activeClaim.payerName}</strong>?
            </p>
          </div>

          {/* Affected Groups List */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Groups Being Settled Automatically</span>
              <span className="text-[10px] text-slate-400">
                {activeClaim.groupDebts.length} {activeClaim.groupDebts.length === 1 ? 'group' : 'groups'}
              </span>
            </h5>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {activeClaim.groupDebts.map((gd) => (
                <div key={gd.groupId} className="p-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{gd.groupName}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(gd.amount, gd.currency || 'INR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              id="confirm-settlement-claim-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Multi-Group Settlements...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Yes, Money Received — Settle {formatCurrency(activeClaim.totalAmount, 'INR')} Now</span>
                </>
              )}
            </button>

            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm border border-rose-200 dark:border-rose-800/60 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              id="reject-settlement-claim-btn"
            >
              <XCircle className="w-4 h-4" />
              <span>No, Not Received — Reject Claim & Alert Payer</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Rejecting prevents false debt liquidations</span>
          <span>Zero-conflict guarantee</span>
        </div>
      </div>
    </div>
  );
};
