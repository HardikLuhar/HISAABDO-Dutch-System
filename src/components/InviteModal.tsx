import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { GroupMemberInfo } from '../types';
import {
  X,
  Users,
  Copy,
  Check,
  UserPlus,
  Share2,
  KeyRound,
  MessageCircle,
  ExternalLink,
  Edit2,
  Lock,
  Sparkles,
  Link
} from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  inviteCode: string;
  members?: GroupMemberInfo[];
  onMemberAdded: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  inviteCode,
  members = [],
  onMemberAdded
}) => {
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState<'members' | 'add' | 'general'>('members');
  const [identifier, setIdentifier] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // New member just added info for instant copy
  const [justAddedMember, setJustAddedMember] = useState<{
    name: string;
    passcode: string;
    userId: string;
  } | null>(null);

  // Copy tracking states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Password editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPasscode, setEditingPasscode] = useState('');
  const [isSavingPasscode, setIsSavingPasscode] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;

  const getMemberInviteText = (memberName: string, memberId: string, passcode: string) => {
    const link = `${currentOrigin}/?group=${groupId}&member=${memberId}`;
    return `Hey ${memberName}! Join our group "${groupName}" on Hisaabdo to add and track your expenses.\n\n🔗 Group Link: ${link}\n🔑 Your Member Password: ${passcode || '1234'}\n\n💡 Tip: When you open the link, you can customize your password to any personal password you like so you can easily log in anytime!`;
  };

  const getDirectLoginLink = (memberId: string, passcode: string) => {
    return `${currentOrigin}/?group=${groupId}&member=${memberId}&pass=${passcode}&action=add-expense`;
  };

  const handleCopyText = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleShareWhatsApp = (memberName: string, memberId: string, passcode: string) => {
    const text = getMemberInviteText(memberName, memberId, passcode);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsAdding(true);
    try {
      const res = await api.addMember(groupId, identifier.trim());
      const passcode = res.passcode || '1234';
      setJustAddedMember({
        name: res.user.name,
        passcode,
        userId: res.user.id
      });
      showToast(`${res.user.name} added! Unique password generated: ${passcode}`, 'success');
      setIdentifier('');
      onMemberAdded();
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSavePasscode = async (userId: string) => {
    if (!editingPasscode.trim()) {
      showToast('Password cannot be empty', 'error');
      return;
    }

    setIsSavingPasscode(true);
    try {
      await api.updateMemberPasscode(groupId, userId, editingPasscode.trim());
      showToast('Member password updated!', 'success');
      setEditingUserId(null);
      setEditingPasscode('');
      onMemberAdded();
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setIsSavingPasscode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-3xl w-full sm:max-w-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Send Group Links & Passwords
              </h2>
              <p className="text-[11px] text-slate-500">
                {groupName} • Each member has their own unique password to add expenses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-3 sm:px-6 overflow-x-auto scrollbar-hide flex-shrink-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'members'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Member Passwords & Links ({members.length})</span>
            <span className="sm:hidden">Passwords ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'add'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>General Code</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: MEMBER PASSWORDS & PERSONALIZED LINKS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">How it works:</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    Send each friend their unique link and password. When they open the link, they enter their password and are immediately ready to add expenses!
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {members.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No members yet in this group.
                  </div>
                ) : (
                  members.map((m) => {
                    const passcode = m.memberPasscode || '1234';
                    const isEditing = editingUserId === m.userId;
                    const copiedThisMember = copiedKey === `invite-${m.userId}`;
                    const copiedThisLink = copiedKey === `direct-${m.userId}`;

                    return (
                      <div key={m.userId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                            alt={m.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                              {m.role === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Admin
                                </span>
                              )}
                            </div>

                            {/* Password Badge & Editor */}
                            <div className="flex items-center gap-1.5 mt-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingPasscode}
                                    onChange={(e) => setEditingPasscode(e.target.value)}
                                    placeholder="e.g. 4829"
                                    className="w-20 px-2 py-0.5 text-xs font-mono font-bold bg-white border border-emerald-400 rounded-md focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSavePasscode(m.userId)}
                                    disabled={isSavingPasscode}
                                    className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-semibold text-slate-400">Password:</span>
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-900 font-mono font-black text-xs rounded-md border border-slate-200 tracking-wider">
                                    {passcode}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(m.userId);
                                      setEditingPasscode(passcode);
                                    }}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                    title="Edit Password"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons for this member */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* 1. Share on WhatsApp */}
                          <button
                            onClick={() => handleShareWhatsApp(m.name, m.userId, passcode)}
                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition cursor-pointer"
                            title="Share link & password directly via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          {/* 2. Copy Full Invite Text */}
                          <button
                            onClick={() => handleCopyText(
                              getMemberInviteText(m.name, m.userId, passcode),
                              `invite-${m.userId}`,
                              `Invitation for ${m.name}`
                            )}
                            className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition cursor-pointer"
                            title="Copy formatted message with link and password"
                          >
                            {copiedThisMember ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedThisMember ? 'Copied!' : 'Copy Msg'}</span>
                          </button>

                          {/* 3. Direct 1-click Link */}
                          <button
                            onClick={() => handleCopyText(
                              getDirectLoginLink(m.userId, passcode),
                              `direct-${m.userId}`,
                              `1-Click link for ${m.name}`
                            )}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title="Copy 1-Click Auto-Login Link"
                          >
                            {copiedThisLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW MEMBER */}
          {activeTab === 'add' && (
            <div className="space-y-4">
              <form onSubmit={handleAddMember} className="space-y-3">
                <label className="block text-xs font-bold text-slate-900">
                  Friend's Name
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul, Sneha, Rohan..."
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding || !identifier.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    {isAdding ? 'Adding...' : 'Add Friend'}
                  </button>
                </div>
              </form>

              {/* Just added member preview card */}
              {justAddedMember && (
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-950">
                        {justAddedMember.name} was added!
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-700 font-medium">Their Password:</span>
                      <span className="px-2 py-0.5 bg-white text-emerald-950 font-mono font-extrabold text-xs rounded-md border border-emerald-300">
                        {justAddedMember.passcode}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800">
                    Send them their link and password so they can log in and add their expenses:
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShareWhatsApp(justAddedMember.name, justAddedMember.userId, justAddedMember.passcode)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Send on WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleCopyText(
                        getMemberInviteText(justAddedMember.name, justAddedMember.userId, justAddedMember.passcode),
                        'just-added',
                        `Invitation for ${justAddedMember.name}`
                      )}
                      className="py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'just-added' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'just-added' ? 'Copied' : 'Copy Message'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERAL INVITE CODE */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-900 mb-1">Group Invite Code</span>
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-mono text-sm font-extrabold text-slate-900 tracking-wider">
                    {inviteCode}
                  </span>
                  <button
                    onClick={() => handleCopyText(inviteCode, 'general-code', 'Invite code')}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
                  >
                    {copiedKey === 'general-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'general-code' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-900 mb-1">General Group Link</span>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <span className="truncate max-w-[280px] text-slate-500 font-mono text-[11px]">
                    {currentOrigin}/?group={groupId}
                  </span>
                  <button
                    onClick={() => handleCopyText(`${currentOrigin}/?group=${groupId}`, 'general-link', 'Group link')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 transition cursor-pointer"
                  >
                    {copiedKey === 'general-link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'general-link' ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  When members open this general link, they pick their name and enter their unique password to access the group.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
