import React, { useState } from 'react';
import { ExpenseItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCategoryMeta, CURRENCY_SYMBOLS } from '../utils/formatters';
import {
  X,
  Calendar,
  User,
  Users,
  Receipt,
  ArrowRight,
  FileText,
  Clock,
  AlertCircle,
  Edit2,
  ShieldCheck
} from 'lucide-react';

interface ExpenseDetailModalProps {
  expense: ExpenseItem | null;
  onClose: () => void;
  onExpenseDeleted?: () => void;
  onOpenEditExpense: (expense: ExpenseItem) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  onClose,
  onOpenEditExpense
}) => {
  const { user } = useAuth();
  const [showReceiptImage, setShowReceiptImage] = useState(false);

  if (!expense) return null;

  const catMeta = getCategoryMeta(expense.category);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header with Category Icon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs ${catMeta.color}`}>
              {catMeta.icon}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">{expense.description}</h2>
              <p className="text-[11px] text-slate-500">{catMeta.label} • {expense.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onOpenEditExpense(expense);
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
              title="Edit Expense"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Amount Callout */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expense Amount</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(expense.amount, expense.currency)}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(expense.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Notes or Receipt info */}
          {expense.notes && (
            <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100 text-xs text-slate-700">
              <span className="font-bold text-emerald-900 block mb-1">Notes:</span>
              <p>{expense.notes}</p>
            </div>
          )}

          {/* Receipt preview thumbnail */}
          {expense.receiptUrl && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Receipt Attachment</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowReceiptImage(!showReceiptImage)}
                  className="text-emerald-600 hover:text-emerald-700 text-xs underline"
                >
                  {showReceiptImage ? 'Hide Image' : 'View Full Image'}
                </button>
              </div>
              {showReceiptImage && (
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="w-full max-h-60 object-contain rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
          )}

          {/* Section: Who Paid */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paid By ({expense.paidBy.length})</span>
            </h3>
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 divide-y divide-slate-100">
              {expense.paidBy.map(p => (
                <div key={p.userId} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={p.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userName}`}
                      alt={p.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-800">
                      {p.userName} {p.userId === user?.id && '(You)'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(p.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Who Participated & Split Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Split Breakdown ({expense.splits.length} participants)</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                {expense.splitType}
              </span>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 divide-y divide-slate-100">
              {expense.splits.map(s => (
                <div key={s.userId} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={s.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.userName}`}
                      alt={s.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-800">
                      {s.userName} {s.userId === user?.id && '(You)'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">
                      {formatCurrency(s.amount, expense.currency)}
                    </span>
                    {expense.splitType === 'PERCENTAGE' && s.percentage && (
                      <span className="text-[10px] text-slate-400">{s.percentage}%</span>
                    )}
                    {expense.splitType === 'SHARES' && s.shares && (
                      <span className="text-[10px] text-slate-400">{s.shares} shares</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
            <span>Added by {expense.createdByName || 'Group Member'}</span>
            <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Expenses cannot be deleted (edit only)</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  onOpenEditExpense(expense);
                  onClose();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
                id="btn-modal-edit-expense"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Expense</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
