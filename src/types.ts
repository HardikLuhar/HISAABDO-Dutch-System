export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export type GroupCategory = 'Trip' | 'Roommates' | 'Friends' | 'Family' | 'Office' | 'Event' | 'Other';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  phone?: string;
  preferredCurrency: CurrencyCode;
  securityQuestionsSet?: boolean;
  createdAt: string;
}

export interface GroupMemberInfo {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'member';
  memberPasscode?: string;
}

export interface GroupItem {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  defaultCurrency: CurrencyCode;
  inviteCode: string;
  createdAt: string;
  membersCount: number;
  members: GroupMemberInfo[];
  userBalance: number;
  expensesCount: number;
  lastActivity: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  defaultCurrency: CurrencyCode;
  createdBy: string;
  createdAt: string;
  inviteCode: string;
  members: Array<{ userId: string; role: 'admin' | 'member'; joinedAt: string; memberPasscode?: string }>;
}

export interface ExpensePayerDetail {
  userId: string;
  amount: number;
  userName: string;
  userAvatar: string;
}

export interface ExpenseSplitDetail {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  userName: string;
  userAvatar: string;
}

export interface ExpenseItem {
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
  paidBy: ExpensePayerDetail[];
  splitType: SplitType;
  splits: ExpenseSplitDetail[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementItem {
  id: string;
  groupId: string;
  payerId: string;
  payerName: string;
  payerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface MemberBalance {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  paid: number;
  share: number;
  net: number;
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

export interface GroupCalculationData {
  group: GroupDetail;
  totalSpending: number;
  balances: MemberBalance[];
  myNet: number;
  myDebtsOwed: DebtTransaction[];
  myDebtsDueToMe: DebtTransaction[];
  debtSimplification: {
    unsimplified: DebtTransaction[];
    simplified: DebtTransaction[];
    unsimplifiedCount: number;
    simplifiedCount: number;
    transactionsSaved: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'EXPENSE_ADDED' | 'EXPENSE_EDITED' | 'SETTLEMENT_RECORDED' | 'GROUP_INVITE' | 'PAYMENT_REMINDER';
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

export interface AnalyticsData {
  totalSpending: number;
  expenseCount: number;
  averageExpense: number;
  currency: CurrencyCode;
  categoryData: Array<{ category: string; amount: number; percentage: number }>;
  memberData: Array<{ userId: string; name: string; avatarUrl: string; paid: number; percentage: number }>;
  monthlyData: Array<{ monthKey: string; monthLabel: string; amount: number }>;
  mostExpensiveCategory: { category: string; amount: number; percentage: number } | null;
  highestSpender: { userId: string; name: string; paid: number; percentage: number } | null;
  insights: string[];
}

export interface ChatMessageItem {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  createdAt: string;
}
