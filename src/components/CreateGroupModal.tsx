import React, { useState } from 'react';
import { GroupCategory, CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { GROUP_CATEGORIES } from '../utils/formatters';
import { X, Users, Plus, Trash2 } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleAddMemberField = () => {
    setMemberNames([...memberNames, '']);
  };

  const handleMemberNameChange = (index: number, val: string) => {
    const updated = [...memberNames];
    updated[index] = val;
    setMemberNames(updated);
  };

  const handleRemoveMemberField = (index: number) => {
    setMemberNames(memberNames.filter((_, i) => i !== index));
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
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-slate-200 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Create a New Group</h2>
              <p className="text-[11px] text-slate-500">Organize expenses with friends, flatmates, or family</p>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Goa Trip 2026, 4BHK Flatmates, Office Lunch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              placeholder="What is this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GroupCategory)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
              >
                {GROUP_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Initial Members Invitations */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-900 block">Add Members by Name</label>
                <span className="text-[11px] text-slate-500">Friends who will split expenses in this group</span>
              </div>
              <button
                type="button"
                onClick={handleAddMemberField}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Person</span>
              </button>
            </div>

            <div className="space-y-2">
              {memberNames.map((memName, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Rahul, Sneha, Alex..."
                    value={memName}
                    onChange={(e) => handleMemberNameChange(idx, e.target.value)}
                    className="flex-1 p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {memberNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberField(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              You can also add more members anytime from inside the group.
            </p>
          </div>

          {/* Submit Actions */}
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
