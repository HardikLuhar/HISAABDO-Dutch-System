import React, { useState } from 'react';
import { AdminNotice } from '../types';
import { api } from '../services/api';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  Shield,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';

interface AdminNoticePopupProps {
  notice: AdminNotice;
  onAcknowledge: () => void;
}

export const AdminNoticePopup: React.FC<AdminNoticePopupProps> = ({ notice, onAcknowledge }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await api.acknowledgeNotice(notice.id);
      // Also save in localStorage to instantly prevent flash on reload
      try {
        const stored = JSON.parse(localStorage.getItem('hisaabdo_acknowledged_notices') || '[]');
        if (!stored.includes(notice.id)) {
          stored.push(notice.id);
          localStorage.setItem('hisaabdo_acknowledged_notices', JSON.stringify(stored));
        }
      } catch (e) {}
      onAcknowledge();
    } catch (err) {
      console.error('Failed to acknowledge notice:', err);
      // Close anyway so user isn't permanently locked out if offline
      onAcknowledge();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUrgent = notice.priority === 'urgent';
  const isInfo = notice.priority === 'info';

  const badgeConfig = isUrgent
    ? {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10 text-red-400',
        icon: <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />,
        label: 'URGENT ANNOUNCEMENT',
        accentGlow: 'from-red-500/20 via-orange-500/10 to-transparent'
      }
    : isInfo
    ? {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10 text-blue-400',
        icon: <Info className="w-5 h-5 text-blue-400" />,
        label: 'INFORMATION UPDATE',
        accentGlow: 'from-blue-500/20 via-indigo-500/10 to-transparent'
      }
    : {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10 text-emerald-400',
        icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
        label: 'OFFICIAL ANNOUNCEMENT',
        accentGlow: 'from-emerald-500/20 via-teal-500/10 to-transparent'
      };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto animate-in fade-in duration-300">
      {/* Background ambient decorative glow */}
      <div className={`absolute inset-0 bg-gradient-radial ${badgeConfig.accentGlow} pointer-events-none opacity-50`} />

      <div className="relative w-full max-w-3xl bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 flex flex-col my-auto text-left">
        {/* Top Header Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${badgeConfig.border} ${badgeConfig.bg}`}>
              {badgeConfig.icon}
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {badgeConfig.label}
              </span>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Sent by Hisaabdo Administrator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(notice.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Notice Content (Big, clearly readable font as requested) */}
        <div className="py-8 sm:py-10 space-y-5">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {notice.title}
          </h1>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 max-h-[50vh] overflow-y-auto">
            <p className="text-lg sm:text-2xl text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
              {notice.message}
            </p>
          </div>
        </div>

        {/* Footer Acknowledgement Action */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
            Please acknowledge this notice to proceed to your dashboard. This notice will not be shown again.
          </p>

          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
              isUrgent
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                <span>I Acknowledge & Understand</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
