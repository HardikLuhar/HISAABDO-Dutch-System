import React, { useState, useEffect } from 'react';
import { GroupItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  DollarSign
} from 'lucide-react';

export type BalanceViewType = 'owed' | 'owe';

interface BalanceBreakdownItem {
  groupId: string;
  groupName: string;
  personUserId: string;
  personName: string;
  personAvatar: string;
  amount: number;
  currency: string;
  isReceiver: boolean;
}

interface BalanceDetailModalProps {
  isOpen: boolean;
  viewType: BalanceViewType;
  groups: GroupItem[];
  onClose: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenSettleUp?: (groupId: string, payerId?: string, receiverId?: string, amount?: number) => void;
}

export const BalanceDetailModal: React.FC<BalanceDetailModalProps> = ({
  isOpen,
  viewType,
  groups,
  onClose,
  onSelectGroup,
  onOpenSettleUp,
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<BalanceBreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) {
      setItems([]);
      return;
    }

    // Filter relevant groups
    const relevantGroups = groups.filter((g) =>
      viewType === 'owed' ? g.userBalance > 0.01 : g.userBalance < -0.01
    );

    if (relevantGroups.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled(
      relevantGroups.map(async (g) => {
        try {
          const calc = await api.getGroupDetail(g.id);
          return { group: g, calc };
        } catch {
          return { group: g, calc: null };
        }
      })
    ).then((results) => {
      if (!isMounted) return;

      const breakdownList: BalanceBreakdownItem[] = [];

      for (const res of results) {
        if (res.status !== 'fulfilled') continue;
        const { group, calc } = res.value;

        if (calc) {
          if (viewType === 'owe') {
            // "You Owe": list receivers the user owes money to
            if (calc.myDebtsOwed && calc.myDebtsOwed.length > 0) {
              for (const debt of calc.myDebtsOwed) {
                breakdownList.push({
                  groupId: group.id,
                  groupName: group.name,
                  personUserId: debt.toUserId,
                  personName: debt.toName,
                  personAvatar: debt.toAvatar || '',
                  amount: debt.amount,
                  currency: group.defaultCurrency,
                  isReceiver: true,
                });
              }
            } else {
              // Fallback to group net balance if pairwise debts simplified to empty
              breakdownList.push({
                groupId: group.id,
                groupName: group.name,
                personUserId: '',
                personName: 'Group Members',
                personAvatar: '',
                amount: Math.abs(group.userBalance),
                currency: group.defaultCurrency,
                isReceiver: true,
              });
            }
          } else {
            // "You Are Owed": list payers who owe the user money
            if (calc.myDebtsDueToMe && calc.myDebtsDueToMe.length > 0) {
              for (const debt of calc.myDebtsDueToMe) {
                breakdownList.push({
                  groupId: group.id,
                  groupName: group.name,
                  personUserId: debt.fromUserId,
                  personName: debt.fromName,
                  personAvatar: debt.fromAvatar || '',
                  amount: debt.amount,
                  currency: group.defaultCurrency,
                  isReceiver: false,
                });
              }
            } else {
              // Fallback to group net balance
              breakdownList.push({
                groupId: group.id,
                groupName: group.name,
                personUserId: '',
                personName: 'Group Members',
                personAvatar: '',
                amount: Math.abs(group.userBalance),
                currency: group.defaultCurrency,
                isReceiver: false,
              });
            }
          }
        } else {
          // If detailed calculation failed, fallback to group userBalance
          breakdownList.push({
            groupId: group.id,
            groupName: group.name,
            personUserId: '',
            personName: `${group.membersCount} members`,
            personAvatar: '',
            amount: Math.abs(group.userBalance),
            currency: group.defaultCurrency,
            isReceiver: viewType === 'owe',
          });
        }
      }

      setItems(breakdownList);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, viewType, groups, user]);

  if (!isOpen || !user) return null;

  const totalAmount = items.reduce((s, b) => s + b.amount, 0);
  const userCurrency = user.preferredCurrency || 'INR';

  const isOwed = viewType === 'owed';
  const title = isOwed ? 'You Are Owed' : 'You Owe';
  const subtitle = isOwed
    ? 'People who need to pay you back'
    : 'People you need to pay back';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 ${
          isOwed
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30'
            : 'bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isOwed
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
            }`}>
              {isOwed ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">{title}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Summary */}
        <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${
          isOwed ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-rose-50/50 dark:bg-rose-950/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total {isOwed ? 'Owed to You' : 'You Owe'}
            </span>
            <span className={`text-xl font-black tracking-tight ${
              isOwed
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(totalAmount, userCurrency)}
            </span>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto min-h-[180px]">
          {isLoading ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mb-3" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Calculating exact person & group breakdowns...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                isOwed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400'
              }`}>
                {isOwed ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                {isOwed ? 'Nobody owes you right now' : 'You don\'t owe anyone'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isOwed ? 'All balances are settled! 🎉' : 'You are all squared up! 🎉'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, idx) => (
                <div
                  key={`${item.groupId}-${item.personUserId || idx}`}
                  className="p-4 sm:px-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {item.personAvatar ? (
                      <img
                        src={item.personAvatar}
                        alt={item.personName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        isOwed
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                      }`}>
                        {item.personName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.personName}
                        </span>
                        {/* Role tag */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isOwed
                            ? 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                        }`}>
                          {isOwed ? 'Owes you' : 'Receiver (You owe)'}
                        </span>
                      </div>

                      {/* Group label */}
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>In group:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {item.groupName}
                        </span>
                      </div>

                      {/* Info hint if user owes */}
                      {!isOwed && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          Only receiver ({item.personName}) can confirm & settle this payment
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className={`text-base font-extrabold tracking-tight ${
                      isOwed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatCurrency(item.amount, item.currency)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* If user is owed money (they are receiver), they can Settle Up immediately */}
                      {isOwed && onOpenSettleUp && item.personUserId && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenSettleUp(item.groupId, item.personUserId, user.id, item.amount);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                          title="Record that you received this payment"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settle</span>
                        </button>
                      )}

                      {/* View Group button */}
                      <button
                        onClick={() => {
                          onSelectGroup(item.groupId);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        title="Open group details"
                      >
                        <span>Group</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info note */}
        {items.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>
              {isOwed
                ? 'Only you (the receiver) can mark payments as settled'
                : 'Contact the receiver once you have sent the payment'}
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              {items.length} {items.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
