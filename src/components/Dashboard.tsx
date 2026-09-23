import React, { useState } from 'react';
import { GroupItem, ActivityItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatSignedCurrency, GROUP_CATEGORIES } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  KeyRound,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Receipt,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  groups: GroupItem[];
  activities: ActivityItem[];
  activeTab?: 'home' | 'groups' | 'activity';
  onSelectTab?: (tab: 'home' | 'groups' | 'activity') => void;
  onSelectGroup: (groupId: string) => void;
  onOpenAddExpense: () => void;
  onOpenCreateGroup: () => void;
  onOpenSettleUp: (groupId?: string) => void;
  onOpenJoinGroup: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  groups,
  activities,
  activeTab = 'home',
  onSelectTab,
  onSelectGroup,
  onOpenAddExpense,
  onOpenCreateGroup,
  onOpenSettleUp,
  onOpenJoinGroup
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'EXPENSE' | 'SETTLEMENT' | 'REMINDER'>('ALL');
  const [activitySearch, setActivitySearch] = useState('');

  const currency = user?.preferredCurrency || 'INR';

  // Calculate global summary across all groups
  let totalYouAreOwed = 0;
  let totalYouOwe = 0;

  for (const g of groups) {
    if (g.userBalance > 0.01) {
      totalYouAreOwed += g.userBalance;
    } else if (g.userBalance < -0.01) {
      totalYouOwe += Math.abs(g.userBalance);
    }
  }

  const netBalance = totalYouAreOwed - totalYouOwe;

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'EXPENSE' && act.action !== 'CREATED_EXPENSE') return false;
    if (activityFilter === 'SETTLEMENT' && act.action !== 'RECORDED_SETTLEMENT') return false;
    if (activityFilter === 'REMINDER' && act.action !== 'SENT_REMINDER') return false;

    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      return act.userName.toLowerCase().includes(q) || act.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Render dedicated Groups tab view
  if (activeTab === 'groups') {
    return (
      <div className="space-y-6 pb-16 transition-colors">
        {/* Groups Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Your Groups
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select any group to view expenses, balances, and smart settlement plans.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenJoinGroup}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              id="groups-view-join-btn"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={onOpenCreateGroup}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition cursor-pointer"
              id="groups-view-create-btn"
            >
              <Plus className="w-4 h-4" />
              <span>New Group</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search groups by name or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              id="groups-search-input"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              id="groups-category-select"
            >
              <option value="ALL">All Categories</option>
              {GROUP_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Groups Cards Grid */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">No groups found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'No groups match your current search criteria.' : 'You haven’t joined or created any groups yet. Start by creating a group for your trip, house, or project.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={onOpenCreateGroup}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                Create Group
              </button>
              <button
                onClick={onOpenJoinGroup}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Join with Invite Code
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredGroups.map((group) => {
              const catMeta = GROUP_CATEGORIES.find(c => c.id === group.category) || { icon: '📁', label: group.category };
              return (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 p-5 shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden"
                  id={`group-card-${group.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition">
                        {catMeta.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate max-w-[170px]">
                          {group.name}
                        </h3>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{catMeta.label}</span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-center transition">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-3 min-h-[32px]">
                    {group.description || 'No description provided'}
                  </p>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {group.members.slice(0, 4).map((m, idx) => (
                          <img
                            key={m.userId || idx}
                            src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                            alt={m.name}
                            title={m.name}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-2">
                        {group.membersCount} {group.membersCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Your balance</div>
                      <div className={`text-xs font-bold ${
                        group.userBalance > 0.01
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : group.userBalance < -0.01
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {group.userBalance > 0.01
                          ? `Owed ${formatCurrency(group.userBalance, group.defaultCurrency)}`
                          : group.userBalance < -0.01
                          ? `You owe ${formatCurrency(Math.abs(group.userBalance), group.defaultCurrency)}`
                          : 'Settled up'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Render dedicated Activity tab view
  if (activeTab === 'activity') {
    return (
      <div className="space-y-6 pb-16 transition-colors">
        {/* Activity Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Activity Feed
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Feed</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Live record of all expenses, settlements, and member updates across your groups.
            </p>
          </div>

          {/* Activity Filters */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActivityFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activityFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({activities.length})
            </button>
            <button
              onClick={() => setActivityFilter('EXPENSE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activityFilter === 'EXPENSE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActivityFilter('SETTLEMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activityFilter === 'SETTLEMENT'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Settlements
            </button>
            <button
              onClick={() => setActivityFilter('REMINDER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activityFilter === 'REMINDER'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Reminders
            </button>
          </div>
        </div>

        {/* Activity Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search activities by user or description..."
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            id="activity-search-input"
          />
        </div>

        {/* Activities List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No activities found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {activitySearch ? 'No activities match your search term.' : 'Activities will automatically appear here when expenses or settlements are added.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredActivities.map((act) => {
                const groupObj = groups.find(g => g.id === act.groupId);
                return (
                  <div key={act.id} className="pt-4 first:pt-0 flex items-start gap-3.5">
                    <img
                      src={act.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${act.userName}`}
                      alt={act.userName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 mt-0.5 shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{act.userName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          act.action === 'CREATED_EXPENSE'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : act.action === 'RECORDED_SETTLEMENT'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : act.action === 'SENT_REMINDER'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {act.action === 'CREATED_EXPENSE' ? 'Added Expense' :
                           act.action === 'RECORDED_SETTLEMENT' ? 'Settled Up' :
                           act.action === 'SENT_REMINDER' ? 'Payment Reminder' :
                           act.action === 'JOINED_GROUP' ? 'Joined Group' : 'Updated'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {act.description}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                        <span>
                          {new Date(act.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {groupObj && (
                          <button
                            onClick={() => onSelectGroup(groupObj.id)}
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                          >
                            <span>Group: {groupObj.name}</span>
                            <ArrowUpRight className="w-3 h-3" />
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
      </div>
    );
  }

  // Default: Render Home / Overview Dashboard
  return (
    <div className="space-y-8 pb-16 transition-colors">
      {/* Welcome Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 rounded-2xl text-white shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium mb-3 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Expense Engine Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user ? user.name : 'Guest'}
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Track shared bills, automatically minimize settlements with group debt simplification, and stay squared up.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition cursor-pointer"
            id="dashboard-add-expense-hero-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => onOpenSettleUp()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur border border-white/10 transition cursor-pointer"
            id="dashboard-settle-up-btn"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settle Up</span>
          </button>
          <button
            onClick={onOpenCreateGroup}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur border border-white/10 transition cursor-pointer"
            id="dashboard-create-group-btn"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">New Group</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total You are Owed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">You are owed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400" id="stat-owed">
              {formatCurrency(totalYouAreOwed, currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Friends will pay you this amount</p>
        </div>

        {/* Total You Owe */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">You owe</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400" id="stat-owe">
              {formatCurrency(totalYouOwe, currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Amount you need to settle</p>
        </div>

        {/* Net Balance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Balance</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              netBalance >= 0
                ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight ${
              netBalance > 0.01
                ? 'text-emerald-600 dark:text-emerald-400'
                : netBalance < -0.01
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-800 dark:text-slate-200'
            }`} id="stat-net">
              {formatSignedCurrency(netBalance, currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {netBalance > 0.01 ? 'Overall positive balance' : netBalance < -0.01 ? 'Overall negative balance' : 'You are all settled up!'}
          </p>
        </div>

        {/* Active Groups */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Groups</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white" id="stat-groups-count">
              {groups.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">groups joined</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={onOpenJoinGroup}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              <span>Join code</span>
            </button>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('groups')}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Groups & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Groups List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Groups</h2>
              {onSelectTab && (
                <button
                  onClick={() => onSelectTab('groups')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  View all ({groups.length})
                </button>
              )}
            </div>

            {/* Search & Category Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-36 sm:w-44"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Types</option>
                {GROUP_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Group Cards */}
          {filteredGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No groups found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm ? 'No groups match your search criteria.' : 'Create a new group or join one with an invite code.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={onOpenCreateGroup}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  Create Group
                </button>
                <button
                  onClick={onOpenJoinGroup}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Enter Invite Code
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredGroups.map((group) => {
                const catMeta = GROUP_CATEGORIES.find(c => c.id === group.category) || { icon: '📁', label: group.category };
                return (
                  <div
                    key={group.id}
                    onClick={() => onSelectGroup(group.id)}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 p-5 shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden"
                    id={`group-card-${group.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition">
                          {catMeta.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate max-w-[150px]">
                              {group.name}
                            </h3>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{catMeta.label}</span>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-center transition">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-3 min-h-[32px]">
                      {group.description || 'No description provided'}
                    </p>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {group.members.slice(0, 4).map((m, idx) => (
                            <img
                              key={m.userId || idx}
                              src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                              alt={m.name}
                              title={m.name}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-2">
                          {group.membersCount} {group.membersCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Your balance</div>
                        <div className={`text-xs font-bold ${
                          group.userBalance > 0.01
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : group.userBalance < -0.01
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {group.userBalance > 0.01
                            ? `Owed ${formatCurrency(group.userBalance, group.defaultCurrency)}`
                            : group.userBalance < -0.01
                            ? `You owe ${formatCurrency(Math.abs(group.userBalance), group.defaultCurrency)}`
                            : 'Settled up'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('activity')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View feed</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No recent activity logged yet.
              </div>
            ) : (
              <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800">
                {activities.slice(0, 7).map((act) => (
                  <div key={act.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <img
                      src={act.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${act.userName}`}
                      alt={act.userName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-white">{act.userName}</span>{' '}
                        {act.action === 'CREATED_EXPENSE' ? 'added' :
                         act.action === 'RECORDED_SETTLEMENT' ? 'settled' :
                         act.action === 'JOINED_GROUP' ? 'joined' :
                         act.action === 'SENT_REMINDER' ? 'sent reminder' : 'updated'}{' '}
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {act.description.replace(/^.*?added |^.*?settled |^.*?joined /i, '')}
                        </span>
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
