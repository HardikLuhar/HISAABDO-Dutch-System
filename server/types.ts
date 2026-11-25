export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export type GroupCategory = 'Trip' | 'Roommates' | 'Friends' | 'Family' | 'Office' | 'Event' | 'Other';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  name: string;
  passwordHash: string;
  avatarUrl: string;
  phone?: string;
  preferredCurrency: CurrencyCode;
  securityQuestionsSet?: boolean;
  qrCodeUrl?: string;
  upiId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSecurityQuestion {
  id: string;
  userId: string;
  questionId: number;
  answerHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  memberPasscode?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  defaultCurrency: CurrencyCode;
  createdBy: string;
  createdAt: string;
  inviteCode: string;
  members: GroupMember[];
}

export interface ExpensePayer {
  userId: string;
  amount: number;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  category: string;
  date: string;
  notes?: string;
  receiptUrl?: string;
  receiptData?: {
    merchant?: string;
    date?: string;
    total?: number;
    items?: Array<{ name: string; price: number }>;
  };
  paidBy: ExpensePayer[];
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'EXPENSE_ADDED' | 'EXPENSE_EDITED' | 'SETTLEMENT_RECORDED' | 'GROUP_INVITE' | 'PAYMENT_REMINDER' | 'SETTLEMENT_CLAIM';
  title: string;
  message: string;
  groupId?: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  groupId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: 'CREATED_EXPENSE' | 'UPDATED_EXPENSE' | 'DELETED_EXPENSE' | 'RECORDED_SETTLEMENT' | 'JOINED_GROUP' | 'SENT_REMINDER';
  description: string;
  amount?: number;
  currency?: CurrencyCode;
  createdAt: string;
}

export interface PairwiseDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface DirectDebt {
  id: string;
  groupId: string;
  debtorId: string;
  creditorId: string;
  outstandingPaise: number;
  amount: number; // in rupees (outstandingPaise / 100)
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDebtAllocation {
  id: string;
  expenseId: string;
  groupId: string;
  debtorId: string;
  creditorId: string;
  amountPaise: number;
  amount: number; // in rupees
  createdAt: string;
}

export interface DebtTransaction {
  fromUserId: string;
  fromName: string;
  fromAvatar: string;
  toUserId: string;
  toName: string;
  toAvatar: string;
  amount: number;
}

export interface MemberBalance {
  userId: string;
  name: string;
  avatarUrl: string;
  paid: number;
  share: number;
  net: number; // positive = receives, negative = owes
}

export interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface SettlementClaim {
  id: string;
  payerId: string;
  payerName: string;
  payerAvatar: string;
  receiverId: string;
  receiverName: string;
  totalAmount: number;
  paymentMethod: 'UPI' | 'QR' | 'CASH';
  groupDebts: Array<{
    groupId: string;
    groupName: string;
    amount: number;
    currency: CurrencyCode;
  }>;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin Panel Types ────────────────────────────────────────────────────────

export interface UserLoginRecord {
  id: string;
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AdminNotice {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'urgent' | 'info';
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  isActive: boolean;
  acknowledgedCount?: number;
  totalUsersCount?: number;
}

export interface AdminNoticeAck {
  id: string;
  noticeId: string;
  userId: string;
  acknowledgedAt: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalGroups: number;
  totalExpenses: number;
  totalSettlements: number;
  activeNoticesCount: number;
  performance: {
    uptimeSeconds: number;
    uptimeFormatted: string;
    memoryUsageMb: number;
    databaseLatencyMs: number;
    status: 'healthy' | 'degraded';
    nodeVersion: string;
    platform: string;
    timestamp: string;
  };
}

export interface AdminUserListItem extends User {
  groupCount: number;
  expenseCount: number;
  settlementCount: number;
  totalLogins: number;
  lastLoginAt?: string;
}

