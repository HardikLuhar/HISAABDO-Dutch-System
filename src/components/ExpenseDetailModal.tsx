import React, { useState } from 'react';
import { ExpenseItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
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
  Trash2,
  ShieldCheck,
  AlertTriangle
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
  onExpenseDeleted,
  onOpenEditExpense
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [showReceiptImage, setShowReceiptImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!expense) return null;

  const catMeta = getCategoryMeta(expense.category);
  const isCreator = Boolean(user?.id && expense.createdBy === user.id);
  const isHardik = Boolean((user?.name && user.name.trim().toLowerCase() === 'hardik') || (user?.email && user.email.toLowerCase().includes('hardik')));
  const canManage = isCreator || isHardik;

  const handleDeleteExpense = async () => {
    if (!canManage) {
      showToast('Only the member who added this expense (or admin) can delete it', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteExpense(expense.groupId, expense.id);
      showToast(`Expense "${expense.description}" deleted successfully`, 'success');
      onExpenseDeleted?.();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-colors">
        {/* Modal Header with Category Icon */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs ${catMeta.color}`}>
              {catMeta.icon}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">{expense.description}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{catMeta.label} • {expense.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {canManage && (
              <button
                onClick={() => {
                  onOpenEditExpense(expense);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer"
                title="Edit Expense"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
          {/* Main Amount Callout */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expense Amount</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {formatCurrency(expense.amount, expense.currency)}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
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

          {/* Notes */}
          {expense.notes && (
            <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-emerald-900 dark:text-emerald-400 block mb-1">Notes:</span>
              <p>{expense.notes}</p>
            </div>
          )}

          {/* Receipt preview thumbnail */}
          {expense.receiptUrl && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Receipt Attachment</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowReceiptImage(!showReceiptImage)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 text-xs underline cursor-pointer"
                >
                  {showReceiptImage ? 'Hide Image' : 'View Full Image'}
                </button>
              </div>
              {showReceiptImage && (
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="w-full max-h-60 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              )}
            </div>
          )}

          {/* Section: Who Paid */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Paid By ({expense.paidBy.length})</span>
            </h3>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
              {expense.paidBy.map(p => (
                <div key={p.userId} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={p.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userName}`}
                      alt={p.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {p.userName} {p.userId === user?.id && '(You)'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(p.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Who Participated & Split Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Split Breakdown ({expense.splits.length} participants)</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                {expense.splitType}
              </span>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
              {expense.splits.map(s => (
                <div key={s.userId} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={s.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.userName}`}
                      alt={s.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {s.userName} {s.userId === user?.id && '(You)'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">
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

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Delete this expense entry?</h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                    This will permanently delete "{expense.description}" ({formatCurrency(expense.amount, expense.currency)}) and recalculate group balances.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteExpense}
                      disabled={isDeleting}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Entry'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span>Added by {expense.createdByName || 'Group Member'} {isCreator && '(You)'}</span>
            <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">
                {isCreator
                  ? 'You created this entry and can edit or delete it'
                  : isHardik
                  ? 'Admin access: You can edit and delete this entry'
                  : `Only ${expense.createdByName || 'creator'} can edit or delete`}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Delete Button (Creator or Admin) */}
              {canManage && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-xl transition cursor-pointer"
                  id="btn-modal-delete-expense"
                  title="Delete this entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              {canManage && (
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
                  <span>Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
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
