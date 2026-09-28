import React, { useState, useEffect, useRef } from 'react';
import { GroupItem, User, SplitType, ExpenseItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { CATEGORIES, formatCurrency, CURRENCY_SYMBOLS } from '../utils/formatters';
import {
  X,
  Upload,
  Receipt,
  Sparkles,
  AlertTriangle,
  Check,
  Users,
  Calendar,
  FileText,
  DollarSign,
  PieChart,
  Edit2
} from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupItem[];
  defaultGroupId?: string;
  expenseToEdit?: ExpenseItem | null;
  onExpenseAdded: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
  expenseToEdit,
  onExpenseAdded
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || groups[0]?.id || '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Food');
  const [notes, setNotes] = useState('');

  // Receipt & OCR
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payers state
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState<string>(user?.id || '');
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});

  // Participants & Split state
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected group and members
  const currentGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const members = currentGroup?.members || [];
  const currency = currentGroup?.defaultCurrency || 'INR';

  useEffect(() => {
    if (!isOpen) return;

    if (expenseToEdit) {
      setSelectedGroupId(expenseToEdit.groupId);
      setDescription(expenseToEdit.description);
      setAmount(String(expenseToEdit.amount));
      setDate(expenseToEdit.date);
      setCategory(expenseToEdit.category);
      setNotes(expenseToEdit.notes || '');
      setReceiptUrl(expenseToEdit.receiptUrl || '');
      setReceiptData(expenseToEdit.receiptData || null);
      setSplitType(expenseToEdit.splitType);

      // Payers
      if (expenseToEdit.paidBy.length > 1) {
        setIsMultiplePayers(true);
        const pAmts: Record<string, string> = {};
        expenseToEdit.paidBy.forEach(p => {
          pAmts[p.userId] = String(p.amount);
        });
        setPayerAmounts(pAmts);
      } else {
        setIsMultiplePayers(false);
        setSinglePayerId(expenseToEdit.paidBy[0]?.userId || user?.id || '');
      }

      // Participants
      const parts: Record<string, boolean> = {};
      const exacts: Record<string, string> = {};
      const pcts: Record<string, string> = {};
      const shs: Record<string, string> = {};

      expenseToEdit.splits.forEach(s => {
        parts[s.userId] = true;
        if (s.amount !== undefined) exacts[s.userId] = String(s.amount);
        if (s.percentage !== undefined) pcts[s.userId] = String(s.percentage);
        if (s.shares !== undefined) shs[s.userId] = String(s.shares);
      });

      setSelectedParticipants(parts);
      setExactAmounts(exacts);
      setPercentages(pcts);
      setShares(shs);
    } else {
      if (defaultGroupId) {
        setSelectedGroupId(defaultGroupId);
      } else if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setNotes('');
      setReceiptUrl('');
      setReceiptData(null);
      setIsMultiplePayers(false);
      setSplitType('EQUAL');
      setDuplicateWarning(null);
      setIgnoreDuplicate(false);
    }
  }, [isOpen, expenseToEdit, defaultGroupId]);

  // When members change or group changes in Add mode, default all members as selected
  useEffect(() => {
    if (members.length > 0 && !expenseToEdit) {
      const initialParts: Record<string, boolean> = {};
      const initialShares: Record<string, string> = {};
      const initialPercentages: Record<string, string> = {};
      const initialExact: Record<string, string> = {};

      const count = members.length;
      const equalPct = (100 / count).toFixed(2);

      members.forEach(m => {
        initialParts[m.userId] = true;
        initialShares[m.userId] = '1';
        initialPercentages[m.userId] = equalPct;
        initialExact[m.userId] = '';
      });

      setSelectedParticipants(initialParts);
      setShares(initialShares);
      setPercentages(initialPercentages);
      setExactAmounts(initialExact);
      setSinglePayerId(user?.id || members[0].userId);
    }
  }, [selectedGroupId, members.length, expenseToEdit]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const activeParticipants = members.filter(m => selectedParticipants[m.userId]);

  // Calculate live split summaries
  let splitSum = 0;
  let splitDiff = 0;
  let percentSum = 0;
  let totalShares = 0;

  if (splitType === 'EXACT') {
    splitSum = activeParticipants.reduce((acc, m) => acc + (parseFloat(exactAmounts[m.userId]) || 0), 0);
    splitDiff = Math.round((numAmount - splitSum) * 100) / 100;
  } else if (splitType === 'PERCENTAGE') {
    percentSum = activeParticipants.reduce((acc, m) => acc + (parseFloat(percentages[m.userId]) || 0), 0);
  } else if (splitType === 'SHARES') {
    totalShares = activeParticipants.reduce((acc, m) => acc + (parseFloat(shares[m.userId]) || 0), 0);
  }

  // Payers sum validation
  let payerSum = 0;
  if (isMultiplePayers) {
    payerSum = members.reduce((acc, m) => acc + (parseFloat(payerAmounts[m.userId]) || 0), 0);
  } else {
    payerSum = numAmount;
  }
  const payerDiff = Math.round((numAmount - payerSum) * 100) / 100;

  // Check duplicate expense when amount or description changes
  const checkDuplicateExpense = async (descVal: string, amtVal: number, dateVal: string) => {
    if (!descVal.trim() || amtVal <= 0 || !selectedGroupId) return;
    try {
      const res = await api.checkDuplicate(selectedGroupId, {
        description: descVal,
        amount: amtVal,
        date: dateVal
      });
      if (res.isDuplicate) {
        setDuplicateWarning(res.message || 'A similar expense exists today.');
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore
    }
  };

  // Handle receipt file selection & optional OCR
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptUrl(base64);

      // Perform OCR scan
      setIsScanningOcr(true);
      try {
        const res = await api.scanReceipt(base64, file.type);
        if (res.success && res.ocrResult) {
          const { merchant, total, date: ocrDate, category: ocrCat } = res.ocrResult;
          if (merchant && !description) setDescription(merchant);
          if (total && (!amount || parseFloat(amount) === 0)) setAmount(total.toString());
          if (ocrDate) setDate(ocrDate);
          if (ocrCat) setCategory(ocrCat);
          setReceiptData(res.ocrResult);
          showToast('Receipt scanned! Details auto-populated.', 'success');
        }
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setIsScanningOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (expenseToEdit) {
      const isCreator = Boolean(user?.id && expenseToEdit.createdBy === user.id);
      const isHardik = Boolean((user?.name && user.name.trim().toLowerCase() === 'hardik') || (user?.email && user.email.toLowerCase().includes('hardik')));
      const isGroupAdmin = currentGroup?.members.some(m => m.userId === user?.id && m.role === 'admin');
      if (!isCreator && !isHardik && !isGroupAdmin) {
        showToast('Only the member who added this expense (or admin) can edit it', 'error');
        return;
      }
    }

    if (numAmount <= 0) {
      showToast('Please enter a valid expense amount greater than 0', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('Please provide an expense description', 'error');
      return;
    }

    if (activeParticipants.length === 0) {
      showToast('Please select at least one participant', 'error');
      return;
    }

    // Check payer validation
    if (isMultiplePayers && Math.abs(payerDiff) > 0.05) {
      showToast(`Payer amounts (${payerSum}) must equal total expense (${numAmount})`, 'error');
      return;
    }

    // Check split validations
    if (splitType === 'EXACT' && Math.abs(splitDiff) > 0.05) {
      showToast(`Exact split amounts sum (${splitSum}) must match total (${numAmount})`, 'error');
      return;
    }

    if (splitType === 'PERCENTAGE' && Math.abs(percentSum - 100) > 0.1) {
      showToast(`Percentages must sum to 100% (currently ${percentSum}%)`, 'error');
      return;
    }

    if (splitType === 'SHARES' && totalShares <= 0) {
      showToast('Total shares must be greater than 0', 'error');
      return;
    }

    // Duplicate check guard
    if (duplicateWarning && !ignoreDuplicate) {
      showToast('Please confirm the duplicate warning before proceeding', 'info');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build payers payload
      let paidByPayload: Array<{ userId: string; amount: number }> = [];
      if (isMultiplePayers) {
        paidByPayload = members
          .filter(m => (parseFloat(payerAmounts[m.userId]) || 0) > 0)
          .map(m => ({
            userId: m.userId,
            amount: parseFloat(payerAmounts[m.userId]) || 0
          }));
      } else {
        paidByPayload = [{ userId: singlePayerId, amount: numAmount }];
      }

      // Build participants payload
      const participantsPayload = activeParticipants.map(m => {
        const item: any = { userId: m.userId };
        if (splitType === 'EXACT') {
          item.exactAmount = parseFloat(exactAmounts[m.userId]) || 0;
        } else if (splitType === 'PERCENTAGE') {
          item.percentage = parseFloat(percentages[m.userId]) || 0;
        } else if (splitType === 'SHARES') {
          item.shares = parseFloat(shares[m.userId]) || 1;
        }
        return item;
      });

      if (expenseToEdit) {
        await api.updateExpense(selectedGroupId, expenseToEdit.id, {
          description: description.trim(),
          amount: numAmount,
          date,
          category,
          notes,
          receiptUrl,
          receiptData,
          paidBy: paidByPayload,
          splitType,
          participants: participantsPayload
        });
        showToast(`Updated "${description}"`, 'success');
      } else {
        await api.createExpense(selectedGroupId, {
          description: description.trim(),
          amount: numAmount,
          date,
          category,
          notes,
          receiptUrl,
          receiptData,
          paidBy: paidByPayload,
          splitType,
          participants: participantsPayload
        });
        showToast(`Added "${description}" (${currentGroup.defaultCurrency} ${numAmount})`, 'success');
      }

      onExpenseAdded();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              {expenseToEdit ? <Edit2 className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {expenseToEdit ? 'Update bill details, amounts, or custom splits' : 'Log bill and choose custom split method'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {groups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No groups found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              You need to create or join a group before you can add and split expenses.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Duplicate Expense Warning (Section 25) */}
          {duplicateWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Possible Duplicate Expense</span>
                <p className="mt-0.5">{duplicateWarning}</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={ignoreDuplicate}
                      onChange={(e) => setIgnoreDuplicate(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Yes, add this expense anyway</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Group & Basic Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group {expenseToEdit && <span className="text-[10px] text-slate-400 font-normal">(locked in edit mode)</span>}
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={Boolean(expenseToEdit)}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.defaultCurrency})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Seafood Dinner, Taxi, Villa Booking"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  checkDuplicateExpense(e.target.value, numAmount, date);
                }}
                required
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {CURRENCY_SYMBOLS[currency] || '₹'}
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    checkDuplicateExpense(description, parseFloat(e.target.value) || 0, date);
                  }}
                  required
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Date & Receipt Upload + OCR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  checkDuplicateExpense(description, numAmount, e.target.value);
                }}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt / Bill Attachment</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanningOcr}
                className="w-full p-2 text-xs border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 flex items-center justify-center gap-2 transition cursor-pointer text-slate-600 dark:text-slate-300"
              >
                {isScanningOcr ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Scanning Bill with OCR...</span>
                  </>
                ) : receiptUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Receipt Attached (Click to change)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload Bill / Scan Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 5: Paid By */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">Who Paid for this?</label>
              <button
                type="button"
                onClick={() => setIsMultiplePayers(!isMultiplePayers)}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {isMultiplePayers ? 'Single person paid' : 'Multiple people paid'}
              </button>
            </div>

            {!isMultiplePayers ? (
              <select
                value={singlePayerId}
                onChange={(e) => setSinglePayerId(e.target.value)}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
              >
                {members.map(m => (
                  <option key={m.userId} value={m.userId} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {m.name} {m.userId === user?.id && '(You)'} paid full amount
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-700">
                  <span>Member</span>
                  <span>Amount Paid ({currency})</span>
                </div>
                {members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {m.name} {m.userId === user?.id && '(You)'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={payerAmounts[m.userId] || ''}
                      onChange={(e) => setPayerAmounts({ ...payerAmounts, [m.userId]: e.target.value })}
                      className="w-28 p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-right font-medium"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-1 font-bold border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-300">Total Paid:</span>
                  <span className={Math.abs(payerDiff) < 0.05 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {formatCurrency(payerSum, currency)} / {formatCurrency(numAmount, currency)}
                    {Math.abs(payerDiff) >= 0.05 && ` (${payerDiff > 0 ? 'Short' : 'Exceeds'} ${formatCurrency(Math.abs(payerDiff), currency)})`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 6 & 7: For Whom (Participants) & Split Method */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">For Whom? (Participants)</label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    members.forEach(m => all[m.userId] = true);
                    setSelectedParticipants(all);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedParticipants({})}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Split Type Selector Pills */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3">
              {(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    splitType === type
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'EQUAL' && 'Equal (=)'}
                  {type === 'EXACT' && 'Exact (123)'}
                  {type === 'PERCENTAGE' && 'Percent (%)'}
                  {type === 'SHARES' && 'Shares (II)'}
                </button>
              ))}
            </div>

            {/* Participants Split List */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
              {members.map(m => {
                const isSelected = !!selectedParticipants[m.userId];
                let shareDisplay = '';

                if (splitType === 'EQUAL') {
                  const equalShare = activeParticipants.length > 0
                    ? (numAmount / activeParticipants.length).toFixed(2)
                    : '0';
                  shareDisplay = isSelected ? `${formatCurrency(parseFloat(equalShare), currency)}` : 'Not participating';
                } else if (splitType === 'EXACT') {
                  shareDisplay = exactAmounts[m.userId] ? formatCurrency(parseFloat(exactAmounts[m.userId]) || 0, currency) : '₹0';
                } else if (splitType === 'PERCENTAGE') {
                  const pct = parseFloat(percentages[m.userId]) || 0;
                  const amt = ((numAmount * pct) / 100).toFixed(2);
                  shareDisplay = `${pct}% (${formatCurrency(parseFloat(amt), currency)})`;
                } else if (splitType === 'SHARES') {
                  const sh = parseFloat(shares[m.userId]) || 0;
                  const amt = totalShares > 0 ? ((numAmount * sh) / totalShares).toFixed(2) : '0';
                  shareDisplay = `${sh} ${sh === 1 ? 'share' : 'shares'} (${formatCurrency(parseFloat(amt), currency)})`;
                }

                return (
                  <div key={m.userId} className="flex items-center justify-between gap-3 text-xs py-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setSelectedParticipants({
                            ...selectedParticipants,
                            [m.userId]: e.target.checked
                          });
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {m.name} {m.userId === user?.id && '(You)'}
                      </span>
                    </label>

                    {/* Split input based on type */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && splitType === 'EXACT' && (
                        <input
                          type="number"
                          step="any"
                          placeholder="Amount"
                          value={exactAmounts[m.userId] || ''}
                          onChange={(e) => setExactAmounts({ ...exactAmounts, [m.userId]: e.target.value })}
                          className="w-24 p-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded text-right font-medium"
                        />
                      )}

                      {isSelected && splitType === 'PERCENTAGE' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            placeholder="%"
                            value={percentages[m.userId] || ''}
                            onChange={(e) => setPercentages({ ...percentages, [m.userId]: e.target.value })}
                            className="w-16 p-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded text-right font-medium"
                          />
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      )}

                      {isSelected && splitType === 'SHARES' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Shares"
                            value={shares[m.userId] || '1'}
                            onChange={(e) => setShares({ ...shares, [m.userId]: e.target.value })}
                            className="w-16 p-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded text-right font-medium"
                          />
                          <span className="text-slate-400">sh</span>
                        </div>
                      )}

                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 min-w-[70px] text-right">
                        {shareDisplay}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Live validation / split summary */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between font-bold">
                {splitType === 'EXACT' && (
                  <>
                    <span className="text-slate-700 dark:text-slate-300">Sum of exact amounts:</span>
                    <span className={Math.abs(splitDiff) < 0.05 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatCurrency(splitSum, currency)} / {formatCurrency(numAmount, currency)}
                      {Math.abs(splitDiff) >= 0.05 && ` (${splitDiff > 0 ? 'Remaining' : 'Exceeds'} ${formatCurrency(Math.abs(splitDiff), currency)})`}
                    </span>
                  </>
                )}

                {splitType === 'PERCENTAGE' && (
                  <>
                    <span className="text-slate-700 dark:text-slate-300">Sum of percentages:</span>
                    <span className={Math.abs(percentSum - 100) < 0.1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {percentSum}% / 100% {Math.abs(percentSum - 100) >= 0.1 && `(${100 - percentSum}% left)`}
                    </span>
                  </>
                )}

                {splitType === 'SHARES' && (
                  <>
                    <span className="text-slate-700 dark:text-slate-300">Total shares allocated:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{totalShares} shares</span>
                  </>
                )}

                {splitType === 'EQUAL' && (
                  <>
                    <span className="text-slate-700 dark:text-slate-300">Per person:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {activeParticipants.length > 0 ? formatCurrency(numAmount / activeParticipants.length, currency) : '₹0'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
            <textarea
              placeholder="Add details, receipt reference, or extra context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
              id="submit-expense-btn"
            >
              {isSubmitting
                ? (expenseToEdit ? 'Updating Expense...' : 'Adding Expense...')
                : (expenseToEdit ? 'Update Expense' : 'Save Expense')}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
