import React, { useState, useEffect, useCallback } from 'react';
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
import { AuthView } from './components/AuthView';
import { GroupPortalModal } from './components/GroupPortalModal';
import { BottomNav } from './components/BottomNav';
import { Loader2 } from 'lucide-react';

function HisaabdoMain() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useNotification();

  // Primary data state
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Group Detail View state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupCalculation, setSelectedGroupCalculation] = useState<GroupCalculationData | null>(null);
  const [groupExpenses, setGroupExpenses] = useState<ExpenseItem[]>([]);
  const [groupSettlements, setGroupSettlements] = useState<SettlementItem[]>([]);

  // Mobile navigation tab
  const [mobileTab, setMobileTab] = useState<'home' | 'groups' | 'activity' | 'profile'>('home');

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

  // Group Link & Member Password Portal state
  const [portalGroupId, setPortalGroupId] = useState<string | null>(null);
  const [portalMemberId, setPortalMemberId] = useState<string | undefined>();
  const [portalPasscode, setPortalPasscode] = useState<string | undefined>();
  const [portalAutoExpense, setPortalAutoExpense] = useState(true);

  // Load all initial data
  const loadDashboardData = useCallback(async () => {
    try {
      const [groupsData, actsData, usersData] = await Promise.all([
        api.getGroups(),
        api.getActivities(undefined, 20),
        api.getUsers()
      ]);
      setGroups(groupsData);
      setActivities(actsData);
      setAllUsers(usersData.users);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Load single group details
  const loadGroupDetails = useCallback(async (groupId: string) => {
    try {
      const [calcData, expData, settsData] = await Promise.all([
        api.getGroupDetail(groupId),
        api.getExpenses(groupId),
        api.getSettlements(groupId)
      ]);
      setSelectedGroupCalculation(calcData);
      setGroupExpenses(expData);
      setGroupSettlements(settsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load group details', 'error');
      setSelectedGroupId(null);
    }
  }, [showToast]);

  // Refresh when user changes or initially
  useEffect(() => {
    if (user) {
      loadDashboardData();
      if (selectedGroupId) {
        loadGroupDetails(selectedGroupId);
      }
    } else {
      setGroups([]);
      setActivities([]);
      setSelectedGroupId(null);
      setIsLoadingData(false);
    }
  }, [user, loadDashboardData, selectedGroupId, loadGroupDetails]);

  // Check URL query parameters on initial mount (e.g. ?group=grp_123 or ?code=GOA2026)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupParam = params.get('group') || params.get('joinGroup');
    const memberParam = params.get('member') || undefined;
    const passParam = params.get('pass') || undefined;
    const actionParam = params.get('action');
    const code = params.get('code');

    if (groupParam) {
      setPortalGroupId(groupParam);
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
  }, [loadDashboardData, showToast]);

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

  // Handle opening group
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    loadGroupDetails(groupId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle deleting group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.deleteGroup(groupId);
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
    loadDashboardData();
    loadGroupDetails(groupId);
  };

  // Handle removing member
  const handleRemoveMember = async (groupId: string, userId: string) => {
    await api.removeMember(groupId, userId);
    loadDashboardData();
    loadGroupDetails(groupId);
  };

  // Open modals
  const handleOpenAddExpense = (groupId?: string) => {
    setExpenseToEdit(null);
    setAddExpenseGroupId(groupId || selectedGroupId || undefined);
    setIsAddExpenseOpen(true);
  };

  const handleOpenEditExpense = (expense: ExpenseItem) => {
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

  // Handlers after actions complete
  const handleExpenseAdded = () => {
    loadDashboardData();
    if (selectedGroupId) {
      loadGroupDetails(selectedGroupId);
    }
  };

  const handleSettlementRecorded = () => {
    loadDashboardData();
    if (selectedGroupId) {
      loadGroupDetails(selectedGroupId);
    }
  };

  if (authLoading) {
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

  if (isLoadingData && groups.length === 0) {
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
        {selectedGroupId && selectedGroupCalculation ? (
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
            onRefresh={() => loadGroupDetails(selectedGroupId)}
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
          loadDashboardData();
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
        onMemberAdded={() => {
          loadDashboardData();
          if (selectedGroupId) loadGroupDetails(selectedGroupId);
        }}
      />

      {/* 6. Join Group with Code Modal */}
      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
        onJoined={(groupId) => {
          loadDashboardData();
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
