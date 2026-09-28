export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export type GroupCategory = 'Trip' | 'Roommates' | 'Friends' | 'Family' | 'Office' | 'Event' | 'Other';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl: string;
  phone?: string;
  preferredCurrency: CurrencyCode;
  securityQuestionsSet?: boolean;
  createdAt: string;
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

export interface MemberBalance {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  paid: number;
  share: number;
  net: number; // positive = receives, negative = owes
}
