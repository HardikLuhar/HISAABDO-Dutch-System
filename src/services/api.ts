import {
  User,
  GroupItem,
  GroupDetail,
  GroupCalculationData,
  ExpenseItem,
  SettlementItem,
  NotificationItem,
  ActivityItem,
  AnalyticsData,
  SplitType,
  GroupCategory,
  CurrencyCode
} from '../types';

const TOKEN_KEY = 'splitwise_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async quickStart(name: string, preferredCurrency: CurrencyCode = 'INR', password?: string, email?: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/quick-start', {
      method: 'POST',
      body: JSON.stringify({ name, preferredCurrency, password, email })
    });
    setStoredToken(res.token);
    return res;
  },

  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, password })
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: { name: string; email?: string; password?: string; phone?: string; preferredCurrency?: CurrencyCode }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async getUsers(): Promise<{ users: User[] }> {
    return request<{ users: User[] }>('/api/auth/users');
  },

  async searchUsers(query: string): Promise<{ users: User[] }> {
    return request<{ users: User[] }>(`/api/auth/users/search?q=${encodeURIComponent(query)}`);
  },

  async checkNameAvailability(name: string): Promise<{ taken: boolean }> {
    return request<{ taken: boolean }>(`/api/auth/check-name?name=${encodeURIComponent(name)}`);
  },

  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async forgotPasswordLookup(identifier: string): Promise<{ userId: string; userName: string; questionIds: number[] }> {
    return request<{ userId: string; userName: string; questionIds: number[] }>('/api/auth/forgot-password/lookup', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  async forgotPasswordReset(userId: string, answers: { questionId: number; answer: string }[], newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ userId, answers, newPassword })
    });
  },

  async saveSecurityQuestions(questions: { questionId: number; answer: string }[]): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/security-questions', {
      method: 'POST',
      body: JSON.stringify({ questions })
    });
  },

  async getSecurityQuestionsStatus(): Promise<{ isSetUp: boolean; questionIds: number[] }> {
    return request<{ isSetUp: boolean; questionIds: number[] }>('/api/auth/security-questions/status');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  // Groups
  async getGroups(): Promise<GroupItem[]> {
    const res = await request<{ groups: GroupItem[] }>('/api/groups');
    return res.groups;
  },

  async getGroupDetail(id: string): Promise<GroupCalculationData> {
    return request<GroupCalculationData>(`/api/groups/${id}`);
  },

  async createGroup(data: { name: string; description?: string; category?: GroupCategory; defaultCurrency?: CurrencyCode; memberEmails?: string[] }): Promise<{ group: GroupDetail }> {
    return request<{ group: GroupDetail }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateGroup(id: string, data: Partial<GroupDetail>): Promise<{ group: GroupDetail }> {
    return request<{ group: GroupDetail }>(`/api/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteGroup(id: string): Promise<void> {
    await request(`/api/groups/${id}`, { method: 'DELETE' });
  },

  async getPublicGroup(groupId: string): Promise<{ group: any }> {
    return request<{ group: any }>(`/api/groups/${groupId}/public`);
  },

  async memberLogin(groupId: string, userId: string, passcode: string): Promise<{ user: User; token: string; group: any }> {
    const res = await request<{ user: User; token: string; group: any }>(`/api/groups/${groupId}/member-login`, {
      method: 'POST',
      body: JSON.stringify({ userId, passcode })
    });
    setStoredToken(res.token);
    return res;
  },

  async memberChangePassword(groupId: string, userId: string, currentPasscode: string, newPasscode: string): Promise<{ user: User; token: string; group: any; passcode: string }> {
    const res = await request<{ user: User; token: string; group: any; passcode: string }>(`/api/groups/${groupId}/member-change-password`, {
      method: 'POST',
      body: JSON.stringify({ userId, currentPasscode, newPasscode })
    });
    setStoredToken(res.token);
    return res;
  },

  async updateMemberPasscode(groupId: string, userId: string, passcode: string): Promise<{ message: string; passcode: string }> {
    return request<{ message: string; passcode: string }>(`/api/groups/${groupId}/members/${userId}/passcode`, {
      method: 'PUT',
      body: JSON.stringify({ passcode })
    });
  },

  async addMember(groupId: string, identifier: string): Promise<{ user: User; passcode?: string }> {
    const res = await request<{ message: string; user: User; passcode?: string }>(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
    return { user: res.user, passcode: res.passcode };
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    await request(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  async joinGroup(inviteCode: string): Promise<{ group: GroupDetail }> {
    const res = await request<{ message: string; group: GroupDetail }>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    });
    return { group: res.group };
  },

  // Expenses
  async getExpenses(groupId: string, filters: { search?: string; category?: string; payerId?: string; participantId?: string; startDate?: string; endDate?: string } = {}): Promise<ExpenseItem[]> {
    const query = new URLSearchParams();
    if (filters.search) query.set('search', filters.search);
    if (filters.category) query.set('category', filters.category);
    if (filters.payerId) query.set('payerId', filters.payerId);
    if (filters.participantId) query.set('participantId', filters.participantId);
    if (filters.startDate) query.set('startDate', filters.startDate);
    if (filters.endDate) query.set('endDate', filters.endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{ expenses: ExpenseItem[] }>(`/api/groups/${groupId}/expenses${queryString}`);
    return res.expenses;
  },

  async checkDuplicate(groupId: string, data: { description: string; amount: number; date: string }): Promise<{ isDuplicate: boolean; message?: string }> {
    return request<{ isDuplicate: boolean; message?: string }>(`/api/groups/${groupId}/expenses/check-duplicate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createExpense(groupId: string, data: {
    description: string;
    amount: number;
    date: string;
    category: string;
    notes?: string;
    receiptUrl?: string;
    receiptData?: any;
    paidBy: Array<{ userId: string; amount: number }>;
    splitType: SplitType;
    participants: Array<{ userId: string; exactAmount?: number; percentage?: number; shares?: number }>;
  }): Promise<{ expense: ExpenseItem }> {
    return request<{ expense: ExpenseItem }>(`/api/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateExpense(groupId: string, expenseId: string, data: any): Promise<{ expense: ExpenseItem }> {
    return request<{ expense: ExpenseItem }>(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await request(`/api/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' });
  },

  // Settlements
  async getSettlements(groupId: string): Promise<SettlementItem[]> {
    const res = await request<{ settlements: SettlementItem[] }>(`/api/groups/${groupId}/settlements`);
    return res.settlements;
  },

  async createSettlement(groupId: string, data: {
    payerId: string;
    receiverId: string;
    amount: number;
    date?: string;
    notes?: string;
  }): Promise<{ settlement: SettlementItem }> {
    return request<{ settlement: SettlementItem }>(`/api/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteSettlement(groupId: string, settlementId: string): Promise<void> {
    await request(`/api/groups/${groupId}/settlements/${settlementId}`, { method: 'DELETE' });
  },

  // Analytics
  async getAnalytics(groupId: string): Promise<AnalyticsData> {
    return request<AnalyticsData>(`/api/analytics/${groupId}`);
  },

  // Notifications & Reminders
  async getNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    return request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications');
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(): Promise<void> {
    await request('/api/notifications/read-all', { method: 'POST' });
  },

  async sendReminder(data: { toUserId: string; groupId: string; amount: number; currency: CurrencyCode }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/notifications/remind', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Activity Feed
  async getActivities(groupId?: string, limit: number = 20): Promise<ActivityItem[]> {
    const query = groupId ? `?groupId=${groupId}&limit=${limit}` : `?limit=${limit}`;
    const res = await request<{ activities: ActivityItem[] }>(`/api/activities${query}`);
    return res.activities;
  },

  // Receipt OCR scan
  async scanReceipt(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<{ success: boolean; ocrResult: any }> {
    return request<{ success: boolean; ocrResult: any }>('/api/receipt/scan', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType })
    });
  }
};
