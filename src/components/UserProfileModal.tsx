import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { X, User, Phone, Mail, DollarSign, Image, Moon, Sun, Check, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvatarOption {
  id: string;
  name: string;
  category: 'people' | 'anime' | 'robots' | 'emoji';
  url: string;
}

const DEFAULT_AVATARS: AvatarOption[] = [
  // People & Personas (12)
  { id: 'p1', name: 'Alex', category: 'people', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Alex' },
  { id: 'p2', name: 'Sam', category: 'people', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Sam' },
  { id: 'p3', name: 'Jordan', category: 'people', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Jordan' },
  { id: 'p4', name: 'Taylor', category: 'people', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Taylor' },
  { id: 'p5', name: 'Felix', category: 'people', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { id: 'p6', name: 'Aneka', category: 'people', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' },
  { id: 'p7', name: 'Milo', category: 'people', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo' },
  { id: 'p8', name: 'Jasper', category: 'people', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper' },
  { id: 'p9', name: 'Riley', category: 'people', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Riley' },
  { id: 'p10', name: 'Casey', category: 'people', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Casey' },
  { id: 'p11', name: 'Drew', category: 'people', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Drew' },
  { id: 'p12', name: 'Morgan', category: 'people', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Morgan' },
  { id: 'p13', name: 'Reese', category: 'people', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Reese' },
  { id: 'p14', name: 'Quinn', category: 'people', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Quinn' },
  { id: 'p15', name: 'Skyler', category: 'people', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Skyler' },
  { id: 'p16', name: 'Avery', category: 'people', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Avery' },
  // Anime & Art — Lorelei / Micah / Notionists (12)
  { id: 'a1', name: 'Aria', category: 'anime', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aria' },
  { id: 'a2', name: 'Luna', category: 'anime', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna' },
  { id: 'a3', name: 'Maya', category: 'anime', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya' },
  { id: 'a4', name: 'Zoe', category: 'anime', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe' },
  { id: 'a5', name: 'Oliver', category: 'anime', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Oliver' },
  { id: 'a6', name: 'Sophia', category: 'anime', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Sophia' },
  { id: 'a7', name: 'Liam', category: 'anime', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Liam' },
  { id: 'a8', name: 'Emma', category: 'anime', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Emma' },
  { id: 'a9', name: 'Kai', category: 'anime', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kai' },
  { id: 'a10', name: 'Hana', category: 'anime', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Hana' },
  { id: 'a11', name: 'Riku', category: 'anime', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Riku' },
  { id: 'a12', name: 'Yuki', category: 'anime', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Yuki' },
  // Robots / Bottts (10)
  { id: 'r1', name: 'Sparks', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparks' },
  { id: 'r2', name: 'Gizmo', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo' },
  { id: 'r3', name: 'Byte', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Byte' },
  { id: 'r4', name: 'Pixel', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel' },
  { id: 'r5', name: 'Circuit', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Circuit' },
  { id: 'r6', name: 'Nova', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova' },
  { id: 'r7', name: 'Bolt', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt' },
  { id: 'r8', name: 'Chip', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Chip' },
  { id: 'r9', name: 'Zappy', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zappy' },
  { id: 'r10', name: 'Droid', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Droid' },
  // Emojis & Fun (12)
  { id: 'e1', name: 'Sunny', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sunny' },
  { id: 'e2', name: 'Happy', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy' },
  { id: 'e3', name: 'Chill', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Chill' },
  { id: 'e4', name: 'Vibes', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Vibes' },
  { id: 'e5', name: 'Cool', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool' },
  { id: 'e6', name: 'Wink', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink' },
  { id: 'e7', name: 'Blush', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Blush' },
  { id: 'e8', name: 'Star', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star' },
  { id: 'e9', name: 'Fire', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Fire' },
  { id: 'e10', name: 'Peace', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Peace' },
  { id: 'e11', name: 'Love', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love' },
  { id: 'e12', name: 'Party', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Party' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useNotification();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>(user?.preferredCurrency || 'INR');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarCategory, setAvatarCategory] = useState<'all' | 'people' | 'anime' | 'robots' | 'emoji'>('all');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [avatarList, setAvatarList] = useState<AvatarOption[]>(DEFAULT_AVATARS);

  if (!isOpen || !user) return null;

  const handleShuffleAvatars = () => {
    const seed = Math.random().toString(36).substring(2, 7);
    const shuffled = DEFAULT_AVATARS.map((av) => ({
      ...av,
      url: `${av.url.split('&rnd=')[0]}&rnd=${seed}`
    }));
    setAvatarList(shuffled);
    showToast('Generated fresh avatar styles!', 'info');
  };

  const filteredAvatars = avatarCategory === 'all'
    ? avatarList
    : avatarList.filter(a => a.category === avatarCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
        preferredCurrency
      });
      showToast('Profile updated successfully!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-colors">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">User Profile</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose your avatar & personalize your account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Current Avatar Highlight Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'User'}`}
                alt={name}
                className="w-16 h-16 rounded-full object-cover border-3 border-emerald-500 shadow-md bg-white dark:bg-slate-800"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                ✓
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{name || 'Your Name'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Select from {DEFAULT_AVATARS.length} dynamic avatars below
              </p>
            </div>
          </div>

          {/* Dynamic Avatar Selection Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white">Choose Your Avatar</label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Click any avatar to apply instantly</span>
              </div>
              <button
                type="button"
                onClick={handleShuffleAvatars}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-1 rounded-lg transition cursor-pointer"
                title="Shuffle variations"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Shuffle</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-hide text-[11px]">
              {(['all', 'people', 'anime', 'robots', 'emoji'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAvatarCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition cursor-pointer whitespace-nowrap ${
                    avatarCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? `All (${DEFAULT_AVATARS.length})` : cat}
                </button>
              ))}
            </div>

            {/* Avatar Grid (20+ avatars) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 max-h-48 overflow-y-auto p-1 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              {filteredAvatars.map((av) => {
                const isSelected = avatarUrl === av.url;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarUrl(av.url)}
                    className={`relative p-1 rounded-xl transition cursor-pointer group flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 ring-2 ring-emerald-500 scale-105'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <img
                      src={av.url}
                      alt={av.name}
                      className="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs"
                      loading="lazy"
                    />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[48px]">
                      {av.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom URL Option Toggle */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCustomUrl(!showCustomUrl)}
                className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <span>Or use custom image URL</span>
                {showCustomUrl ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showCustomUrl && (
                <div className="mt-2 animate-in fade-in">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or custom link"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Preferred Currency</label>
            <select
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value as CurrencyCode)}
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>

          {/* Theme Switcher in Profile */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Theme Preference</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-500 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
                id="profile-theme-light-btn"
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-500 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
                id="profile-theme-dark-btn"
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
