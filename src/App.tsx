import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { api } from './services/api';
import { GroupItem, GroupCalculationData, ExpenseItem, SettlementItem, ActivityItem, User } from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { GroupDetailView } from './components/GroupDetail';
import { AddExpenseModal } from './components/AddExpenseModal';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { SettleUpModal } from './components/SettleUpModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { InviteModal } from './components/InviteModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { ReminderModal } from './components/ReminderModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { SecurityQuestionsSetupModal } from './components/SecurityQuestionsSetupModal';
import { AuthView } from './components/AuthView';
import { GroupPortalModal } from './components/GroupPortalModal';
import { GunReminderOverlay } from './components/GunReminderOverlay';
import { BalanceDetailModal, BalanceViewType } from './components/BalanceDetailModal';
import { BottomNav } from './components/BottomNav';
import { Loader2 } from 'lucide-react';

// ─── URL Helpers ───────────────────────────────────────────────────────────────
// Read a query-param from the current URL without triggering navigation.
function getUrlParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

// Silently update the URL query-params (no page reload).
function setUrlParams(updates: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === '') {
      url.searchParams.delete(k);
    } else {
      url.searchParams.set(k, v);
    }
  }
  window.history.replaceState(null, '', url.toString());
}

function HisaabdoMain() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useNotification();

  // Primary data state (Cache-first for instant 0ms initial load)
  const [groups, setGroups] = useState<GroupItem[]>(() => {
    try {
      const cached = localStorage.getItem('hisaabdo_cached_groups');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const cached = localStorage.getItem('hisaabdo_cached_activities');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem('hisaabdo_cached_users');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingData, setIsLoadingData] = useState(() => {
    try {
      return !localStorage.getItem('hisaabdo_cached_groups');
    } catch {
      return true;
    }
  });

  // Group Detail View state — restore from URL on mount
  const [selectedGroupId, setSelectedGroupIdRaw] = useState<string | null>(() => getUrlParam('group'));
  const [selectedGroupCalculation, setSelectedGroupCalculation] = useState<GroupCalculationData | null>(null);
  const [groupExpenses, setGroupExpenses] = useState<ExpenseItem[]>([]);
  const [groupSettlements, setGroupSettlements] = useState<SettlementItem[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(false);

  // In-memory cache for group details so switching groups is instant
  const groupDetailCache = useRef<Map<string, { calc: GroupCalculationData; expenses: ExpenseItem[]; settlements: SettlementItem[]; ts: number }>>(new Map());
  const CACHE_TTL = 60_000; // 1 minute — serve stale, revalidate in background

  // Mobile navigation tab — restore from URL on mount
  const [mobileTab, setMobileTabRaw] = useState<'home' | 'groups' | 'activity' | 'profile'>(() => {
    const t = getUrlParam('tab');
    return (t === 'groups' || t === 'activity' || t === 'profile') ? t : 'home';
  });

  // Wrappers that sync state → URL
  const setSelectedGroupId = useCallback((id: string | null) => {
    setSelectedGroupIdRaw(id);
    setUrlParams({ group: id, tab: null }); // clear tab when viewing a group
  }, []);

  const setMobileTab = useCallback((tab: 'home' | 'groups' | 'activity' | 'profile') => {
    setMobileTabRaw(tab);
    setUrlParams({ tab: tab === 'home' ? null : tab });
  }, []);

  // Modal visibility states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [addExpenseGroupId, setAddExpenseGroupId] = useState<string | undefined>();
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseItem | null>(null);

  const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [settleUpProps, setSettleUpProps] = useState<{
    groupId?: string;
    payerId?: string;
    receiverId?: string;
    amount?: number;
  }>({});

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState<string>('');
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);

  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderProps, setReminderProps] = useState<{
    toUserId: string;
    toName: string;
    amount: number;
    currency: any;
    groupId: string;
  }>({ toUserId: '', toName: '', amount: 0, currency: 'INR', groupId: '' });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSecurityQuestionsOpen, setIsSecurityQuestionsOpen] = useState(false);

  // Balance detail modal state
  const [isBalanceDetailOpen, setIsBalanceDetailOpen] = useState(false);
  const [balanceViewType, setBalanceViewType] = useState<BalanceViewType>('owed');

  // Group Link & Member Password Portal state
  const [portalGroupId, setPortalGroupId] = useState<string | null>(null);
  const [portalMemberId, setPortalMemberId] = useState<string | undefined>();
  const [portalPasscode, setPortalPasscode] = useState<string | undefined>();
  const [portalAutoExpense, setPortalAutoExpense] = useState(true);

  // Load all initial data (Stale-While-Revalidate)
  const loadDashboardData = useCallback(async () => {
    try {
      const [groupsData, actsData] = await Promise.all([
        api.getGroups(),
        api.getActivities(undefined, 20)
      ]);
      setGroups(groupsData);
      setActivities(actsData);
      try {
        localStorage.setItem('hisaabdo_cached_groups', JSON.stringify(groupsData));
        localStorage.setItem('hisaabdo_cached_activities', JSON.stringify(actsData));
      } catch {
        // ignore
      }

      // Fetch users in background without blocking dashboard render
      api.getUsers().then(usersData => {
        setAllUsers(usersData.users);
        try {
          localStorage.setItem('hisaabdo_cached_users', JSON.stringify(usersData.users));
        } catch {
          // ignore
        }
      }).catch(err => console.warn('Background users fetch warning:', err));
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Load single group details with cache-first strategy
  const loadGroupDetails = useCallback(async (groupId: string, forceRefresh = false) => {
    // 1. Serve from cache instantly if available
    const cached = groupDetailCache.current.get(groupId);
    if (cached && !forceRefresh) {
      setSelectedGroupCalculation(cached.calc);
      setGroupExpenses(cached.expenses);
      setGroupSettlements(cached.settlements);
      // If cache is still fresh, skip network entirely
      if (Date.now() - cached.ts < CACHE_TTL) return;
      // Otherwise revalidate in background (stale-while-revalidate)
    }

    // 2. Show loading skeleton only if no cache at all
    if (!cached) setIsGroupLoading(true);

    try {
      const [calcData, expData, settsData] = await Promise.all([
        api.getGroupDetail(groupId),
        api.getExpenses(groupId),
        api.getSettlements(groupId)
      ]);
      // Update cache
      groupDetailCache.current.set(groupId, {
        calc: calcData,
        expenses: expData,
        settlements: settsData,
        ts: Date.now()
      });
      setSelectedGroupCalculation(calcData);
      setGroupExpenses(expData);
      setGroupSettlements(settsData);
    } catch (err: any) {
      if (!cached) {
        showToast(err.message || 'Failed to load group details', 'error');
        setSelectedGroupId(null);
      }
    } finally {
      setIsGroupLoading(false);
    }
  }, [showToast, setSelectedGroupId]);

  // Refresh when user changes or initially
  const prevUser = useRef<string | null>(null);
  useEffect(() => {
    if (user) {
      // Only reload dashboard data when user actually changes, not on every selectedGroupId change
      if (prevUser.current !== user.id) {
        prevUser.current = user.id;
        loadDashboardData();
      }
      if (selectedGroupId) {
        loadGroupDetails(selectedGroupId);
      }
    } else {
      prevUser.current = null;
      setGroups([]);
      setActivities([]);
      setSelectedGroupId(null);
      setIsLoadingData(false);
    }
  }, [user, loadDashboardData, selectedGroupId, loadGroupDetails, setSelectedGroupId]);

  // Check if user needs to set up security questions (show popup once after login)
  useEffect(() => {
    if (user && user.securityQuestionsSet === false) {
      // Check if we've already asked in this session
      const dismissed = sessionStorage.getItem(`sq_dismissed_${user.id}`);
      if (!dismissed) {
        // Small delay so the main UI loads first
        const timer = setTimeout(() => {
          setIsSecurityQuestionsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Check URL query parameters on initial mount (e.g. ?group=grp_123&member=... or ?code=GOA2026)
  // Note: Plain ?group=id (without member/pass) is our internal URL-sync — already restored via initial state.
  // Portal links have extra params like member, pass, joinGroup, or action.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinGroupParam = params.get('joinGroup');
    const groupParam = params.get('group');
    const memberParam = params.get('member') || undefined;
    const passParam = params.get('pass') || undefined;
    const actionParam = params.get('action');
    const code = params.get('code');

    // Only trigger portal flow for invite/member links (with member/pass/action params)
    const isPortalLink = joinGroupParam || (groupParam && (memberParam || passParam || actionParam));
    if (isPortalLink) {
      const targetGroup = joinGroupParam || groupParam!;
      setPortalGroupId(targetGroup);
      setPortalMemberId(memberParam);
      setPortalPasscode(passParam);
      setPortalAutoExpense(actionParam === 'add-expense' || true);
    } else if (code) {
      api.joinGroup(code)
        .then(res => {
          showToast(`Joined group "${res.group.name}"!`, 'success');
          loadDashboardData();
          setSelectedGroupId(res.group.id);
        })
        .catch(err => {
          console.warn('Auto-join code error:', err);
        });
    }
  }, [loadDashboardData, showToast, setSelectedGroupId]);

  // Auto-open group if user is already logged in as member of portal group
  useEffect(() => {
    if (user && portalGroupId && groups.length > 0) {
      const match = groups.find(g => g.id === portalGroupId);
      if (match) {
        if (!portalMemberId || portalMemberId === user.id) {
          setSelectedGroupId(portalGroupId);
          loadGroupDetails(portalGroupId);
          if (portalAutoExpense) {
            setAddExpenseGroupId(portalGroupId);
            setIsAddExpenseOpen(true);
          }
          setPortalGroupId(null);
        }
      }
    }
  }, [user, portalGroupId, groups, portalMemberId, portalAutoExpense, loadGroupDetails]);

  const handlePortalSuccess = async (groupId: string, openExpense: boolean) => {
    setPortalGroupId(null);
    await loadDashboardData();
    setSelectedGroupId(groupId);
    await loadGroupDetails(groupId);
    if (openExpense) {
      setAddExpenseGroupId(groupId);
      setIsAddExpenseOpen(true);
    }
  };

  // Handle opening group — instant switch with cache, revalidate in background
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    loadGroupDetails(groupId); // cache-first, instant if cached
    window.scrollTo({ top: 0 });
  };

  // ─── Non-blocking refresh helper ──────────────────────────────────────────
  // Fire both dashboard + group refreshes in parallel without awaiting
  const refreshAll = useCallback((groupId?: string | null) => {
    loadDashboardData();
    const gid = groupId ?? selectedGroupId;
    if (gid) {
      // Invalidate cache so we fetch fresh data
      groupDetailCache.current.delete(gid);
      loadGroupDetails(gid, true);
    }
  }, [loadDashboardData, loadGroupDetails, selectedGroupId]);

  // Handle deleting group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.deleteGroup(groupId);
      groupDetailCache.current.delete(groupId);
      showToast('Group deleted', 'success');
      setSelectedGroupId(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Could not delete group', 'error');
    }
  };

  // Handle updating group
  const handleUpdateGroup = async (groupId: string, data: any) => {
    await api.updateGroup(groupId, data);
    refreshAll(groupId);
  };

  // Handle removing member
  const handleRemoveMember = async (groupId: string, userId: string) => {
    await api.removeMember(groupId, userId);
    refreshAll(groupId);
  };

  // Open modals
  const handleOpenAddExpense = (groupId?: string) => {
    setExpenseToEdit(null);
    setAddExpenseGroupId(groupId || selectedGroupId || undefined);
    setIsAddExpenseOpen(true);
  };

  const handleOpenEditExpense = (expense: ExpenseItem) => {
    const isCreator = Boolean(user?.id && expense.createdBy === user.id);
    const isHardik = Boolean((user?.name && user.name.trim().toLowerCase() === 'hardik') || (user?.email && user.email.toLowerCase().includes('hardik')));
    const isGroupAdmin = groups.find(g => g.id === expense.groupId)?.members.some(m => m.userId === user?.id && m.role === 'admin');
    if (!isCreator && !isHardik && !isGroupAdmin) {
      showToast('Only the member who added this expense (or admin) can edit it', 'error');
      return;
    }
    setExpenseToEdit(expense);
    setAddExpenseGroupId(expense.groupId);
    setIsExpenseDetailOpen(false);
    setIsAddExpenseOpen(true);
  };

  const handleOpenSettleUp = (groupId?: string, payerId?: string, receiverId?: string, amount?: number) => {
    setSettleUpProps({
      groupId: groupId || selectedGroupId || undefined,
      payerId,
      receiverId,
      amount
    });
    setIsSettleUpOpen(true);
  };

  const handleOpenInvite = (groupId: string) => {
    setInviteGroupId(groupId);
    setIsInviteOpen(true);
  };

  const handleOpenExpenseDetail = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setIsExpenseDetailOpen(true);
  };

  const handleOpenSendReminder = (toUserId: string, toName: string, amount: number, currency: any) => {
    setReminderProps({
      toUserId,
      toName,
      amount,
      currency,
      groupId: selectedGroupId || ''
    });
    setIsReminderOpen(true);
  };

  // Handlers after actions complete — non-blocking parallel refresh
  const handleExpenseAdded = () => {
    refreshAll();
  };

  const handleSettlementRecorded = () => {
    refreshAll();
  };

  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-bounce mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Loading Hisaabdo...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white transition-colors">
        <Navbar
          onOpenAddExpense={() => setIsAuthOpen(true)}
          onOpenCreateGroup={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsAuthOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onNavigateHome={() => setSelectedGroupId(null)}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <AuthView />
        </main>
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />

        {/* Group Link & Member Password Portal Modal for unauthenticated access */}
        {portalGroupId && (
          <GroupPortalModal
            groupId={portalGroupId}
            initialMemberId={portalMemberId}
            initialPasscode={portalPasscode}
            autoOpenExpense={portalAutoExpense}
            isOpen={Boolean(portalGroupId)}
            onClose={() => setPortalGroupId(null)}
            onSuccess={handlePortalSuccess}
          />
        )}
      </div>
    );
  }

  if (isLoadingData && groups.length === 0 && !selectedGroupId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-bounce mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Loading your groups...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calculating balances and debt simplification plan</p>
      </div>
    );
  }

  const currentInviteGroup = groups.find(g => g.id === inviteGroupId) || groups[0];
  const inviteGroupObj = groups.find(g => g.id === inviteGroupId) || (selectedGroupCalculation?.group.id === inviteGroupId ? selectedGroupCalculation.group : groups[0]);
  const inviteGroupMembers: any[] = inviteGroupObj ? (
    inviteGroupObj.members.map((m: any) => {
      const u = allUsers.find(userItem => userItem.id === m.userId);
      return {
        userId: m.userId,
        name: m.name || u?.name || 'Member',
        email: m.email || u?.email || '',
        avatarUrl: m.avatarUrl || u?.avatarUrl || '',
        role: m.role || 'member',
        memberPasscode: m.memberPasscode
      };
    })
  ) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white transition-colors">
      {/* Primary Sticky Navbar */}
      <Navbar
        onOpenAddExpense={() => handleOpenAddExpense()}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onNavigateHome={() => {
          setSelectedGroupId(null);
          setMobileTab('home');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12">
        {selectedGroupId && isGroupLoading && !selectedGroupCalculation ? (
          /* Lightweight skeleton while first-loading a group with no cache */
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading group…</p>
          </div>
        ) : selectedGroupId && selectedGroupCalculation ? (
          <GroupDetailView
            groupData={selectedGroupCalculation}
            expenses={groupExpenses}
            settlements={groupSettlements}
            allUsers={allUsers}
            onBack={() => setSelectedGroupId(null)}
            onOpenAddExpense={handleOpenAddExpense}
            onOpenEditExpense={handleOpenEditExpense}
            onOpenSettleUp={handleOpenSettleUp}
            onOpenInvite={handleOpenInvite}
            onOpenExpenseDetail={handleOpenExpenseDetail}
            onOpenSendReminder={handleOpenSendReminder}
            onRefresh={() => loadGroupDetails(selectedGroupId, true)}
            onDeleteGroup={handleDeleteGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveMember={handleRemoveMember}
          />
        ) : (
          <Dashboard
            groups={groups}
            activities={activities}
            activeTab={mobileTab}
            onSelectTab={(tab) => {
              setSelectedGroupId(null);
              setMobileTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectGroup={handleSelectGroup}
            onOpenAddExpense={() => handleOpenAddExpense()}
            onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
            onOpenSettleUp={handleOpenSettleUp}
            onOpenJoinGroup={() => setIsJoinGroupOpen(true)}
            onOpenBalanceDetail={(viewType) => {
              setBalanceViewType(viewType);
              setIsBalanceDetailOpen(true);
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={mobileTab}
        onSelectTab={(tab) => {
          if (tab === 'profile') {
            setIsProfileOpen(true);
            return;
          }
          setSelectedGroupId(null);
          setMobileTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAddExpense={() => handleOpenAddExpense()}
      />

      {/* ALL MODALS */}
      {/* 1. Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(null);
        }}
        groups={groups}
        defaultGroupId={addExpenseGroupId}
        expenseToEdit={expenseToEdit}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* 2. Expense Detail Modal */}
      <ExpenseDetailModal
        expense={selectedExpense}
        onClose={() => {
          setIsExpenseDetailOpen(false);
          setSelectedExpense(null);
        }}
        onExpenseDeleted={handleExpenseAdded}
        onOpenEditExpense={handleOpenEditExpense}
      />

      {/* 3. Settle Up Modal */}
      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        groups={groups}
        defaultGroupId={settleUpProps.groupId}
        defaultPayerId={settleUpProps.payerId}
        defaultReceiverId={settleUpProps.receiverId}
        defaultAmount={settleUpProps.amount}
        onSettlementRecorded={handleSettlementRecorded}
      />

      {/* 4. Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newGroupId) => {
          refreshAll(newGroupId);
          handleSelectGroup(newGroupId);
        }}
      />

      {/* 5. Invite Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        groupId={inviteGroupId}
        groupName={currentInviteGroup?.name || 'Group'}
        inviteCode={currentInviteGroup?.inviteCode || ''}
        members={inviteGroupMembers}
        onMemberAdded={() => refreshAll()}
      />

      {/* 6. Join Group with Code Modal */}
      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
        onJoined={(groupId) => {
          refreshAll(groupId);
          handleSelectGroup(groupId);
        }}
      />

      {/* 7. Payment Reminder Modal */}
      <ReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        toUserId={reminderProps.toUserId}
        toName={reminderProps.toName}
        amount={reminderProps.amount}
        currency={reminderProps.currency}
        groupId={reminderProps.groupId}
      />

      {/* 8. User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* 9. Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* 10. Security Questions Setup Modal */}
      <SecurityQuestionsSetupModal
        isOpen={isSecurityQuestionsOpen}
        onClose={() => {
          setIsSecurityQuestionsOpen(false);
          if (user) {
            sessionStorage.setItem(`sq_dismissed_${user.id}`, 'true');
          }
        }}
        onComplete={() => {
          setIsSecurityQuestionsOpen(false);
          // Refresh user profile to get updated securityQuestionsSet flag
          loadDashboardData();
        }}
      />

      {/* 10. Group Link & Member Password Portal Modal */}
      {portalGroupId && (
        <GroupPortalModal
          groupId={portalGroupId}
          initialMemberId={portalMemberId}
          initialPasscode={portalPasscode}
          autoOpenExpense={portalAutoExpense}
          isOpen={Boolean(portalGroupId)}
          onClose={() => setPortalGroupId(null)}
          onSuccess={handlePortalSuccess}
        />
      )}

      {/* 11. Balance Detail Modal (You are owed / You owe breakdown) */}
      <BalanceDetailModal
        isOpen={isBalanceDetailOpen}
        viewType={balanceViewType}
        groups={groups}
        onClose={() => setIsBalanceDetailOpen(false)}
        onSelectGroup={(groupId) => {
          setIsBalanceDetailOpen(false);
          handleSelectGroup(groupId);
        }}
        onOpenSettleUp={(groupId, payerId, receiverId, amount) => {
          setIsBalanceDetailOpen(false);
          handleOpenSettleUp(groupId, payerId, receiverId, amount);
        }}
      />

      {/* Dramatic Fullscreen Payment Reminder Popup with Guns and Sound */}
      <GunReminderOverlay
        onOpenSettle={({ groupId }) => {
          if (groupId) {
            setSelectedGroupId(groupId);
          }
          setIsSettleUpOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <HisaabdoMain />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
