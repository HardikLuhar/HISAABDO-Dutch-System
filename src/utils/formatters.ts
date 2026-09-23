import { CurrencyCode } from '../types';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const formattedNumber = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });

  if (amount < -0.001) {
    return `-${symbol}${formattedNumber}`;
  }
  return `${symbol}${formattedNumber}`;
}

export function formatSignedCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const formattedNumber = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });

  if (amount > 0.001) {
    return `+${symbol}${formattedNumber}`;
  } else if (amount < -0.001) {
    return `-${symbol}${formattedNumber}`;
  }
  return `${symbol}0`;
}

export const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: '🍔', color: 'bg-amber-100 text-amber-700' },
  { id: 'Transport', label: 'Transport & Cab', icon: '🚕', color: 'bg-blue-100 text-blue-700' },
  { id: 'Hotel', label: 'Hotel & Stay', icon: '🏨', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'Shopping', label: 'Shopping & Groceries', icon: '🛒', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Entertainment', label: 'Entertainment & Sports', icon: '🎬', color: 'bg-purple-100 text-purple-700' },
  { id: 'Rent', label: 'Rent & Housing', icon: '🏠', color: 'bg-rose-100 text-rose-700' },
  { id: 'Utilities', label: 'Utilities & WiFi', icon: '💡', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'Travel', label: 'Flights & Travel', icon: '✈️', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'Education', label: 'Education & Books', icon: '🎓', color: 'bg-violet-100 text-violet-700' },
  { id: 'Medical', label: 'Medical & Healthcare', icon: '💊', color: 'bg-red-100 text-red-700' },
  { id: 'Other', label: 'General / Other', icon: '📦', color: 'bg-slate-100 text-slate-700' }
];

export function getCategoryMeta(categoryId: string) {
  return CATEGORIES.find(c => c.id.toLowerCase() === categoryId.toLowerCase()) || {
    id: categoryId,
    label: categoryId,
    icon: '🧾',
    color: 'bg-slate-100 text-slate-700'
  };
}

export const GROUP_CATEGORIES = [
  { id: 'Trip', label: 'Trip & Vacation', icon: '🏖️' },
  { id: 'Roommates', label: 'Roommates & House', icon: '🏡' },
  { id: 'Friends', label: 'Friends & Hanging Out', icon: '🍻' },
  { id: 'Family', label: 'Family & Home', icon: '👨‍👩‍👧' },
  { id: 'Office', label: 'Office & Coworkers', icon: '💼' },
  { id: 'Event', label: 'Event & Celebration', icon: '🎉' },
  { id: 'Other', label: 'Other Project', icon: '📁' }
];
