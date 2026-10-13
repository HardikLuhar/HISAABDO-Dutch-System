import React, { useState, useEffect, useMemo } from 'react';
import { GroupItem, User, GroupCalculationData, DebtTransaction, CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { formatCurrency, CURRENCY_SYMBOLS } from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  QrCode,
  Send,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  ShieldCheck,
  CreditCard,
  Check,
  Banknote,
  Copy
} from 'lucide-react';
import { MemberProfileModal } from './MemberProfileModal';

interface TotalSummaryViewProps {
  groups: GroupItem[];
  allUsers: User[];
  onSelectGroup: (groupId: string) => void;
  onOpenSettleUp: (groupId: string, payerId?: string, receiverId?: string, amount?: number) => void;
  onRefreshAll: () => Promise<void> | void;
}

// Group-specific debt between focal user and another member
export interface PersonGroupDebt {
  groupId: string;
  groupName: string;
  category: string;
  currency: CurrencyCode;
  focalOwes: number;   // Amount focal user owes the other person in this group
  otherOwes: number;   // Amount other person owes focal user in this group
  net: number;         // otherOwes - focalOwes (positive = other owes focal, negative = focal owes other)
}

// Aggregated summary profile with a single contact across all groups
export interface ContactSummary {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  phone?: string;
  qrCodeUrl?: string;
  upiId?: string;
  totalFocalOwes: number; // Sum of what focal owes other across all groups
  totalOtherOwes: number; // Sum of what other owes focal across all groups
  netCombined: number;    // totalOtherOwes - totalFocalOwes (>0: other owes focal, <0: focal owes other)
  groupDebts: PersonGroupDebt[];
  involvedGroupsCount: number;
}

