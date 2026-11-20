import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  AdminNotice,
  AdminDashboardStats,
  AdminUserListItem,
  AdminUserDetailResponse,
  UserLoginRecord,
  CurrencyCode
} from '../types';
import { api } from '../services/api';
import {
  Shield,
  Users,
  Activity,
  Bell,
  Search,
  RefreshCw,
  X,
  Key,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Calendar,
  Clock,
  Server,
  Zap,
  Cpu,
  Database,
  Globe,
  Copy,
  Check,
  Phone,
  Mail,
  QrCode,
  DollarSign,
  TrendingUp,
  UserCheck,
  Layers,
  ArrowUpRight,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'activity' | 'notices' | 'email'>('analytics');

  // Data states
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [logins, setLogins] = useState<UserLoginRecord[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sub-modal states
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetailResponse | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserListItem | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resetAllUser, setResetAllUser] = useState<AdminUserListItem | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUserListItem | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Notice form states
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticePriority, setNoticePriority] = useState<'normal' | 'urgent' | 'info'>('normal');
  const [isSendingNotice, setIsSendingNotice] = useState(false);

  // Email broadcast states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailRecipientMode, setEmailRecipientMode] = useState<'all' | 'selected'>('all');
  const [selectedEmailUserIds, setSelectedEmailUserIds] = useState<string[]>([]);
  const [emailActionUrl, setEmailActionUrl] = useState('https://hisabdo.vercel.app');
  const [emailActionText, setEmailActionText] = useState('Open Hisaabdo');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Load initial data
  const loadAllData = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [statsData, usersData, loginsData, noticesData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminLogins(undefined, 200).catch(() => ({ logins: [] })),
        api.getAdminNotices().catch(() => ({ notices: [] }))
      ]);

      if (statsData) setStats(statsData);
      if (usersData?.users) setUsers(usersData.users);
      if (loginsData?.logins) setLogins(loginsData.logins);
      if (noticesData?.notices) setNotices(noticesData.notices);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  // Flash action message
  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  // Copy ID helper
  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Actions
  const handleOpenUserDetail = async (user: AdminUserListItem) => {
    setIsActionLoading(true);
    try {
      const detail = await api.getAdminUserDetail(user.id);
      setSelectedUserDetail(detail);
    } catch (err: any) {
      showMessage(err.message || 'Failed to fetch user details', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsActionLoading(true);
    try {
      const res = await api.updateAdminUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        upiId: editingUser.upiId,
        preferredCurrency: editingUser.preferredCurrency
      });
      showMessage(res.message || 'User updated successfully');
      setEditingUser(null);
      loadAllData();
    } catch (err: any) {
      showMessage(err.message || 'Failed to update user', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser || !newPasswordValue.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await api.resetAdminUserPassword(resetPasswordUser.id, newPasswordValue.trim());
      showMessage(res.message || 'Password reset successfully');
      setResetPasswordUser(null);
      setNewPasswordValue('');
    } catch (err: any) {
      showMessage(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmResetAll = async () => {
    if (!resetAllUser) return;
    setIsActionLoading(true);
    try {
      const res = await api.resetAdminUserAllDetails(resetAllUser.id);
      showMessage(res.message || 'User details reset successfully');
      setResetAllUser(null);
      loadAllData();
    } catch (err: any) {
      showMessage(err.message || 'Failed to reset details', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setIsActionLoading(true);
    try {
      const res = await api.deleteAdminUser(deleteUserTarget.id);
      showMessage(res.message || 'User deleted successfully');
      setDeleteUserTarget(null);
      loadAllData();
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete user', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) return;
    setIsSendingNotice(true);
    try {
      const res = await api.createAdminNotice({
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        priority: noticePriority
      });
      showMessage(res.message || 'Notice broadcasted to all users!');
      setNoticeTitle('');
      setNoticeMessage('');
      setNoticePriority('normal');
      loadAllData();
    } catch (err: any) {
      showMessage(err.message || 'Failed to send notice', 'error');
    } finally {
      setIsSendingNotice(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.deleteAdminNotice(id);
      showMessage('Notice deleted');
      loadAllData();
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete notice', 'error');
    }
  };

  // ─── EMAIL BROADCAST HELPERS ────────────────────────────────────────────────
  const validEmailUsers = useMemo(() => {
    return users.filter(u => u.email && u.email.includes('@') && !u.email.endsWith('@hisaabdo.local'));
  }, [users]);

  const toggleSelectEmailUser = (userId: string) => {
    setSelectedEmailUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllValidEmailUsers = () => {
    setSelectedEmailUserIds(validEmailUsers.map(u => u.id));
  };

  const clearSelectedEmailUsers = () => {
    setSelectedEmailUserIds([]);
  };

  const filteredUsersForEmail = useMemo(() => {
    if (!emailSearchQuery.trim()) return users;
    const q = emailSearchQuery.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, emailSearchQuery]);

  const handleSendAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim()) {
      showMessage('Please enter an email subject', 'error');
      return;
    }
    if (!emailMessage.trim()) {
      showMessage('Please enter the email message content', 'error');
      return;
    }

    if (emailRecipientMode === 'selected' && selectedEmailUserIds.length === 0) {
      showMessage('Please select at least one recipient user', 'error');
      return;
    }

    const estimatedCount = emailRecipientMode === 'all'
      ? validEmailUsers.length
      : selectedEmailUserIds.filter(id => {
          const u = users.find(user => user.id === id);
          return u && !u.email.endsWith('@hisaabdo.local');
        }).length;

    if (estimatedCount === 0) {
      showMessage('No valid real email recipients found (all selected are dummy @hisaabdo.local accounts)', 'error');
      return;
    }

    const confirmMsg = emailRecipientMode === 'all'
      ? `Send this Hisaabdo email to ALL registered users (~${estimatedCount} recipients)?`
      : `Send this Hisaabdo email to ${estimatedCount} selected user(s)?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await api.sendAdminEmail({
        recipientMode: emailRecipientMode,
        selectedUserIds: emailRecipientMode === 'selected' ? selectedEmailUserIds : undefined,
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
        actionUrl: emailActionUrl.trim() || undefined,
        actionText: emailActionText.trim() || undefined
      });

      if (res.success) {
        showMessage(res.message || 'Emails dispatched successfully!');
        setEmailSubject('');
        setEmailMessage('');
        setSelectedEmailUserIds([]);
        setShowEmailPreview(false);
      } else {
        showMessage(res.message || 'Failed to dispatch emails', 'error');
      }
    } catch (err: any) {
      console.error('Failed to send admin email:', err);
      showMessage(err.response?.data?.error || err.message || 'Failed to send email', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Hisaabdo Admin Panel</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Master Control
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as Administrator ({currentUser?.name || 'Hardik'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh all data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Action Banner (Flash message) */}
        {actionMessage && (
          <div className={`px-6 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}>
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard & Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'activity'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>User Activity & Visits ({logins.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'notices'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Admin Notices ({notices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'email'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Make Email</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* TAB 1: DASHBOARD & PERFORMANCE */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Performance & Health Monitor */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-500" />
                  Website & Infrastructure Performance
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Card */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">System Status</span>
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      Online & Healthy
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Platform: {stats?.performance.platform || 'Linux (Vercel)'}
                    </p>
                  </div>

                  {/* Latency Card */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">DB Response Latency</span>
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {stats ? `${stats.performance.databaseLatencyMs} ms` : '...'}
                    </div>
                    <p className="text-[11px] text-emerald-500 font-semibold mt-1">
                      {stats && stats.performance.databaseLatencyMs < 100 ? '⚡ Ultra-Fast (<100ms)' : 'Operational'}
                    </p>
                  </div>

                  {/* Server Uptime Card */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Server Uptime</span>
                      <Clock className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {stats?.performance.uptimeFormatted || 'Active'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Node: {stats?.performance.nodeVersion || 'v24'}
                    </p>
                  </div>

                  {/* Memory Usage Card */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Server Memory</span>
                      <Cpu className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {stats ? `${stats.performance.memoryUsageMb} MB` : '...'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Heap active usage
                    </p>
                  </div>
                </div>
              </div>

              {/* User & Growth Analytics */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  User & Activity Metrics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Users */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Registered Users</span>
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                      {stats?.totalUsers ?? users.length}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Active accounts in database
                    </p>
                  </div>

                  {/* New Today */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">New Registrations Today</span>
                      <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      +{stats?.newUsersToday ?? 0}
                    </div>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1">
                      Registered in last 24 hours
                    </p>
                  </div>

                  {/* New This Week */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">New This Week</span>
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                      +{stats?.newUsersThisWeek ?? 0}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Joined past 7 days
                    </p>
                  </div>

                  {/* Total Groups */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Groups</span>
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                      {stats?.totalGroups ?? 0}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Active expense circles
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold">Quick Administrative Actions</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Perform common tasks with one click</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('notices')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Broadcast Notice to Users
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Manage Users
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name, email, ID, or phone..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold self-center sm:self-auto">
                  Showing {filteredUsers.length} of {users.length} registered users
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">User ID</th>
                        <th className="py-3 px-4">Registered Date</th>
                        <th className="py-3 px-4">Last Active</th>
                        <th className="py-3 px-4">Groups</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                            No users found matching &quot;{searchQuery}&quot;
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            {/* User Avatar & Name */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                                  alt={user.name}
                                  className="w-9 h-9 rounded-xl object-cover bg-slate-100 dark:bg-slate-800"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                    {user.name.toLowerCase() === 'hardik' && (
                                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">{user.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* User ID */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                                  {user.id}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(user.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                  title="Copy User ID"
                                >
                                  {copiedId === user.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            {/* Created At */}
                            <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                              {user.createdAt ? (
                                <div>
                                  <div className="font-medium">
                                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {new Date(user.createdAt).toLocaleTimeString(undefined, {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>

                            {/* Last Active Time */}
                            <td className="py-3 px-4 text-xs">
                              {user.lastLoginAt ? (
                                <div>
                                  {Date.now() - new Date(user.lastLoginAt).getTime() < 15 * 60 * 1000 ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      Active now
                                    </span>
                                  ) : (
                                    <>
                                      <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                        {new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {new Date(user.lastLoginAt).toLocaleTimeString(undefined, {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Never seen</span>
                              )}
                            </td>

                            {/* Groups Count */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                                {user.groupCount} {user.groupCount === 1 ? 'group' : 'groups'}
                              </span>
                            </td>

                            {/* Actions Column */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenUserDetail(user)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                                  title="View full details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(user)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-500 transition"
                                  title="Edit profile"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setResetPasswordUser(user)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-500 transition"
                                  title="Reset password"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setResetAllUser(user)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-purple-500 transition"
                                  title="Reset all details"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteUserTarget(user)}
                                  disabled={user.name.toLowerCase() === 'hardik'}
                                  className={`p-1.5 rounded-lg transition ${
                                    user.name.toLowerCase() === 'hardik'
                                      ? 'opacity-20 cursor-not-allowed'
                                      : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-500'
                                  }`}
                                  title={user.name.toLowerCase() === 'hardik' ? 'Cannot delete admin' : 'Delete user account'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER ACTIVITY & VISITS */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">User Activity & Visit History</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live audit trail of user sessions, site visits, and authentication events
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  Total logged entries: {logins.length}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Device / User Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {logins.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                            No login events recorded yet. New logins will automatically appear here.
                          </td>
                        </tr>
                      ) : (
                        logins.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {entry.userName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {entry.userEmail || entry.userId}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-700 dark:text-slate-300">
                                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {new Date(entry.createdAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                                {entry.ipAddress || 'Unknown'}
                              </code>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={entry.userAgent}>
                              {entry.userAgent || 'Unknown'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADMIN NOTICES */}
          {activeTab === 'notices' && (
            <div className="space-y-6">
              {/* Notice Composer */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Compose & Broadcast Notice</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This notice will be shown as a full-screen popup to all users upon their next login until acknowledged.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendNotice} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Notice Title
                      </label>
                      <input
                        type="text"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="e.g. Scheduled Maintenance, New Version Announcement..."
                        required
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Priority Level
                      </label>
                      <select
                        value={noticePriority}
                        onChange={(e) => setNoticePriority(e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="normal">Official Announcement</option>
                        <option value="urgent">Urgent Alert</option>
                        <option value="info">General Info</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Message Content (Displayed in large, readable font to all users)
                    </label>
                    <textarea
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      rows={4}
                      placeholder="Write your announcement clearly here..."
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSendingNotice}
                      className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition"
                    >
                      {isSendingNotice ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Broadcasting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Broadcast to All Users</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Past Notices List */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Previously Broadcasted Notices ({notices.length})
                </h4>

                <div className="space-y-3">
                  {notices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                      No notices sent yet. Use the composer above to broadcast your first message.
                    </div>
                  ) : (
                    notices.map((n) => (
                      <div
                        key={n.id}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              n.priority === 'urgent'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : n.priority === 'info'
                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                              {n.priority}
                            </span>
                            <h5 className="font-bold text-base text-slate-900 dark:text-white">{n.title}</h5>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                            <span>Sent on {new Date(n.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {n.acknowledgedCount ?? 0} / {n.totalUsersCount ?? users.length} users acknowledged
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition cursor-pointer"
                            title="Delete notice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MAKE EMAIL / DISPATCH EMAIL */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-900/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      Make & Send Email
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        Admin Emailer
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Send clean, dark/emerald themed emails directly from Hardik's email (<code className="text-emerald-600 dark:text-emerald-400 font-mono">farziemailhaiyemera@gmail.com</code>).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="text-emerald-500 font-bold">{validEmailUsers.length}</span> Users With Real Email
                  </div>
                </div>
              </div>

              {/* Main Form & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form Controls (7 cols on lg) */}
                <form onSubmit={handleSendAdminEmail} className="lg:col-span-7 space-y-5">
                  {/* Recipient Selection */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Recipient Audience
                      </label>
                      <span className="text-xs font-medium text-slate-400">
                        {emailRecipientMode === 'all' 
                          ? `Broadcasting to all (${validEmailUsers.length} users)` 
                          : `${selectedEmailUserIds.length} recipient(s) selected`}
                      </span>
                    </div>

                    {/* Mode Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEmailRecipientMode('all')}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                          emailRecipientMode === 'all'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>Everyone</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 font-mono">
                              {validEmailUsers.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Send to all registered users</p>
                        </div>
                        {emailRecipientMode === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmailRecipientMode('selected')}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                          emailRecipientMode === 'selected'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>Selected Person</span>
                            {selectedEmailUserIds.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 font-mono">
                                {selectedEmailUserIds.length}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Pick specific user(s)</p>
                        </div>
                        {emailRecipientMode === 'selected' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </button>
                    </div>

                    {/* Selected Users Picker List */}
                    {emailRecipientMode === 'selected' && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={emailSearchQuery}
                              onChange={(e) => setEmailSearchQuery(e.target.value)}
                              placeholder="Search users by name or email..."
                              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={selectAllValidEmailUsers}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer transition text-[11px]"
                            >
                              Select All ({validEmailUsers.length})
                            </button>
                            <button
                              type="button"
                              onClick={clearSelectedEmailUsers}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-bold cursor-pointer transition text-[11px]"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {/* List */}
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {filteredUsersForEmail.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">No users match your search.</p>
                          ) : (
                            filteredUsersForEmail.map(u => {
                              const isSelected = selectedEmailUserIds.includes(u.id);
                              const isLocal = u.email.endsWith('@hisaabdo.local');
                              return (
                                <div
                                  key={u.id}
                                  onClick={() => !isLocal && toggleSelectEmailUser(u.id)}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                                    isLocal
                                      ? 'opacity-40 bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-emerald-500/10 border-emerald-500/40'
                                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="shrink-0 text-slate-400">
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </div>
                                    <img
                                      src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                                      alt={u.name}
                                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {u.name}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-mono truncate">
                                        {u.email}
                                      </div>
                                    </div>
                                  </div>

                                  {isLocal ? (
                                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold shrink-0">
                                      No real email
                                    </span>
                                  ) : isSelected ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md font-bold shrink-0">
                                      Selected
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subject & Content Input */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Email Subject *
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="e.g. Welcome to Hisaabdo! / Important Notice"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Email Message Body *
                      </label>
                      <textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Write your email announcement or update message here...&#10;&#10;Hi everyone,&#10;We are pleased to announce..."
                        rows={6}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed resize-y font-normal"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Formatted in clean paragraphs with personalized recipient greeting and official Hisaabdo signature.
                      </p>
                    </div>

                    {/* Optional Action Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Button Text (Optional)
                        </label>
                        <input
                          type="text"
                          value={emailActionText}
                          onChange={(e) => setEmailActionText(e.target.value)}
                          placeholder="e.g. Open Hisaabdo"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Button URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={emailActionUrl}
                          onChange={(e) => setEmailActionUrl(e.target.value)}
                          placeholder="https://hisabdo.vercel.app"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions & Submit */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Eye className="w-4 h-4 text-emerald-500" />
                      <span>{showEmailPreview ? 'Hide Live Preview' : 'Show Live Preview'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingEmail || !emailSubject.trim() || !emailMessage.trim() || (emailRecipientMode === 'selected' && selectedEmailUserIds.length === 0)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Emails...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            {emailRecipientMode === 'all'
                              ? `Send Email to Everyone (${validEmailUsers.length})`
                              : `Send Email to Selected (${selectedEmailUserIds.length})`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Right Column: Live Email Preview (5 cols on lg) */}
                <div className={`lg:col-span-5 ${showEmailPreview ? 'block' : 'hidden lg:block'}`}>
                  <div className="sticky top-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        Live Theme Preview
                      </span>
                      <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full lowercase">
                        emerald theme
                      </span>
                    </div>

                    {/* Email Card Mockup */}
                    <div className="rounded-3xl border border-slate-800 bg-[#06120e] p-5 shadow-2xl text-slate-100 overflow-hidden text-xs">
                      {/* Top Header Mockup */}
                      <div className="text-center pb-4 border-b border-emerald-950/80">
                        <div className="inline-block px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs tracking-wider mb-2 shadow-md">
                          HISABDO
                        </div>
                        <h4 className="font-extrabold text-sm text-white tracking-wide">
                          {emailSubject.trim() || 'Your Subject Here'}
                        </h4>
                        <p className="text-[10px] text-emerald-400 mt-0.5">Official Announcement</p>
                      </div>

                      {/* Recipient Greeting Preview */}
                      <div className="py-4 space-y-3">
                        <p className="text-slate-300 font-semibold text-xs">
                          Hello, <span className="text-emerald-400 font-bold">{emailRecipientMode === 'all' ? '[User Name]' : (users.find(u => u.id === selectedEmailUserIds[0])?.name || '[User Name]')}</span>
                        </p>

                        <div className="p-3.5 rounded-2xl bg-[#0b1a15] border border-emerald-900/40 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                          {emailMessage.trim() || 'This is how your email message will appear inside the clean emerald card... Paragraphs and formatting are preserved.'}
                        </div>

                        {emailActionText && emailActionUrl && (
                          <div className="text-center pt-2">
                            <span className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-md">
                              {emailActionText}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer Preview */}
                      <div className="pt-4 border-t border-emerald-950/80 text-center space-y-1">
                        <p className="text-[10px] text-slate-500">
                          Sent by {currentUser?.name || 'Hardik'} via Hisaabdo
                        </p>
                        <p className="text-[9px] text-slate-600">
                          Smart Expense Splitting & Debt Tracking
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── SUB-MODAL 1: VIEW USER DETAILS ─────────────────────────────────── */}
        {selectedUserDetail && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-lg">User Profile & Activity Details</h3>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* User Header */}
                <div className="flex items-center gap-4">
                  <img
                    src={selectedUserDetail.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUserDetail.user.name}`}
                    alt={selectedUserDetail.user.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800"
                  />
                  <div>
                    <h4 className="text-xl font-black">{selectedUserDetail.user.name}</h4>
                    <p className="text-xs text-slate-400">{selectedUserDetail.user.email}</p>
                    <code className="text-[11px] text-slate-500 font-mono">{selectedUserDetail.user.id}</code>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phone</span>
                    <span className="font-semibold">{selectedUserDetail.user.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">UPI ID</span>
                    <span className="font-semibold">{selectedUserDetail.user.upiId || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Account Created</span>
                    <span className="font-semibold">{new Date(selectedUserDetail.user.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Last Active / Visited</span>
                    <span className="font-semibold text-emerald-500">
                      {selectedUserDetail.user.lastLoginAt ? new Date(selectedUserDetail.user.lastLoginAt).toLocaleString() : 'Never seen'}
                    </span>
                  </div>
                </div>

                {/* Groups */}
                <div>
                  <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Joined Groups ({selectedUserDetail.groups.length})
                  </h5>
                  {selectedUserDetail.groups.length === 0 ? (
                    <p className="text-xs text-slate-400">Not part of any groups</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedUserDetail.groups.map(g => (
                        <div key={g.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="font-bold">{g.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 capitalize">
                            {g.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Visits & Logins */}
                <div>
                  <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Recent Visits & Activity ({selectedUserDetail.recentLogins.length})
                  </h5>
                  {selectedUserDetail.recentLogins.length === 0 ? (
                    <p className="text-xs text-slate-400">No login history recorded</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedUserDetail.recentLogins.map(l => (
                        <div key={l.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] flex items-center justify-between">
                          <span>{new Date(l.createdAt).toLocaleString()}</span>
                          <code className="text-slate-500 font-mono">{l.ipAddress}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 2: EDIT USER PROFILE ─────────────────────────────────── */}
        {editingUser && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-lg">Edit User Profile</h3>
                <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfileEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="Optional phone number"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={editingUser.upiId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, upiId: e.target.value })}
                    placeholder="e.g. name@okhdfcbank"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    {isActionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 3: RESET PASSWORD ───────────────────────────────────── */}
        {resetPasswordUser && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Reset Password</h3>
                  <p className="text-xs text-slate-400">For user: {resetPasswordUser.name}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Enter a new password for this user. They will immediately be able to log in with this new password.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                  <input
                    type="text"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setResetPasswordUser(null);
                      setNewPasswordValue('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmResetPassword}
                    disabled={!newPasswordValue.trim() || isActionLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isActionLoading ? 'Resetting...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 4: RESET ALL USER DETAILS ────────────────────────────── */}
        {resetAllUser && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Reset All User Details</h3>
                  <p className="text-xs text-slate-400">Target: {resetAllUser.name}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 space-y-1.5 mb-5">
                <p className="font-bold">This operation will reset:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Clear existing password hash (requires password recreation)</li>
                  <li>Clear phone number and UPI ID</li>
                  <li>Clear security questions and answers</li>
                  <li>Reset profile avatar to default Dicebear avatar</li>
                  <li>Reset currency to default (INR)</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setResetAllUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmResetAll}
                  disabled={isActionLoading}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isActionLoading ? 'Resetting...' : 'Confirm Reset All Details'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 5: DELETE USER ACCOUNT ───────────────────────────────── */}
        {deleteUserTarget && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-red-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Delete User Account</h3>
                  <p className="text-xs text-slate-400">Account: {deleteUserTarget.name}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                Are you sure you want to permanently delete this user account? This will remove their profile, memberships, notifications, push subscriptions, and login history.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteUserTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteUser}
                  disabled={isActionLoading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isActionLoading ? 'Deleting...' : 'Permanently Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
