import React, { useState } from 'react';
import { GroupCalculationData, ExpenseItem, SettlementItem, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { formatCurrency, formatSignedCurrency, getCategoryMeta, GROUP_CATEGORIES, CATEGORIES } from '../utils/formatters';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Share2,
  Users,
  PieChart as PieIcon,
  Receipt,
  Scale,
  Settings,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Bell,
  Trash2,
  Copy,
  Check,
  Calendar,
  Layers,
  ChevronRight,
  KeyRound,
  MessageCircle,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChangeMemberPasswordModal } from './ChangeMemberPasswordModal';

interface GroupDetailProps {
  groupData: GroupCalculationData;
  expenses: ExpenseItem[];
  settlements: SettlementItem[];
  allUsers: User[];
  onBack: () => void;
  onOpenAddExpense: (groupId: string) => void;
  onOpenEditExpense?: (expense: ExpenseItem) => void;
  onOpenSettleUp: (groupId: string, defaultPayerId?: string, defaultReceiverId?: string, defaultAmount?: number) => void;
  onOpenInvite: (groupId: string) => void;
  onOpenExpenseDetail: (expense: ExpenseItem) => void;
  onOpenSendReminder: (toUserId: string, toName: string, amount: number, currency: any) => void;
  onRefresh: () => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroup: (groupId: string, data: any) => Promise<void>;
  onRemoveMember: (groupId: string, userId: string) => Promise<void>;
}

type TabType = 'expenses' | 'balances' | 'analytics' | 'settlements' | 'members';

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#14B8A6', '#F43F5E'];