export const TotalSummaryView: React.FC<TotalSummaryViewProps> = ({
  groups,
  allUsers,
  onSelectGroup,
  onOpenSettleUp,
  onRefreshAll
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  // Focal person selector (defaults to logged in user)
  const [focalUserId, setFocalUserId] = useState<string>(user?.id || '');
  useEffect(() => {
    if (user?.id && (!focalUserId || focalUserId === '')) {
      setFocalUserId(user.id);
    }
  }, [user?.id, focalUserId]);

  const [isLoading, setIsLoading] = useState(false);
  const [groupCalculations, setGroupCalculations] = useState<Map<string, GroupCalculationData>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'YOU_OWE' | 'OWES_YOU' | 'SETTLED'>('ALL');

  // Selected contact for "Complete whole debt in one go" modal
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<User | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'CASH'>('QR');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSettlingAll, setIsSettlingAll] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [isSendingNotice, setIsSendingNotice] = useState(false);

  // Fetch all group calculations
  const loadAllGroupCalculations = async () => {
    if (!groups.length) return;
    setIsLoading(true);
    try {
      const results = await Promise.allSettled(
        groups.map(g => api.getGroupDetail(g.id))
      );
      const map = new Map<string, GroupCalculationData>();
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value) {
          map.set(groups[idx].id, res.value);
        }
      });
      setGroupCalculations(map);
    } catch (err: any) {
      console.error('Error loading group calculations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllGroupCalculations();
  }, [groups]);

  // Determine user object for currently selected focal user
  const focalUser = useMemo(() => {
    if (focalUserId === user?.id) return user;
    return allUsers.find(u => u.id === focalUserId) || {
      id: focalUserId,
      name: 'Member',
      email: '',
      avatarUrl: '',
      preferredCurrency: user?.preferredCurrency || 'INR'
    };
  }, [focalUserId, user, allUsers]);

  // List of unique members available across all groups for profile switching
  const networkMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatarUrl: string; email: string }>();
    if (user) {
      map.set(user.id, { id: user.id, name: `${user.name} (You)`, avatarUrl: user.avatarUrl, email: user.email });
    }
    for (const g of groups) {
      for (const m of g.members) {
        if (!map.has(m.userId)) {
          map.set(m.userId, {
            id: m.userId,
            name: m.name,
            avatarUrl: m.avatarUrl,
            email: m.email
          });
        }
      }
    }
    return Array.from(map.values());
  }, [groups, user]);

  // Compute aggregated cross-group contact summaries for the focal user
  const contactSummaries = useMemo<ContactSummary[]>(() => {
    if (!focalUserId) return [];

    const contactsMap = new Map<string, {
      user: { id: string; name: string; email: string; avatarUrl: string; phone?: string; qrCodeUrl?: string; upiId?: string };
      debtsByGroup: Map<string, PersonGroupDebt>;
    }>();

    // Helper to get or create contact entry
    const getContactEntry = (id: string, fallbackName = 'Member', fallbackAvatar = '') => {
      if (!contactsMap.has(id)) {
        const found = allUsers.find(u => u.id === id);
        contactsMap.set(id, {
          user: {
            id,
            name: found?.name || fallbackName,
            email: found?.email || '',
            avatarUrl: found?.avatarUrl || fallbackAvatar,
            phone: found?.phone,
            qrCodeUrl: found?.qrCodeUrl,
            upiId: found?.upiId
          },
          debtsByGroup: new Map()
        });
      }
      return contactsMap.get(id)!;
    };

    // Iterate each group and inspect simplified debt transactions
    for (const g of groups) {
      const calc = groupCalculations.get(g.id);
      if (!calc) continue;

      // Extract simplified debts for this group
      const transactions: DebtTransaction[] = calc.debtSimplification?.simplified || [];

      for (const tx of transactions) {
        // Case 1: Focal user owes someone else
        if (tx.fromUserId === focalUserId && tx.toUserId !== focalUserId) {
          const entry = getContactEntry(tx.toUserId, tx.toName, tx.toAvatar);
          const existing = entry.debtsByGroup.get(g.id) || {
            groupId: g.id,
            groupName: g.name,
            category: g.category,
            currency: g.defaultCurrency,
            focalOwes: 0,
            otherOwes: 0,
            net: 0
          };
          existing.focalOwes += tx.amount;
          existing.net = existing.otherOwes - existing.focalOwes;
          entry.debtsByGroup.set(g.id, existing);
        }

        // Case 2: Someone owes focal user
        if (tx.toUserId === focalUserId && tx.fromUserId !== focalUserId) {
          const entry = getContactEntry(tx.fromUserId, tx.fromName, tx.fromAvatar);
          const existing = entry.debtsByGroup.get(g.id) || {
            groupId: g.id,
            groupName: g.name,
            category: g.category,
            currency: g.defaultCurrency,
            focalOwes: 0,
            otherOwes: 0,
            net: 0
          };
          existing.otherOwes += tx.amount;
          existing.net = existing.otherOwes - existing.focalOwes;
          entry.debtsByGroup.set(g.id, existing);
        }
      }
    }

    // Now format into list of ContactSummary
    const list: ContactSummary[] = [];
    contactsMap.forEach((entry, otherId) => {
      if (otherId === focalUserId) return;

      const groupDebts = Array.from(entry.debtsByGroup.values());
      const totalFocalOwes = groupDebts.reduce((sum, d) => sum + d.focalOwes, 0);
      const totalOtherOwes = groupDebts.reduce((sum, d) => sum + d.otherOwes, 0);
      const netCombined = totalOtherOwes - totalFocalOwes;

      list.push({
        userId: otherId,
        name: entry.user.name,
        email: entry.user.email,
        avatarUrl: entry.user.avatarUrl,
        phone: entry.user.phone,
        qrCodeUrl: entry.user.qrCodeUrl,
        upiId: entry.user.upiId,
        totalFocalOwes,
        totalOtherOwes,
        netCombined,
        groupDebts,
        involvedGroupsCount: groupDebts.length
      });
    });

    // Sort by largest absolute net debt first
    list.sort((a, b) => Math.abs(b.netCombined) - Math.abs(a.netCombined));
    return list;
  }, [focalUserId, groups, groupCalculations, allUsers]);

  // Totals across all contacts for focal user
  const globalStats = useMemo(() => {
    let grandOwedByFocal = 0;
    let grandOwedToFocal = 0;
    let debtorsCount = 0;
    let creditorsCount = 0;

    for (const c of contactSummaries) {
      if (c.netCombined < -0.01) {
        grandOwedByFocal += Math.abs(c.netCombined);
        creditorsCount++;
      } else if (c.netCombined > 0.01) {
        grandOwedToFocal += c.netCombined;
        debtorsCount++;
      }
    }

    const netOverall = grandOwedToFocal - grandOwedByFocal;
    return {
      grandOwedByFocal,
      grandOwedToFocal,
      netOverall,
      creditorsCount,
      debtorsCount,
      totalContacts: contactSummaries.length
    };
  }, [contactSummaries]);

  // Filtered contacts based on search and tabs
  const filteredContacts = useMemo(() => {
    return contactSummaries.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.groupDebts.some(g => g.groupName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterType === 'YOU_OWE') return c.netCombined < -0.01;
      if (filterType === 'OWES_YOU') return c.netCombined > 0.01;
      if (filterType === 'SETTLED') return Math.abs(c.netCombined) <= 0.01;
      return true;
    });
  }, [contactSummaries, searchTerm, filterType]);

  // Handle "Settle All Debts in One Go" for a contact where the focal user is the RECEIVER
  const handleSettleAllInOneGo = async (contact: ContactSummary) => {
    if (!user) return;
    if (focalUserId !== user.id) {
      showToast('You can only record settlements for your own account.', 'error');
      return;
    }

    // Must be receiver in order to mark settled on Hisaabdo
    if (contact.netCombined <= 0.01) {
      showToast('Only the receiver can confirm and record debt settlements.', 'error');
      return;
    }

    // Find all groups where the other person owes money
    const payableDebts = contact.groupDebts.filter(d => d.otherOwes > 0);
    if (!payableDebts.length) {
      showToast('No outstanding group balances to settle.', 'info');
      return;
    }

    setIsSettlingAll(true);
    let settledGroups = 0;
    const errors: string[] = [];

    for (const debt of payableDebts) {
      try {
        await api.createSettlement(debt.groupId, {
          payerId: contact.userId,
          receiverId: user.id,
          amount: debt.otherOwes,
          date: new Date().toISOString().split('T')[0],
          notes: `Settled via Total Summary across ${payableDebts.length} groups in one go`
        });
        settledGroups++;
      } catch (err: any) {
        errors.push(`${debt.groupName}: ${err.message || 'Failed'}`);
      }
    }

    setIsSettlingAll(false);

    if (settledGroups > 0) {
      try {
        confetti({
          particleCount: 100,
          spread: 75,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      showToast(
        `Successfully settled all debts with ${contact.name} across ${settledGroups} ${settledGroups === 1 ? 'group' : 'groups'} in one go! 🎉`,
        'success'
      );
      setSelectedContact(null);
      // Reload calculations & dashboard
      await loadAllGroupCalculations();
      if (onRefreshAll) onRefreshAll();
    } else {
      showToast(`Settlement failed: ${errors.join(', ')}`, 'error');
    }
  };

  // Send combined payment claim (QR or Cash) if focal user is the PAYER
  const handleSendPaymentClaim = async (contact: ContactSummary, method: 'QR' | 'CASH') => {
    if (!user) return;
    setIsSendingNotice(true);
    try {
      const debtAmount = Math.abs(contact.netCombined);
      const debtsToSettle = contact.groupDebts
        .filter(d => d.focalOwes > 0)
        .map(d => ({
          groupId: d.groupId,
          groupName: d.groupName,
          amount: d.focalOwes,
          currency: d.currency
        }));

      if (!debtsToSettle.length) {
        showToast('No outstanding debts found to settle.', 'info');
        return;
      }

      await api.createSettlementClaim({
        receiverId: contact.userId,
        totalAmount: debtAmount,
        paymentMethod: method,
        groupDebts: debtsToSettle
      });

      showToast(
        `Payment claim of ${formatCurrency(debtAmount, 'INR')} (${method === 'CASH' ? 'Cash' : 'QR'}) sent to ${contact.name}! They will get an instant verification pop-up to settle all groups.`,
        'success'
      );
      setSelectedContact(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit payment claim', 'error');
    } finally {
      setIsSendingNotice(false);
    }
  };

  const focalCurrency = (focalUser as any)?.preferredCurrency || 'INR';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in transition-colors">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-emerald-300 text-xs font-semibold mb-3">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Consolidated Multi-Group Balances</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Total Summary</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1.5 leading-relaxed">
              Consolidated overview across all your groups. See the exact net amount owed to or by each person, and clear combined debts in just one go without clashes.
            </p>
          </div>

          {/* Profile Switcher (Inspect any member's cross-group summary) */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl flex flex-col gap-2 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-300" />
                <span>Viewing Profile:</span>
              </span>
              <button
                onClick={loadAllGroupCalculations}
                disabled={isLoading}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Refresh calculations"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
            <select
              value={focalUserId}
              onChange={(e) => setFocalUserId(e.target.value)}
              className="w-full bg-slate-900/90 text-white border border-white/20 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              id="total-summary-profile-select"
            >
              {networkMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-white/15">
          {/* 1. Total You Owe */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-rose-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>Total {focalUserId === user?.id ? 'You Owe' : 'They Owe'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200">
                {globalStats.creditorsCount} {globalStats.creditorsCount === 1 ? 'person' : 'people'}
              </span>
            </div>
            <div className="text-2xl font-black text-rose-300 tracking-tight">
              {formatCurrency(globalStats.grandOwedByFocal, focalCurrency)}
            </div>
            <p className="text-[10px] text-slate-300 mt-1">Combined sum of all payable debts</p>
          </div>

          {/* 2. Total Owed To You */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Total {focalUserId === user?.id ? 'Owed to You' : 'Owed to Them'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                {globalStats.debtorsCount} {globalStats.debtorsCount === 1 ? 'person' : 'people'}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-300 tracking-tight">
              {formatCurrency(globalStats.grandOwedToFocal, focalCurrency)}
            </div>
            <p className="text-[10px] text-slate-300 mt-1">Combined sum to be received</p>
          </div>

          {/* 3. Overall Net Balance */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-indigo-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                <span>Overall Net Standing</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200">
                {groups.length} groups
              </span>
            </div>
            <div className={`text-2xl font-black tracking-tight ${
              globalStats.netOverall > 0.01
                ? 'text-emerald-300'
                : globalStats.netOverall < -0.01
                ? 'text-rose-300'
                : 'text-slate-200'
            }`}>
              {globalStats.netOverall > 0.01 ? '+' : ''}
              {formatCurrency(globalStats.netOverall, focalCurrency)}
            </div>
            <p className="text-[10px] text-slate-300 mt-1">
              {globalStats.netOverall > 0.01
                ? 'You are in net surplus 🎉'
                : globalStats.netOverall < -0.01
                ? 'You have net pending payments'
                : 'All squared up!'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search person or group name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            id="summary-search-input"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Contacts ({contactSummaries.length})
          </button>
          <button
            onClick={() => setFilterType('YOU_OWE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'YOU_OWE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {focalUserId === user?.id ? 'You Owe' : 'Owes'} ({globalStats.creditorsCount})
          </button>
          <button
            onClick={() => setFilterType('OWES_YOU')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'OWES_YOU'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {focalUserId === user?.id ? 'Owes You' : 'Owed'} ({globalStats.debtorsCount})
          </button>
          <button
            onClick={() => setFilterType('SETTLED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'SETTLED'
                ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Settled (0)
          </button>
        </div>
      </div>

      {/* Contact Cards Grid */}
      {isLoading && contactSummaries.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Analyzing cross-group debts & settlements...
          </p>
          <p className="text-xs text-slate-400 mt-1">Cross-referencing members across all your active groups</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {searchTerm ? 'No matching contacts found' : 'All Cross-Group Debts are Settled!'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            {searchTerm
              ? 'Try searching with a different name or group title.'
              : 'There are no pending balances or debts across any of your groups. Everyone is completely squared up! 🎉'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => {
            const owesFocal = contact.netCombined < -0.01; // focal owes other
            const focalOwed = contact.netCombined > 0.01; // other owes focal
            const isSettled = !owesFocal && !focalOwed;

            const netAmount = Math.abs(contact.netCombined);

            return (
              <div
                key={contact.userId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/40 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group cursor-pointer"
                onClick={() => setSelectedContact(contact)}
              >
                <div>
                  {/* Card Header: Avatar & Contact Info & Net Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer group/prof"
                      onClick={(e) => {
                        e.stopPropagation();
                        const found = allUsers.find(u => u.id === contact.userId) || {
                          id: contact.userId,
                          name: contact.name,
                          email: contact.email,
                          avatarUrl: contact.avatarUrl,
                          phone: contact.phone,
                          qrCodeUrl: contact.qrCodeUrl,
                          upiId: contact.upiId
                        };
                        setSelectedMemberProfile(found as User);
                      }}
                      title="Click to view payment profile & QR code"
                    >
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt={contact.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs flex-shrink-0 group-hover/prof:ring-2 ring-indigo-500 transition"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-xs group-hover/prof:ring-2 ring-indigo-500 transition">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5 group-hover/prof:text-indigo-600 dark:group-hover/prof:text-indigo-400 transition">
                          <span>{contact.name}</span>
                          <QrCode className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" title="QR Profile Available" />
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {contact.email || `${contact.involvedGroupsCount} shared groups`}
                        </p>
                      </div>
                    </div>

                    {/* Net Badge */}
                    <div className="text-right flex-shrink-0">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                        owesFocal
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                          : focalOwed
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {owesFocal ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>{focalUserId === user?.id ? 'You Owe' : 'Owes'}</span>
                          </>
                        ) : focalOwed ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{focalUserId === user?.id ? 'Owes You' : 'Owed'}</span>
                          </>
                        ) : (
                          <span>Settled</span>
                        )}
                      </div>
                      <div className={`text-base sm:text-lg font-black tracking-tight mt-1 ${
                        owesFocal
                          ? 'text-rose-600 dark:text-rose-400'
                          : focalOwed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}>
                        {formatCurrency(netAmount, focalCurrency)}
                      </div>
                    </div>
                  </div>

                  {/* Summary Sentence as requested: "Pay this person this much across X groups in just one go" */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    {owesFocal ? (
                      <p className="text-slate-700 dark:text-slate-300">
                        👉 Pay <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(netAmount, focalCurrency)}</strong> to {contact.name} to complete all debts across <span className="font-semibold">{contact.groupDebts.length} groups</span> in just one go.
                      </p>
                    ) : focalOwed ? (
                      <p className="text-slate-700 dark:text-slate-300">
                        👉 {contact.name} owes you <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(netAmount, focalCurrency)}</strong> combined across <span className="font-semibold">{contact.groupDebts.length} groups</span>.
                      </p>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400">
                        ✨ All debts between you and {contact.name} are completely balanced and squared up.
                      </p>
                    )}
                  </div>

                  {/* Group-by-Group Breakdown List */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Group Breakdown ({contact.groupDebts.length})
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {contact.groupDebts.map((gd) => {
                        const focalOwesInGroup = gd.focalOwes > 0;
                        const otherOwesInGroup = gd.otherOwes > 0;

                        return (
                          <div
                            key={gd.groupId}
                            className="py-1.5 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-1 rounded transition"
                          >
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[65%] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              <span>{gd.groupName}</span>
                            </span>

                            <div className="text-right">
                              {focalOwesInGroup && (
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  You owe {formatCurrency(gd.focalOwes, gd.currency)}
                                </span>
                              )}
                              {otherOwesInGroup && (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Owes {formatCurrency(gd.otherOwes, gd.currency)}
                                </span>
                              )}
                              {!focalOwesInGroup && !otherOwesInGroup && (
                                <span className="text-slate-400">Settled</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>View Settle Plan in One Go</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContact(contact);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
                  >
                    Details & Settle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: "Complete Whole Debt in Just One Go" */}
      {selectedContact && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setSelectedContact(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/40">
              <div className="flex items-center gap-3">
                {selectedContact.avatarUrl ? (
                  <img
                    src={selectedContact.avatarUrl}
                    alt={selectedContact.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-white dark:border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-xs">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                    {selectedContact.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Consolidated settlement across {selectedContact.groupDebts.length} shared {selectedContact.groupDebts.length === 1 ? 'group' : 'groups'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedContact(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Grand Total Highlight Box */}
              <div className={`p-5 rounded-2xl border text-center ${
                selectedContact.netCombined < -0.01
                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                  : selectedContact.netCombined > 0.01
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {selectedContact.netCombined < -0.01
                    ? 'Total Amount You Need to Pay in One Go'
                    : selectedContact.netCombined > 0.01
                    ? 'Total Amount Owed to You in One Go'
                    : 'Grand Combined Balance'}
                </span>
                <div className={`text-3xl sm:text-4xl font-black tracking-tight mt-1 ${
                  selectedContact.netCombined < -0.01
                    ? 'text-rose-600 dark:text-rose-400'
                    : selectedContact.netCombined > 0.01
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {formatCurrency(Math.abs(selectedContact.netCombined), focalCurrency)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-sm mx-auto">
                  {selectedContact.netCombined < -0.01
                    ? `Clearing ${formatCurrency(Math.abs(selectedContact.netCombined), focalCurrency)} with ${selectedContact.name} will square away your entire balance across all shared groups simultaneously!`
                    : selectedContact.netCombined > 0.01
                    ? `${selectedContact.name} can pay you ${formatCurrency(selectedContact.netCombined, focalCurrency)} to settle their debt across all shared groups in one transaction.`
                    : 'No pending debt remaining with this contact.'}
                </p>
              </div>

              {/* Itemized Group Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Group-by-Group Breakdown</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {selectedContact.groupDebts.length} active groups
                  </span>
                </h4>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
                  {selectedContact.groupDebts.map((debt) => (
                    <div key={debt.groupId} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {debt.groupName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            {debt.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Currency: {debt.currency}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <div className={`text-xs sm:text-sm font-extrabold ${
                            debt.focalOwes > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : debt.otherOwes > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {debt.focalOwes > 0
                              ? `- ${formatCurrency(debt.focalOwes, debt.currency)}`
                              : debt.otherOwes > 0
                              ? `+ ${formatCurrency(debt.otherOwes, debt.currency)}`
                              : 'Settled'}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {debt.focalOwes > 0 ? 'You owe' : debt.otherOwes > 0 ? 'Owes you' : '0'}
                          </span>
                        </div>

                        {/* Open Group button */}
                        <button
                          onClick={() => {
                            setSelectedContact(null);
                            onSelectGroup(debt.groupId);
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                          title="Jump to this group"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: "Complete Whole Debt in Just One Go" */}
              <div className="space-y-3 pt-2">
                {/* CASE A: User is the RECEIVER (Other person owes user) -> ONE-CLICK SETTLE ALL */}
                {selectedContact.netCombined > 0.01 && focalUserId === user?.id && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Confirm & Settle All in One Go
                        </h5>
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                          Since you are the receiver, tapping below will record verified settlements for each of the {selectedContact.groupDebts.length} groups in one atomic flow, notifying {selectedContact.name} with zero clashes!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSettleAllInOneGo(selectedContact)}
                      disabled={isSettlingAll}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                      id="settle-all-in-one-go-btn"
                    >
                      {isSettlingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Settling across all groups...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Settle Entire {formatCurrency(selectedContact.netCombined, focalCurrency)} Now
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* CASE B: User is the PAYER (User owes other person) -> QR or Cash payment + Instant Claim */}
                {selectedContact.netCombined < -0.01 && focalUserId === user?.id && (
                  <div className="space-y-3">
                    {/* Payment Method Switcher (QR Code vs Cash) */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('QR')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          paymentMethod === 'QR'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Pay via QR Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          paymentMethod === 'CASH'
                            ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Pay via Cash</span>
                      </button>
                    </div>

                    {/* METHOD 1: QR CODE PAYMENT */}
                    {paymentMethod === 'QR' && (
                      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                {selectedContact.name}'s Payment QR Code
                              </h5>
                              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                                Scan with any UPI app to pay the combined {formatCurrency(Math.abs(selectedContact.netCombined), focalCurrency)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const found = allUsers.find(u => u.id === selectedContact.userId);
                              if (found) setSelectedMemberProfile(found);
                            }}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
                          >
                            <span>Full Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* QR Image Display */}
                        <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                          <img
                            src={
                              selectedContact.qrCodeUrl ||
                              `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                                `upi://pay?pa=${selectedContact.upiId || selectedContact.phone || selectedContact.email}&pn=${encodeURIComponent(selectedContact.name)}&am=${Math.abs(selectedContact.netCombined)}&cu=INR&tn=Hisaabdo Settlement`
                              )}`
                            }
                            alt={`${selectedContact.name}'s QR Code`}
                            className="w-48 h-48 object-contain rounded-xl"
                          />
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                            {selectedContact.qrCodeUrl ? 'Verified Personal QR Photo' : 'UPI Payment QR Code'}
                          </p>
                        </div>

                        {/* UPI ID copy & Open App button */}
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          {(selectedContact.upiId || selectedContact.phone) && (
                            <div className="w-full flex-1 flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
                              <span className="truncate pr-1 text-slate-700 dark:text-slate-300">
                                {selectedContact.upiId || selectedContact.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = selectedContact.upiId || selectedContact.phone || '';
                                  navigator.clipboard.writeText(text);
                                  setCopiedUpi(true);
                                  showToast('UPI ID copied!', 'success');
                                  setTimeout(() => setCopiedUpi(false), 2000);
                                }}
                                className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                {copiedUpi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          )}

                          <a
                            href={`upi://pay?pa=${encodeURIComponent(selectedContact.upiId || selectedContact.phone || selectedContact.email)}&pn=${encodeURIComponent(selectedContact.name)}&am=${Math.abs(selectedContact.netCombined)}&cu=INR&tn=${encodeURIComponent('Hisaabdo Consolidated Settlement')}`}
                            className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center whitespace-nowrap"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Launch UPI App</span>
                          </a>
                        </div>

                        {/* Submit Claim Button */}
                        <button
                          type="button"
                          onClick={() => handleSendPaymentClaim(selectedContact, 'QR')}
                          disabled={isSendingNotice}
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 mt-2"
                        >
                          {isSendingNotice ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting verification claim...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>I Paid via QR — Send Claim to {selectedContact.name}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* METHOD 2: CASH PAYMENT */}
                    {paymentMethod === 'CASH' && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                              Direct Cash Settlement
                            </h5>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                              Hand over <strong>{formatCurrency(Math.abs(selectedContact.netCombined), focalCurrency)}</strong> in physical cash directly to {selectedContact.name}.
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-slate-700 dark:text-slate-300">
                          <p>
                            Once you tap below, a full-screen verification prompt will appear on <strong>{selectedContact.name}</strong>'s device when they open the app. When they confirm, all {selectedContact.groupDebts.length} groups will settle automatically!
                          </p>
                        </div>

                        {/* Submit Cash Claim Button */}
                        <button
                          type="button"
                          onClick={() => handleSendPaymentClaim(selectedContact, 'CASH')}
                          disabled={isSendingNotice}
                          className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                          {isSendingNotice ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting cash claim...</span>
                            </>
                          ) : (
                            <>
                              <Banknote className="w-4 h-4" />
                              <span>I Handed Over Cash — Send Claim to {selectedContact.name}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Conflict-free cross-group synchronization</span>
              </span>
              <button
                onClick={() => setSelectedContact(null)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Payment QR Code Profile Modal */}
      {selectedMemberProfile && (
        <MemberProfileModal
          isOpen={Boolean(selectedMemberProfile)}
          onClose={() => setSelectedMemberProfile(null)}
          member={selectedMemberProfile}
        />
      )}
    </div>
  );
};

