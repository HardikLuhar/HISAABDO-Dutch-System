import React, { useState, useEffect, useCallback } from 'react';
import { SettlementClaim } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  Banknote,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldAlert
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

  // Poll for pending settlement claims for current user (as receiver)
  const checkPendingClaims = useCallback(async () => {
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
  }, [user, activeClaim]);

  useEffect(() => {
    if (!user) return;
    checkPendingClaims();

    // Check frequently (every 4 seconds) so the pop-up appears quickly
    const interval = setInterval(checkPendingClaims, 4000);

    // Also check immediately when the user returns to the tab/window
    const onFocus = () => checkPendingClaims();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user, checkPendingClaims]);

  if (!activeClaim) return null;

  // 1. "De diye" -> Settles all amounts across every group automatically
  const handleAccept = async () => {
    if (!activeClaim) return;
    setIsProcessing(true);
    try {
      const res = await api.acceptSettlementClaim(activeClaim.id);
      try {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch {
        // ignore
      }
      showToast(
        `Payment confirmed! All debts settled across ${res.settledCount} groups. 🎉`,
        'success'
      );

      // Remove from pending list & advance to next claim if any
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

  // 2. "Nai diye" -> Declines payment; sender gets message that payment is declined
  const handleReject = async () => {
    if (!activeClaim) return;
    setIsProcessing(true);
    try {
      await api.rejectSettlementClaim(
        activeClaim.id,
        'Receiver reported payment was not received'
      );
      showToast(
        `Claim declined. ${activeClaim.payerName} has been notified to pay again or settle again.`,
        'info'
      );

      // Remove from pending list & advance to next claim if any
      const remaining = claims.filter(c => c.id !== activeClaim.id);
      setClaims(remaining);
      setActiveClaim(remaining[0] || null);
    } catch (err: any) {
      showToast(err.message || 'Failed to decline settlement', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const isCash = activeClaim.paymentMethod === 'CASH';

  return (
    <div
      className="fixed inset-0 z-[100] w-full min-h-screen bg-slate-950/95 backdrop-blur-xl overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      id="payment-verification-fullscreen-overlay"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-indigo-500/50 dark:border-indigo-400/40 overflow-hidden flex flex-col my-auto transition-colors animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Attention Alert Header */}
        <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block">
                Verification Required
              </span>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight text-white/90">
                Payment Confirmation Prompt
              </h4>
            </div>
          </div>
          {claims.length > 1 && (
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
              1 of {claims.length}
            </span>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-8 space-y-6 text-center">
          {/* Payer Avatar with Pulse Glow */}
          <div className="flex justify-center">
            <div className="relative">
              {activeClaim.payerAvatar ? (
                <img
                  src={activeClaim.payerAvatar}
                  alt={activeClaim.payerName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl ring-4 ring-indigo-500/40"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-3xl flex items-center justify-center shadow-xl ring-4 ring-indigo-500/40">
                  {activeClaim.payerName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 text-white rounded-full shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Prominent Hindi/Hinglish Headline */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                {activeClaim.payerName}
              </span>{' '}
              bol raha hai ki usne paise de diye!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Kya aapko yeh amount mil gaya hai? Check karke confirm karein.
            </p>
          </div>

          {/* Amount Box with Payment Method */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-50/80 to-emerald-50/60 dark:from-indigo-950/40 dark:to-emerald-950/30 border border-indigo-200/80 dark:border-indigo-800/60 shadow-inner">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Claimed Amount
            </div>
            <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(activeClaim.totalAmount, 'INR')}
            </div>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border border-slate-200 dark:border-slate-700">
              {isCash ? (
                <>
                  <Banknote className="w-4 h-4 text-amber-500" />
                  <span>Claimed via Cash</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span>Claimed via UPI Payment</span>
                </>
              )}
            </div>
          </div>

          {/* Multi-Group Settlement Breakdown */}
          <div className="text-left space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
              <span>Groups Being Settled Automatically:</span>
              <span className="text-[11px] text-slate-400">
                {activeClaim.groupDebts.length} {activeClaim.groupDebts.length === 1 ? 'group' : 'groups'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden max-h-36 overflow-y-auto">
              {activeClaim.groupDebts.map((gd) => (
                <div key={gd.groupId} className="p-2.5 px-3.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{gd.groupName}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                    {formatCurrency(gd.amount, gd.currency || 'INR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* THE 2 ACTION BUTTONS */}
          <div className="space-y-3 pt-2">
            {/* 1. BUTTON: "De diye" */}
            <button
              type="button"
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition transform active:scale-98 cursor-pointer disabled:opacity-50"
              id="claim-accept-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Settling all groups...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>De diye</span>
                </>
              )}
            </button>

            {/* 2. BUTTON: "Nai diye" */}
            <button
              type="button"
              onClick={handleReject}
              disabled={isProcessing}
              className="w-full py-3 px-5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-sm sm:text-base border border-rose-200 dark:border-rose-800/80 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              id="claim-reject-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Declining...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>Nai diye</span>
                </>
              )}
            </button>
          </div>

          {/* Reassurance text */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            Agar &quot;Nai diye&quot; dabaya toh {activeClaim.payerName} ko message chala jayega ki payment decline ho gaya hai.
          </p>
        </div>
      </div>
    </div>
  );
};
