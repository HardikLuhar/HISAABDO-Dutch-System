import React, { useState, useEffect } from 'react';
import { CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  X,
  User,
  Moon,
  Sun,
  Check,
  Sparkles,
  RefreshCw,
  CreditCard,
  Search,
  Globe,
  ExternalLink,
  Film,
  Tv,
  Gamepad2,
  Bot,
  Smile,
  Image as ImageIcon,
  ArrowRight
} from 'lucide-react';
import {
  DEFAULT_AVATARS,
  AvatarCategory,
  AvatarOption,
  FLATICON_PRESETS
} from '../data/avatars';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [isSaving, setIsSaving] = useState(false);

  // Avatar picker state
  const [avatarViewMode, setAvatarViewMode] = useState<'presets' | 'web'>('presets');
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarList, setAvatarList] = useState<AvatarOption[]>(DEFAULT_AVATARS);

  // Web / Flaticon input state
  const [webUrlInput, setWebUrlInput] = useState('');
  const [previewTestUrl, setPreviewTestUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
      setPreferredCurrency(user.preferredCurrency || 'INR');
      setUpiId(user.upiId || '');

      api.getUser(user.id).then(fresh => {
        if (fresh) {
          if (fresh.upiId !== undefined) setUpiId(fresh.upiId || '');
          if (fresh.phone !== undefined) setPhone(fresh.phone || '');
        }
      }).catch(() => {});
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const handleShuffleAvatars = () => {
    const seed = Math.random().toString(36).substring(2, 7);
    const shuffled = DEFAULT_AVATARS.map((av) => {
      if (av.url.includes('dicebear.com')) {
        return {
          ...av,
          url: `${av.url.split('&rnd=')[0]}&rnd=${seed}`
        };
      }
      return av;
    });
    setAvatarList(shuffled);
    showToast('Shuffled styles and seeds!', 'info');
  };

  // Convert potential Flaticon page links to direct CDN image URLs
  const normalizeImageUrl = (raw: string): string => {
    const trimmed = raw.trim();
    // Handle Flaticon page URL e.g. https://www.flaticon.com/free-icon/superman_1090805
    const flaticonPageMatch = trimmed.match(/flaticon\.com\/free-(?:animated-)?icon\/[a-z0-9-_]+_(\d+)/i);
    if (flaticonPageMatch && flaticonPageMatch[1]) {
      const id = parseInt(flaticonPageMatch[1], 10);
      const prefix = Math.floor(id / 1000);
      return `https://cdn-icons-png.flaticon.com/512/${prefix}/${id}.png`;
    }
    return trimmed;
  };

  const handleApplyWebUrl = () => {
    if (!webUrlInput.trim()) {
      showToast('Please enter an image or icon URL', 'error');
      return;
    }
    const normalized = normalizeImageUrl(webUrlInput);
    setAvatarUrl(normalized);
    showToast('Applied icon from web!', 'success');
  };

  // Filtered avatars by category and search query
  const filteredAvatars = avatarList.filter((a) => {
    const matchesCategory = avatarCategory === 'all' || a.category === avatarCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = a.name.toLowerCase().includes(q);
    const categoryMatch = a.category.toLowerCase().includes(q);
    const tagMatch = a.tags ? a.tags.some(t => t.toLowerCase().includes(q)) : false;
    return nameMatch || categoryMatch || tagMatch;
  });

  const categoryIcons: Record<AvatarCategory, React.ReactNode> = {
    all: <Sparkles className="w-3.5 h-3.5" />,
    movies: <Film className="w-3.5 h-3.5" />,
    anime: <Tv className="w-3.5 h-3.5" />,
    gaming: <Gamepad2 className="w-3.5 h-3.5" />,
    people: <User className="w-3.5 h-3.5" />,
    robots: <Bot className="w-3.5 h-3.5" />,
    emoji: <Smile className="w-3.5 h-3.5" />
  };

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
        preferredCurrency,
        upiId: upiId.trim()
      });
      showToast('Profile and UPI payment ID updated successfully!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] sm:max-h-[92vh] flex flex-col transition-colors">
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
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-cyan-50/80 dark:from-emerald-950/30 dark:via-slate-800/60 dark:to-teal-950/30 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-3.5">
            <div className="relative shrink-0">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'User'}`}
                alt={name}
                className="w-16 h-16 rounded-2xl object-contain p-1 border-2 border-emerald-500 shadow-md bg-white dark:bg-slate-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'User'}`;
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                ✓
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{name || 'Your Name'}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Active Avatar
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 shrink-0" /> {DEFAULT_AVATARS.length}+ curated icons • Movies, Anime, Gaming & Web selection
              </p>
            </div>
          </div>

          {/* Dynamic Avatar Selection Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-3">
            {/* View Mode Switcher: Presets vs Web / Flaticon */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAvatarViewMode('presets')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    avatarViewMode === 'presets'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Icon Library ({DEFAULT_AVATARS.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarViewMode('web')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    avatarViewMode === 'web'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Pick from Web / Flaticon</span>
                </button>
              </div>

              {avatarViewMode === 'presets' && (
                <button
                  type="button"
                  onClick={handleShuffleAvatars}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-1.5 rounded-lg transition cursor-pointer"
                  title="Shuffle variations"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>
              )}
            </div>

            {avatarViewMode === 'presets' ? (
              <div className="space-y-2.5">
                {/* Search bar inside preset icons */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search heroes, anime, batman, naruto, gaming..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-[11px]">
                  {(['all', 'movies', 'anime', 'gaming', 'people', 'robots', 'emoji'] as const).map((cat) => {
                    const count = cat === 'all'
                      ? DEFAULT_AVATARS.length
                      : DEFAULT_AVATARS.filter(a => a.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAvatarCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg font-medium capitalize transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          avatarCategory === cat
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {categoryIcons[cat]}
                        <span>{cat}</span>
                        <span className={`text-[9px] px-1 rounded-full ${
                          avatarCategory === cat
                            ? 'bg-emerald-700/80 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Avatar Grid (80+ categorized avatars) */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 max-h-56 overflow-y-auto p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  {filteredAvatars.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400">
                      No icons found matching "{searchQuery}". Try another keyword or pick from Web/Flaticon.
                    </div>
                  ) : (
                    filteredAvatars.map((av) => {
                      const isSelected = avatarUrl === av.url;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setAvatarUrl(av.url)}
                          className={`relative p-1.5 rounded-xl transition cursor-pointer group flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 ring-2 ring-emerald-500 scale-105 shadow-xs'
                              : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                          }`}
                          title={`${av.name} (${av.category})`}
                        >
                          <img
                            src={av.url}
                            alt={av.name}
                            className="w-11 h-11 rounded-xl object-contain p-0.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs"
                            loading="lazy"
                            onError={(e) => {
                              // If CDN has an issue, fallback gracefully
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${av.name}`;
                            }}
                          />
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                          <span className="text-[9px] text-slate-600 dark:text-slate-300 mt-1 truncate max-w-[54px] font-medium text-center">
                            {av.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Web / Flaticon Selection View */
              <div className="space-y-3.5 p-1 animate-in fade-in">
                {/* Flaticon Quick Search Links */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Browse & Search on Flaticon.com
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Opens in new tab</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FLATICON_PRESETS.map((preset) => (
                      <a
                        key={preset.label}
                        href={`https://www.flaticon.com/search?word=${encodeURIComponent(preset.query)}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition"
                      >
                        <span>{preset.label}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ))}
                    <a
                      href="https://www.flaticon.com/"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
                    >
                      <span>Explore Flaticon Home</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  </div>
                </div>

                {/* How to use Flaticon banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    💡 How to select any Flaticon or Web icon:
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[10.5px] leading-relaxed">
                    <li>Find any icon on <strong>Flaticon.com</strong> or your favorite website.</li>
                    <li>Right click the icon → choose <strong>"Copy image address"</strong> (or copy the icon page URL).</li>
                    <li>Paste the copied URL below and tap <strong>Apply Icon</strong>!</li>
                  </ol>
                </div>

                {/* URL Input & Preview */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Paste Icon / Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://cdn-icons-png.flaticon.com/... or https://www.flaticon.com/free-icon/..."
                      value={webUrlInput}
                      onChange={(e) => {
                        setWebUrlInput(e.target.value);
                        setPreviewTestUrl(normalizeImageUrl(e.target.value));
                        setImageLoadError(false);
                      }}
                      className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleApplyWebUrl}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    >
                      <span>Apply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Live Web URL Preview Box */}
                  {previewTestUrl && (
                    <div className="p-3 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                        {imageLoadError ? (
                          <ImageIcon className="w-6 h-6 text-rose-400" />
                        ) : (
                          <img
                            src={previewTestUrl}
                            alt="Web icon preview"
                            className="w-full h-full object-contain"
                            onError={() => setImageLoadError(true)}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        {imageLoadError ? (
                          <p className="text-rose-500 font-semibold text-[11px]">
                            ⚠️ Could not load image from this URL. Please verify the link.
                          </p>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Live Icon Preview</p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Ready! Tap "Apply" to set as your profile avatar.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

          {/* UPI Payment Details (Used for instant settlement) */}
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">UPI Payment ID</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Members will copy or launch their UPI app to pay you</p>
                </div>
              </div>
            </div>

            {/* UPI ID input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                When other members settle up with you, they can tap <strong>Launch UPI App</strong> or copy your UPI ID to pay instantly via Google Pay, PhonePe, or Paytm.
              </p>
            </div>
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
