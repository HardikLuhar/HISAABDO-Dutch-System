import React, { useState } from 'react';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { KeyRound, Lock, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';

interface ChangeMemberPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  userId: string;
  userName: string;
  currentPasscode?: string;
  onSuccess?: (newPasscode: string) => void;
}

export const ChangeMemberPasswordModal: React.FC<ChangeMemberPasswordModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  userId,
  userName,
  currentPasscode,
  onSuccess
}) => {
  const { showToast } = useNotification();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      showToast('Please enter your new password', 'error');
      return;
    }
    if (cleanNew.length < 2) {
      showToast('Password must be at least 2 characters', 'error');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      showToast('Passwords do not match. Please re-enter carefully.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateMemberPasscode(groupId, userId, cleanNew);
      showToast(`Password updated! You can now log in using "${cleanNew}".`, 'success');
      if (onSuccess) onSuccess(cleanNew);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Change Group Password
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            {userName} &bull; {groupName}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {currentPasscode && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Current Password:</span>
              <span className="font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 tracking-wider">
                {currentPasscode}
              </span>
            </div>
          )}

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Set a password you will easily remember (such as 4 numbers or a short word). You will use this password every time you log in to this group.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password (e.g. 5566 or mypass)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                required
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newPassword.trim() || !confirmPassword.trim()}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
