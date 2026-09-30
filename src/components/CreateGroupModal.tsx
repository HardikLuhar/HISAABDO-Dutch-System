import React, { useState, useEffect, useRef } from 'react';
import { GroupCategory, CurrencyCode, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { GROUP_CATEGORIES } from '../utils/formatters';
import { X, Users, Plus, Trash2, Search, UserPlus, Check } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('Trip');
  const [currency, setCurrency] = useState<CurrencyCode>(user?.preferredCurrency || 'INR');
  const [memberNames, setMemberNames] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete state per member field
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setActiveSuggestionIdx(null);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleAddMemberField = () => {
    setMemberNames([...memberNames, '']);
  };

  const handleMemberNameChange = (index: number, val: string) => {
    const updated = [...memberNames];
    updated[index] = val;
    setMemberNames(updated);

    // Trigger autocomplete search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = val.trim();
    if (!query) {
      setSuggestions([]);
      setActiveSuggestionIdx(null);
      return;
    }

    setActiveSuggestionIdx(index);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchUsers(query);
        // Filter out members already added
        const alreadyAdded = new Set(memberNames.map(m => m.trim().toLowerCase()).filter(m => m));
        const filtered = res.users.filter(u =>
          !alreadyAdded.has(u.name.toLowerCase()) &&
          u.name.toLowerCase() !== user?.name?.toLowerCase()
        );
        setSuggestions(filtered);
        setActiveSuggestionIdx(filtered.length > 0 ? index : null);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = (index: number, selectedUser: User) => {
    const updated = [...memberNames];
    updated[index] = selectedUser.name;
    setMemberNames(updated);
    setSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const handleRemoveMemberField = (index: number) => {
    setMemberNames(memberNames.filter((_, i) => i !== index));
    if (activeSuggestionIdx === index) {
      setActiveSuggestionIdx(null);
      setSuggestions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a group name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const validNames = memberNames.map(m => m.trim()).filter(m => m.length > 0);
      const res = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        category,
        defaultCurrency: currency,
        memberEmails: validNames
      });

      // Show warning for skipped (unregistered) names
      if ((res as any).warning) {
        showToast((res as any).warning, 'warning');
      }

      showToast(`Group "${name}" created successfully!`, 'success');
      onGroupCreated(res.group.id);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Create a New Group</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Organize expenses with friends, flatmates, or family</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Goa Trip 2026, 4BHK Flatmates, Office Lunch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              placeholder="What is this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GroupCategory)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
              >
                {GROUP_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Initial Members Invitations with Autocomplete */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">Add Members by Name</label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Type to search registered users. Only existing accounts can be added.</span>
              </div>
              <button
                type="button"
                onClick={handleAddMemberField}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Person</span>
              </button>
            </div>

            <div className="space-y-2">
              {memberNames.map((memName, idx) => (
                <div key={idx} className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Type a name to search..."
                      value={memName}
                      onChange={(e) => handleMemberNameChange(idx, e.target.value)}
                      onFocus={() => {
                        if (memName.trim() && suggestions.length > 0) {
                          setActiveSuggestionIdx(idx);
                        }
                      }}
                      autoComplete="off"
                      className="w-full pl-8 pr-3 p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/20"
                    />

                    {/* Autocomplete Suggestions Dropdown */}
                    {activeSuggestionIdx === idx && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto"
                      >
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(idx, s)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer text-left border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                          >
                            <img
                              src={s.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`}
                              alt={s.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {s.email.includes('@hisaabdo.local') ? 'Registered user' : s.email}
                              </div>
                            </div>
                            <UserPlus className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {memberNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberField(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              You can also add more members anytime from inside the group. Only registered users will be added.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
