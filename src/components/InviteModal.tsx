import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GroupMemberInfo, User } from '../types';
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
  Link,
  Search,
  ShieldAlert
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'add' | 'general'>('members');
  const [identifier, setIdentifier] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Autocomplete suggestion state
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Determine if user can add members (group admin or site admin)
  const isGroupAdmin = members.some(m => m.userId === user?.id && m.role === 'admin');
  const isSiteAdmin = Boolean(
    (user?.name && user.name.trim().toLowerCase() === 'hardik') ||
    (user?.email && user.email.toLowerCase().includes('hardik'))
  );
  const canAddMembers = isGroupAdmin || isSiteAdmin;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users on input change with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = identifier.trim();
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchUsers(query);
        // Filter out users that are already members of this group
        const existingMemberIds = new Set(members.map(m => m.userId));
        const filtered = res.users.filter(u => !existingMemberIds.has(u.id));
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (err) {
        console.error('Search error:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [identifier, members]);

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

  const handleSelectSuggestion = (selectedUser: User) => {
    setIdentifier(selectedUser.name);
    setShowSuggestions(false);
    setSuggestions([]);
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
      setSuggestions([]);
      setShowSuggestions(false);
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
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-3xl w-full sm:max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Send Group Links & Passwords
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {groupName} • Each member has their own unique password to add expenses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-6 overflow-x-auto scrollbar-hide flex-shrink-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'members'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Member Passwords & Links ({members.length})</span>
            <span className="sm:hidden">Passwords ({members.length})</span>
          </button>

          {canAddMembers && (
            <button
              onClick={() => setActiveTab('add')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'add'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Member</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
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
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">How it works:</span>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
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
                              <span className="font-bold text-slate-900 dark:text-white text-xs">{m.name}</span>
                              {m.role === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
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
                                    className="w-20 px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-emerald-400 rounded-md text-slate-900 dark:text-white focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSavePasscode(m.userId)}
                                    disabled={isSavingPasscode}
                                    className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 px-2 py-0.5 rounded cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Password:</span>
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-xs rounded-md border border-slate-200 dark:border-slate-700 tracking-wider">
                                    {passcode}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(m.userId);
                                      setEditingPasscode(passcode);
                                    }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
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

          {/* TAB 2: ADD NEW MEMBER (Admin only) */}
          {activeTab === 'add' && canAddMembers && (
            <div className="space-y-4">
              <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Search & Add:</span>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5 leading-relaxed">
                    Start typing a person's name and matching registered users will appear below. Select the correct person to add them accurately.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Search Registered User
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type a name... e.g. H, Ha, Hardik"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      autoFocus
                      autoComplete="off"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {suggestions.length} user{suggestions.length !== 1 ? 's' : ''} found
                          </span>
                        </div>
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer text-left border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                          >
                            <img
                              src={s.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`}
                              alt={s.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {s.email.includes('@hisaabdo.local') ? 'Registered user' : s.email}
                              </div>
                            </div>
                            <UserPlus className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results message */}
                    {identifier.trim().length > 0 && !isSearching && suggestions.length === 0 && showSuggestions === false && (
                      <div className="absolute top-full left-0 right-0 mt-1">
                        {/* This shows only after search completes with no results */}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding || !identifier.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {isAdding ? 'Adding...' : 'Add Friend'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Only registered users can be added. The person must have an account on Hisaabdo first.
                </p>
              </form>

              {/* Just added member preview card */}
              {justAddedMember && (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        {justAddedMember.name} was added!
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Their Password:</span>
                      <span className="px-2 py-0.5 bg-white dark:bg-slate-800 text-emerald-950 dark:text-emerald-200 font-mono font-extrabold text-xs rounded-md border border-emerald-300 dark:border-emerald-700">
                        {justAddedMember.passcode}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
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
                      className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'just-added' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'just-added' ? 'Copied' : 'Copy Message'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-admin message for add tab */}
          {activeTab === 'add' && !canAddMembers && (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Admin Access Required</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Only the group admin can add new members. Contact your group admin to have someone added.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL INVITE CODE */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Group Invite Code</span>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white tracking-wider">
                    {inviteCode}
                  </span>
                  <button
                    onClick={() => handleCopyText(inviteCode, 'general-code', 'Invite code')}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                  >
                    {copiedKey === 'general-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'general-code' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-900 dark:text-white mb-1">General Group Link</span>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <span className="truncate max-w-[280px] text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {currentOrigin}/?group={groupId}
                  </span>
                  <button
                    onClick={() => handleCopyText(`${currentOrigin}/?group=${groupId}`, 'general-link', 'Group link')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 transition cursor-pointer"
                  >
                    {copiedKey === 'general-link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'general-link' ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  When members open this general link, they pick their name and enter their unique password to access the group.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
