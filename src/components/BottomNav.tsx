import React from 'react';
import { Home, Users, Plus, Clock, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'groups' | 'activity' | 'profile';
  onSelectTab: (tab: 'home' | 'groups' | 'activity' | 'profile') => void;
  onOpenAddExpense: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddExpense
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-around shadow-lg transition-colors">
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'home'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-dashboard-btn"
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => onSelectTab('groups')}
        className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'groups'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-groups-btn"
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span>Groups</span>
      </button>

      {/* Central Add Expense Button */}
      <button
        onClick={onOpenAddExpense}
        className="-mt-5 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition cursor-pointer"
        aria-label="Add Expense"
        id="bottom-nav-add-expense-btn"
      >
        <Plus className="w-6 h-6" />
      </button>

      <button
        onClick={() => onSelectTab('activity')}
        className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'activity'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-activity-btn"
      >
        <Clock className="w-5 h-5 mb-0.5" />
        <span>Activity</span>
      </button>

      <button
        onClick={() => onSelectTab('profile')}
        className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition cursor-pointer ${
          currentTab === 'profile'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        id="bottom-nav-profile-btn"
      >
        <User className="w-5 h-5 mb-0.5" />
        <span>Profile</span>
      </button>
    </div>
  );
};
