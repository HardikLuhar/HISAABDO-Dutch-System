import React from 'react';
import { Home, Users, Plus, Receipt, User, Clock } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'groups' | 'summary' | 'activity' | 'profile';
  onSelectTab: (tab: 'home' | 'groups' | 'summary' | 'activity' | 'profile') => void;
  onOpenAddExpense: () => void;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddExpense,
  isAdmin = false
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-between shadow-lg transition-colors">
      {/* 1. Home / Dashboard */}
      <button
        onClick={() => onSelectTab('home')}
        className={`flex-1 flex flex-col items-center py-1 px-1 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'home'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-dashboard-btn"
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="truncate">Home</span>
      </button>

      {/* 2. Groups */}
      <button
        onClick={() => onSelectTab('groups')}
        className={`flex-1 flex flex-col items-center py-1 px-1 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'groups'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-groups-btn"
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span className="truncate">Groups</span>
      </button>

      {/* 3. Central Add Expense Button (Centered symmetrically) */}
      <div className="flex-1 flex justify-center items-center">
        <button
          onClick={onOpenAddExpense}
          className="-mt-5 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition cursor-pointer"
          aria-label="Add Expense"
          id="bottom-nav-add-expense-btn"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* 4. Total Summary (Cross-group debt consolidation) */}
      <button
        onClick={() => onSelectTab('summary')}
        className={`flex-1 flex flex-col items-center py-1 px-1 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'summary'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-summary-btn"
      >
        <Receipt className="w-5 h-5 mb-0.5" />
        <span className="truncate">Summary</span>
      </button>

      {/* 5. Profile */}
      <button
        onClick={() => onSelectTab('profile')}
        className={`flex-1 flex flex-col items-center py-1 px-1 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'profile'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-profile-btn"
      >
        <User className="w-5 h-5 mb-0.5" />
        <span className="truncate">Profile</span>
      </button>
    </div>
  );
};