export const GroupDetailView: React.FC<GroupDetailProps> = ({
  groupData,
  expenses,
  settlements,
  allUsers,
  onBack,
  onOpenAddExpense,
  onOpenEditExpense,
  onOpenSettleUp,
  onOpenInvite,
  onOpenExpenseDetail,
  onOpenSendReminder,
  onRefresh,
  onDeleteGroup,
  onUpdateGroup,
  onRemoveMember
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [copiedCode, setCopiedCode] = useState(false);

  // Expense search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPayer, setSelectedPayer] = useState('ALL');

  // Simplification view toggle
  const [showUnsimplified, setShowUnsimplified] = useState(false);

  // Group settings edit state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState(groupData.group.name);
  const [editDesc, setEditDesc] = useState(groupData.group.description);
  const [editCategory, setEditCategory] = useState(groupData.group.category);
  const [editCurrency, setEditCurrency] = useState(groupData.group.defaultCurrency);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Member removal confirmation state
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Group deletion confirmation state
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Password change modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalTarget, setPasswordModalTarget] = useState<{ userId: string; name: string; passcode: string } | null>(null);

  const group = groupData.group;
  const currency = group.defaultCurrency;
  const isAdmin = group.members.some(m => m.userId === user?.id && m.role === 'admin');

  // Open password modal helper
  const handleOpenChangePassword = (targetUserId?: string, targetName?: string, targetPasscode?: string) => {
    const uid = targetUserId || user?.id || '';
    const mem = group.members.find(m => m.userId === uid);
    const u = allUsers.find(usr => usr.id === uid);
    setPasswordModalTarget({
      userId: uid,
      name: targetName || u?.name || user?.name || 'You',
      passcode: targetPasscode || mem?.memberPasscode || ''
    });
    setIsPasswordModalOpen(true);
  };

  // Copy invite link / code
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedCode(true);
    showToast(`Invite code ${group.inviteCode} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Confirm remove member handler
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    try {
      await onRemoveMember(group.id, memberToRemove.id);
      showToast(`${memberToRemove.name} removed from group`, 'success');
      setMemberToRemove(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Could not remove member', 'error');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    setIsDeletingGroup(true);
    try {
      await onDeleteGroup(group.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete group', 'error');
      setIsDeletingGroup(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || e.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesPayer = selectedPayer === 'ALL' || e.paidBy.some(p => p.userId === selectedPayer);
    return matchesSearch && matchesCat && matchesPayer;
  });

  // Group expenses by date header (Section 12: Today, Yesterday, earlier dates)
  const groupedExpenses: Record<string, ExpenseItem[]> = {};
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  for (const exp of filteredExpenses) {
    let header = exp.date;
    if (exp.date === todayStr) {
      header = 'Today';
    } else if (exp.date === yesterdayStr) {
      header = 'Yesterday';
    } else {
      const d = new Date(exp.date);
      header = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (!groupedExpenses[header]) {
      groupedExpenses[header] = [];
    }
    groupedExpenses[header].push(exp);
  }

  // Analytics aggregation
  const categorySpendingMap = new Map<string, number>();
  for (const exp of expenses) {
    const cat = exp.category || 'Other';
    categorySpendingMap.set(cat, (categorySpendingMap.get(cat) || 0) + exp.amount);
  }
  const categoryChartData = Array.from(categorySpendingMap.entries()).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100
  })).sort((a, b) => b.value - a.value);

  const memberSpendingChartData = groupData.balances.map(b => ({
    name: b.name.split(' ')[0],
    paid: Math.round(b.paid * 100) / 100,
    share: Math.round(b.share * 100) / 100
  }));

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateGroup(group.id, {
        name: editName,
        description: editDesc,
        category: editCategory,
        defaultCurrency: editCurrency
      });
      setIsEditingSettings(false);
      showToast('Group settings updated successfully', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRemoveMemberClick = (memberUserId: string, memberName: string) => {
    setMemberToRemove({ id: memberUserId, name: memberName });
  };

  const catMeta = GROUP_CATEGORIES.find(c => c.id === group.category) || { icon: '📁', label: group.category };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition cursor-pointer"
          id="back-to-dashboard-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenChangePassword()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
            title="View or change your personal password for this group"
            id="my-group-password-btn"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>My Password</span>
          </button>

          <button
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            title="Invite code"
            id="copy-invite-code-btn"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Code: <span className="font-mono font-bold text-slate-900">{group.inviteCode}</span></span>
          </button>

          <button
            onClick={() => onOpenInvite(group.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
            id="invite-members-btn"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>Send Links & Passwords</span>
          </button>
        </div>
      </div>

      {/* Group Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-3xl shadow-sm">
              {catMeta.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{group.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {catMeta.label}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  {group.defaultCurrency}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {group.description || 'Shared expense tracking & bill splitting group'}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenAddExpense(group.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition cursor-pointer"
              id="group-add-expense-cta"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
            <button
              onClick={() => onOpenSettleUp(group.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer"
              id="group-settle-up-cta"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Settle Up</span>
            </button>
          </div>
        </div>

        {/* Quick Balance Status Ribbon */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Total Group Spending</span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {formatCurrency(groupData.totalSpending, currency)}
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Your Group Balance</span>
            <div className={`text-base font-bold mt-0.5 ${
              groupData.myNet > 0.01 ? 'text-emerald-600' : groupData.myNet < -0.01 ? 'text-rose-600' : 'text-slate-700'
            }`}>
              {groupData.myNet > 0.01
                ? `You are owed ${formatCurrency(groupData.myNet, currency)}`
                : groupData.myNet < -0.01
                ? `You owe ${formatCurrency(Math.abs(groupData.myNet), currency)}`
                : 'You are settled up'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Expenses Recorded</span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Group Members</span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {group.members.length} people
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            id="tab-expenses-btn"
          >
            <Receipt className="w-4 h-4" />
            <span>Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'balances'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            id="tab-balances-btn"
          >
            <Scale className="w-4 h-4" />
            <span>Balances & Debt Simplification</span>
            {groupData.debtSimplification.transactionsSaved > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                -{groupData.debtSimplification.transactionsSaved} tx
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            id="tab-analytics-btn"
          >
            <PieIcon className="w-4 h-4" />
            <span>Analytics & Charts</span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'settlements'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            id="tab-settlements-btn"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Settlements ({settlements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            id="tab-members-btn"
          >
            <Users className="w-4 h-4" />
            <span>Members & Settings</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: EXPENSES TIMELINE */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search expenses by title or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>

              <select
                value={selectedPayer}
                onChange={(e) => setSelectedPayer(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">Paid by Anyone</option>
                {groupData.balances.map(b => (
                  <option key={b.userId} value={b.userId}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline List */}
          {Object.keys(groupedExpenses).length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">No expenses found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'ALL' || selectedPayer !== 'ALL'
                  ? 'Try changing your search or filter options.'
                  : 'Add your first group expense to see it in this timeline.'}
              </p>
              <button
                onClick={() => onOpenAddExpense(group.id)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                + Add First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedExpenses).map(([dateGroup, items]) => (
                <div key={dateGroup} className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dateGroup}</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {items.map((exp) => {
                      const cat = getCategoryMeta(exp.category);
                      const mySplit = exp.splits.find(s => s.userId === user?.id);
                      const myPayment = exp.paidBy.find(p => p.userId === user?.id);
                      const primaryPayer = exp.paidBy[0];

                      return (
                        <div
                          key={exp.id}
                          onClick={() => onOpenExpenseDetail(exp)}
                          className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4 cursor-pointer group"
                        >
                          {/* Left: Category Icon & Info */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${cat.color}`}>
                              {cat.icon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600 transition truncate">
                                {exp.description}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                <span className="font-medium text-slate-700">
                                  {exp.paidBy.length > 1
                                    ? `${exp.paidBy.length} people paid`
                                    : `${primaryPayer?.userName || 'Someone'} paid`}
                                </span>
                                {' • '}
                                <span>{exp.splits.length} participants</span>
                                {exp.receiptUrl && <span className="ml-1 text-[10px] text-emerald-600 font-bold">📎 Receipt</span>}
                              </p>
                            </div>
                          </div>

                          {/* Right: Total Amount & Personal Involvement & Quick Actions */}
                          <div className="text-right flex-shrink-0 flex items-center gap-3">
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {formatCurrency(exp.amount, currency)}
                              </div>
                              <div className="text-[11px] font-medium">
                                {myPayment && myPayment.amount > (mySplit?.amount || 0) ? (
                                  <span className="text-emerald-600">
                                    you lent {formatCurrency(myPayment.amount - (mySplit?.amount || 0), currency)}
                                  </span>
                                ) : mySplit && (!myPayment || myPayment.amount < mySplit.amount) ? (
                                  <span className="text-rose-600">
                                    you borrowed {formatCurrency(mySplit.amount - (myPayment?.amount || 0), currency)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">no balance change</span>
                                )}
                              </div>
                            </div>

                            {/* Quick Edit button */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenEditExpense) {
                                    onOpenEditExpense(exp);
                                  } else {
                                    onOpenExpenseDetail(exp);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition hidden sm:block" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BALANCES & DEBT SIMPLIFICATION */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Smart Debt Simplification Banner (Section 9) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2.5 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Smart Debt Simplification Solver</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">Minimum Transaction Plan</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">
                  Hisaabdo algorithm computes the global net cash flows to settle all balances in the fewest practical transfers.
                </p>
              </div>

              {/* Optimization Pill */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-3.5 border border-white/10 text-center sm:text-right">
                <div className="text-xs text-slate-300 font-medium">Algorithm Result</div>
                <div className="text-lg font-extrabold text-emerald-400">
                  {groupData.debtSimplification.simplifiedCount} Payments Needed
                </div>
                <div className="text-[11px] text-slate-400">
                  Reduced from {groupData.debtSimplification.unsimplifiedCount} pairwise transfers ({groupData.debtSimplification.transactionsSaved} saved)
                </div>
              </div>
            </div>

            {/* Simplification Toggle */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setShowUnsimplified(!showUnsimplified)}
                className="text-xs text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-4 cursor-pointer"
              >
                {showUnsimplified ? 'Hide Raw Pairwise Debts' : 'View Raw Unsimplified Debts (Before Simplification)'}
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Saves time and eliminates circular transactions
              </span>
            </div>
          </div>

          {/* Unsimplified Comparison View (Section 9 Before Simplification) */}
          {showUnsimplified && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Before Simplification (Raw Pairwise Debts: {groupData.debtSimplification.unsimplifiedCount} Transfers)
                  </h3>
                  <p className="text-[11px] text-amber-700">These are all individual debts resulting directly from each bill split</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {groupData.debtSimplification.unsimplified.map((debt, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                    <span className="text-slate-800 font-medium">
                      <strong className="text-slate-900">{debt.fromName}</strong> owes <strong className="text-slate-900">{debt.toName}</strong>
                    </span>
                    <span className="font-bold text-amber-800">{formatCurrency(debt.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simplified Direct Transactions (Section 9 & 10) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Suggested Optimal Payments ({groupData.debtSimplification.simplifiedCount})</span>
            </h3>

            {groupData.debtSimplification.simplified.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Everyone is all squared up!</h4>
                <p className="text-xs text-slate-500 mt-0.5">No pending debts exist in this group.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupData.debtSimplification.simplified.map((debt, idx) => {
                  const isUserPayer = debt.fromUserId === user?.id;
                  const isUserReceiver = debt.toUserId === user?.id;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition shadow-sm ${
                        isUserPayer
                          ? 'bg-rose-50/60 border-rose-200'
                          : isUserReceiver
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={debt.fromAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${debt.fromName}`}
                            alt={debt.fromName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block truncate max-w-[100px]">
                              {debt.fromName} {isUserPayer && '(You)'}
                            </span>
                            <span className="text-[10px] text-slate-500">pays</span>
                          </div>

                          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

                          <img
                            src={debt.toAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${debt.toName}`}
                            alt={debt.toName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block truncate max-w-[100px]">
                              {debt.toName} {isUserReceiver && '(You)'}
                            </span>
                            <span className="text-[10px] text-slate-500">receives</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-base font-extrabold text-slate-900">
                            {formatCurrency(debt.amount, currency)}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on simplified transaction */}
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {isUserPayer ? 'You owe this settlement' : isUserReceiver ? 'They owe you' : 'Member debt'}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Settle Now CTA */}
                          <button
                            onClick={() => onOpenSettleUp(group.id, debt.fromUserId, debt.toUserId, debt.amount)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            Settle Now
                          </button>

                          {/* Send Reminder CTA (Requirement 17) */}
                          {isUserReceiver && (
                            <button
                              onClick={() => onOpenSendReminder(debt.fromUserId, debt.fromName, debt.amount, currency)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                              title="Send friendly reminder"
                            >
                              <Bell className="w-3 h-3" />
                              <span>Remind</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 10: Overall Group Balance Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Overall Group Balance Table</h3>
              <p className="text-xs text-slate-500">Total upfront payments, fair shares, and net balance for each member</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4">Member</th>
                    <th className="pb-3 px-4 text-right">Total Paid Upfront</th>
                    <th className="pb-3 px-4 text-right">Total Fair Share</th>
                    <th className="pb-3 pl-4 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupData.balances.map((b) => (
                    <tr key={b.userId} className={`hover:bg-slate-50/60 transition ${b.userId === user?.id ? 'bg-emerald-50/30' : ''}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={b.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`}
                            alt={b.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {b.name} {b.userId === user?.id && '(You)'}
                            </span>
                            <span className="text-[10px] text-slate-400">{b.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(b.paid, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(b.share, currency)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs ${
                          b.net > 0.01
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.net < -0.01
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {b.net > 0.01 ? `+${formatCurrency(b.net, currency)}` :
                           b.net < -0.01 ? `-${formatCurrency(Math.abs(b.net), currency)}` :
                           `${formatCurrency(0, currency)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS & CHARTS (Section 15) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Insights Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Group Spend</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(groupData.totalSpending, currency)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Across {expenses.length} bills</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Expense</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(expenses.length > 0 ? groupData.totalSpending / expenses.length : 0, currency)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Per recorded activity</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Spender Upfront</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1 truncate">
                {groupData.balances.slice().sort((a, b) => b.paid - a.paid)[0]?.name || 'N/A'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Paid highest upfront cost</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart: Spending by Category */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Spending by Category</h3>
                <p className="text-xs text-slate-500">Distribution of expenditures by type</p>
              </div>

              {categoryChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No expenses to chart
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Bar Chart: Spending by Member */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Paid Upfront vs Fair Share</h3>
                <p className="text-xs text-slate-500">Compare what each person actually paid vs their consumed share</p>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberSpendingChartData}>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} />
                    <Legend />
                    <Bar dataKey="paid" name="Paid Upfront" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="share" name="Consumed Share" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTLEMENTS LEDGER (Section 11) */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Settlement History</h3>
              <p className="text-xs text-slate-500">Record of all payments and balance liquidations between members</p>
            </div>
            <button
              onClick={() => onOpenSettleUp(group.id)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              + Record Payment
            </button>
          </div>

          {settlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">No settlements recorded yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When someone transfers money to settle their debt, record it here to update balances immediately.
              </p>
              <button
                onClick={() => onOpenSettleUp(group.id)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Record First Settlement
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
              {settlements.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="text-slate-900 font-semibold leading-snug">
                        <span>{s.payerName}</span> paid <span>{s.receiverName}</span>
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {s.notes && ` • "${s.notes}"`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-emerald-600">
                      {formatCurrency(s.amount, s.currency || currency)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Payment settled</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MEMBERS & GROUP SETTINGS (Section 4 & 26) */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Group Members ({group.members.length})</h3>
                <p className="text-xs text-slate-500">People participating in this group's expenses</p>
              </div>
              <button
                onClick={() => onOpenInvite(group.id)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 transition"
              >
                + Add Member
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {group.members.map((m) => {
                const memberUser = allUsers.find(u => u.id === m.userId);
                const isCurrent = m.userId === user?.id;
                const memberBalance = groupData.balances.find(b => b.userId === m.userId);

                return (
                  <div key={m.userId} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={memberUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberUser?.name || m.userId}`}
                        alt={memberUser?.name || 'Member'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {memberUser?.name || 'Unknown'} {isCurrent && '(You)'}
                          </span>
                          {m.role === 'admin' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-medium">Password:</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-900 font-mono font-bold text-xs rounded border border-slate-200 tracking-wider">
                            {m.memberPasscode || '1234'}
                          </span>
                          {(isCurrent || isAdmin) && (
                            <button
                              onClick={() => handleOpenChangePassword(m.userId, memberUser?.name, m.memberPasscode)}
                              className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer ml-1"
                              title="Change password"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Change</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const text = `Hey ${memberUser?.name || 'Friend'}! Join our group "${group.name}" to add your expenses.\n\nLink: ${window.location.origin}/?group=${group.id}&member=${m.userId}\nYour Member Password: ${m.memberPasscode || '1234'}`;
                              navigator.clipboard.writeText(text);
                              showToast(`Invitation copied for ${memberUser?.name}!`, 'success');
                            }}
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer ml-1"
                            title="Copy link & password message"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Msg</span>
                          </button>
                          <button
                            onClick={() => {
                              const text = `Hey ${memberUser?.name || 'Friend'}! Join our group "${group.name}" to add your expenses.\n\nLink: ${window.location.origin}/?group=${group.id}&member=${m.userId}\nYour Member Password: ${m.memberPasscode || '1234'}`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Net balance</div>
                        <div className={`text-xs font-bold ${
                          (memberBalance?.net || 0) > 0.01
                            ? 'text-emerald-600'
                            : (memberBalance?.net || 0) < -0.01
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}>
                          {formatSignedCurrency(memberBalance?.net || 0, currency)}
                        </div>
                      </div>

                      {isAdmin && !isCurrent && (
                        <button
                          onClick={() => handleRemoveMemberClick(m.userId, memberUser?.name || 'this member')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remove member (allowed only if no prior expenses exist)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Settings / Admin Options (Section 26) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" />
                <span>Group Settings</span>
              </h3>

              {!isEditingSettings ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Group Name</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{group.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Category</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{catMeta.label}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Default Currency</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{group.defaultCurrency}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Invite Code</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{group.inviteCode}</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setIsEditingSettings(true)}
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition"
                    >
                      Edit Group Info
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Group Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {GROUP_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Currency</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      {isSavingSettings ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingSettings(false)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Delete Group Card (Admin only) */}
            {isAdmin && (
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 text-xs space-y-2">
                <h4 className="font-bold text-rose-900">Danger Zone</h4>
                <p className="text-rose-700 leading-snug">
                  Deleting this group permanently removes all recorded expenses, settlements, and member calculations.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteGroupConfirm(true)}
                  className="mt-2 w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition cursor-pointer"
                >
                  Delete Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Confirm Remove Member */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Remove Member?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to remove <strong className="text-slate-900">{memberToRemove.name}</strong> from this group?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemovingMember}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isRemovingMember ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete Group */}
      {showDeleteGroupConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Delete Entire Group?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently delete <strong className="text-slate-900">"{group.name}"</strong>? All expenses, settlements, and member data will be deleted permanently.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteGroupConfirm(false)}
                disabled={isDeletingGroup}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={isDeletingGroup}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingGroup ? 'Deleting...' : 'Yes, Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Change Member Password */}
      {isPasswordModalOpen && passwordModalTarget && (
        <ChangeMemberPasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPasswordModalTarget(null);
          }}
          groupId={group.id}
          groupName={group.name}
          userId={passwordModalTarget.userId}
          userName={passwordModalTarget.name}
          currentPasscode={passwordModalTarget.passcode}
          onSuccess={(newCode) => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
