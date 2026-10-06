import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Lock,
  KeyRound,
  ArrowRight,
  UserCheck,
  PlusCircle,
  Users,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Receipt,
  Check,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface PublicMember {
  userId: string;
  name: string;
  avatarUrl: string;
  role: 'admin' | 'member';
}

interface PublicGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultCurrency: string;
  inviteCode: string;
  members: PublicMember[];
}

interface GroupPortalModalProps {
  groupId: string;
  initialMemberId?: string;
  initialPasscode?: string;
  autoOpenExpense?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (groupId: string, openExpense: boolean) => void;
}

type PortalViewMode = 'unlock' | 'change-password' | 'set-password-prompt' | 'join-new';

export const GroupPortalModal: React.FC<GroupPortalModalProps> = ({
  groupId,
  initialMemberId,
  initialPasscode,
  autoOpenExpense = true,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useNotification();

  const [loadingGroup, setLoadingGroup] = useState(true);
  const [group, setGroup] = useState<PublicGroup | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialMemberId || '');
  const [passcode, setPasscode] = useState<string>(initialPasscode || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View modes
  const [viewMode, setViewMode] = useState<PortalViewMode>('unlock');

  // Change password inputs
  const [currentPasscodeForChange, setCurrentPasscodeForChange] = useState<string>(initialPasscode || '');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmNewPasscode, setConfirmNewPasscode] = useState('');
  const [showNewPasscode, setShowNewPasscode] = useState(false);

  // Authenticated user data if in set-password-prompt stage
  const [authenticatedUser, setAuthenticatedUser] = useState<{ id: string; name: string; passcode: string } | null>(null);

  // New member flow state
  const [newMemberName, setNewMemberName] = useState('');

  // Fetch group public data
  useEffect(() => {
    if (!isOpen || !groupId) return;

    setLoadingGroup(true);
    setViewMode('unlock');
    setAuthenticatedUser(null);
    setNewPasscode('');
    setConfirmNewPasscode('');

    api.getPublicGroup(groupId)
      .then(res => {
        setGroup(res.group);
        if (initialMemberId && res.group.members.some((m: PublicMember) => m.userId === initialMemberId)) {
          setSelectedUserId(initialMemberId);
        }

        if (initialPasscode) {
          setPasscode(initialPasscode);
          setCurrentPasscodeForChange(initialPasscode);
        }
      })
      .catch(err => {
        showToast(err.message || 'Group not found or link has expired', 'error');
        onClose();
      })
      .finally(() => {
        setLoadingGroup(false);
      });
  }, [isOpen, groupId]);

  const selectedMember = group?.members.find(m => m.userId === selectedUserId);

  // 1. Standard unlock with passcode
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast('Please select your name from the group members', 'error');
      return;
    }
    if (!passcode.trim()) {
      showToast('Please enter your unique member password', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.memberLogin(groupId, selectedUserId, passcode.trim());
      // Prompt user to customize password if they wish, or continue directly
      setAuthenticatedUser({
        id: res.user.id,
        name: res.user.name,
        passcode: passcode.trim()
      });
      setCurrentPasscodeForChange(passcode.trim());
      setViewMode('set-password-prompt');
    } catch (err: any) {
      showToast(err.message || 'Incorrect member password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Direct change password and log in
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast('Please select your name', 'error');
      return;
    }
    if (!currentPasscodeForChange.trim()) {
      showToast('Please enter your current or temporary password', 'error');
      return;
    }
    const cleanNew = newPasscode.trim();
    if (!cleanNew) {
      showToast('Please enter your new password', 'error');
      return;
    }
    if (cleanNew.length < 2) {
      showToast('Password must be at least 2 characters long', 'error');
      return;
    }
    if (cleanNew !== confirmNewPasscode.trim()) {
      showToast('New passwords do not match. Please re-enter carefully.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.memberChangePassword(
        groupId,
        selectedUserId,
        currentPasscodeForChange.trim(),
        cleanNew
      );
      showToast(`Password updated! You can now log in with "${cleanNew}".`, 'success');
      onSuccess(groupId, autoOpenExpense);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Set custom password from post-login prompt
  const handleSaveCustomPasswordFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedUser) return;

    const cleanNew = newPasscode.trim();
    if (!cleanNew) {
      showToast('Please enter your new password', 'error');
      return;
    }
    if (cleanNew.length < 2) {
      showToast('Password must be at least 2 characters long', 'error');
      return;
    }
    if (cleanNew !== confirmNewPasscode.trim()) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateMemberPasscode(groupId, authenticatedUser.id, cleanNew);
      showToast(`Personal password saved! Next time, just log in with "${cleanNew}".`, 'success');
      onSuccess(groupId, autoOpenExpense);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Skip setting custom password and proceed into group
  const handleSkipPasswordCustomization = () => {
    showToast(`Welcome, ${authenticatedUser?.name || 'Member'}!`, 'success');
    onSuccess(groupId, autoOpenExpense);
    onClose();
  };

  // 5. Join as brand new member
  const handleJoinNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const addRes = await api.addMember(groupId, newMemberName.trim());
      const newUserId = addRes.user.id;
      const genPasscode = addRes.passcode || '1234';

      // Automatically log them in with their newly generated passcode
      const loginRes = await api.memberLogin(groupId, newUserId, genPasscode);
      setAuthenticatedUser({
        id: loginRes.user.id,
        name: loginRes.user.name,
        passcode: genPasscode
      });
      setViewMode('set-password-prompt');
      showToast(`Welcome ${newMemberName}! Set your personal password below.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not join group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[95vh] flex flex-col">
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
            {group ? group.name : 'Group Access'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            {viewMode === 'set-password-prompt'
              ? 'Password verified! Choose a personal password for future logins.'
              : viewMode === 'change-password'
              ? 'Update your group password to a personal code'
              : viewMode === 'join-new'
              ? 'Join as a new member to split expenses'
              : (group?.description || 'Enter your password to access and add expenses')}
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {group?.category || 'Group'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white">
              Currency: {group?.defaultCurrency || 'INR'}
            </span>
          </div>
        </div>

        {/* Content */}
        {loadingGroup ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            Loading group details...
          </div>
        ) : viewMode === 'set-password-prompt' && authenticatedUser ? (
          /* PROMPT: After password entry, let them easily customize their password permanently */
          <form onSubmit={handleSaveCustomPasswordFromPrompt} className="p-6 space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Welcome, {authenticatedUser.name}!</span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  Would you like to set your own password now? You can choose any easy code so you never have to look up the temporary invitation link again!
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                New Personal Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPasscode ? 'text' : 'password'}
                  placeholder="e.g. 1234 or your secret password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPasscode(!showNewPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  {showNewPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPasscode ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmNewPasscode}
                  onChange={(e) => setConfirmNewPasscode(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !newPasscode.trim() || !confirmNewPasscode.trim()}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving Password...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save My Password & Enter Group</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipPasswordCustomization}
                className="w-full py-2 px-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-center"
              >
                Skip & Keep Current Password ({authenticatedUser.passcode})
              </button>
            </div>
          </form>
        ) : viewMode === 'change-password' ? (
          /* DIRECT CHANGE PASSWORD MODE */
          <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                <span>1. Select Your Name</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {group?.members.length} members
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {group?.members.map(m => {
                  const isSelected = selectedUserId === m.userId;
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => setSelectedUserId(m.userId)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                        alt={m.name}
                        className="w-6 h-6 rounded-full object-cover bg-slate-100 dark:bg-slate-700 flex-shrink-0"
                      />
                      <span className="truncate text-xs">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                2. Current / Temporary Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Code received in invitation (e.g. 4829)"
                  value={currentPasscodeForChange}
                  onChange={(e) => setCurrentPasscodeForChange(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  3. New Password
                </label>
                <input
                  type={showNewPasscode ? 'text' : 'password'}
                  placeholder="Your new password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showNewPasscode ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmNewPasscode}
                  onChange={(e) => setConfirmNewPasscode(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNewPasscode}
                  onChange={(e) => setShowNewPasscode(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Show passwords</span>
              </label>

              <button
                type="button"
                onClick={() => setViewMode('unlock')}
                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold cursor-pointer"
              >
                Back to Normal Login
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedUserId || !currentPasscodeForChange.trim() || !newPasscode.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update Password & Enter Group</span>
                </>
              )}
            </button>
          </form>
        ) : viewMode === 'join-new' ? (
          /* Join as New Member Form */
          <form onSubmit={handleJoinNewMember} className="p-6 space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">New to this group?</span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Enter your name to join this group. You will then be able to set your own password!
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Priya, Karan, Alex..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                autoFocus
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newMemberName.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Joining...</span>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Join & Continue</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setViewMode('unlock')}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Already a member on the list? Enter password
              </button>
            </div>
          </form>
        ) : (
          /* Existing Member Unlock Form */
          <form onSubmit={handleUnlock} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                <span>1. Select Your Name</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {group?.members.length} members
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {group?.members.map(m => {
                  const isSelected = selectedUserId === m.userId;
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(m.userId);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                        alt={m.name}
                        className="w-7 h-7 rounded-full object-cover bg-slate-100 dark:bg-slate-700 flex-shrink-0"
                      />
                      <div className="truncate flex-1">
                        <div className="truncate text-xs">{m.name}</div>
                        {m.role === 'admin' && (
                          <div className="text-[9px] text-amber-700 dark:text-amber-400 font-bold">Admin</div>
                        )}
                      </div>
                      {isSelected && (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. Enter Your Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPasscodeForChange(passcode);
                    setViewMode('change-password');
                  }}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Change Password</span>
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your member password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Enter the code sent to you. You can customize it to any personal password right after unlocking!
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedUserId || !passcode.trim()}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Verifying Password...</span>
              ) : (
                <>
                  <span>Unlock & Open Group</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('join-new')}
                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Not on this list? Join as new</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
