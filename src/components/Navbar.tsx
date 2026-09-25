import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, Plus, Users, User as UserIcon, LogOut, ChevronDown, Check, ArrowRightLeft, Sparkles, Sun, Moon } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '../utils/formatters';

interface NavbarProps {
  onOpenAddExpense: () => void;
  onOpenCreateGroup: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddExpense,
  onOpenCreateGroup,
  onOpenProfile,
  onOpenAuth,
  onNavigateHome
}) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const { isDark, toggleTheme } = useTheme();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome} id="brand-logo-btn">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Hisaabdo</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">Group bills & smart debt solver</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button (Always visible on mobile & desktop) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer flex items-center justify-center"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme mode"
            id="theme-toggle-btn"
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 transition transform hover:-rotate-12" />
            )}
          </button>

          {user ? (
            <>
              {/* Create Group Quick CTA */}
              <button
                onClick={onOpenCreateGroup}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                id="navbar-create-group-btn"
              >
                <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>New Group</span>
              </button>

              {/* Add Expense Primary CTA */}
              <button
                onClick={onOpenAddExpense}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/30 transition cursor-pointer"
                id="navbar-add-expense-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>

              {/* Notifications Bell */}
              <div className="relative" ref={notifMenuRef}>
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  id="navbar-notification-btn"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={`p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition cursor-pointer ${
                              !n.read ? 'bg-emerald-50/40 dark:bg-emerald-950/30' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Avatar Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                  id="user-profile-menu-btn"
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 pr-1 hidden lg:inline">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        <span>Currency:</span>
                        <span className="font-bold">{CURRENCY_SYMBOLS[user.preferredCurrency]} {user.preferredCurrency}</span>
                      </div>
                    </div>

                    <div className="py-1 text-xs">
                      {/* Theme Toggle within Menu */}
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        id="menu-theme-toggle-btn"
                      >
                        <div className="flex items-center gap-2.5">
                          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                          <span>Theme</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {isDark ? 'Dark Mode' : 'Light Mode'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        id="profile-settings-btn"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>Edit Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAuth();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        id="switch-member-btn"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Switch Member / Account</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenCreateGroup();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        id="create-group-menu-btn"
                      >
                        <Plus className="w-4 h-4 text-slate-400" />
                        <span>Create New Group</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs cursor-pointer"
                        id="logout-btn"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Leave / Reset</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
                id="nav-get-started-btn"
              >
                <span>Get Started</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

