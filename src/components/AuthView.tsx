import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  ArrowRightLeft,
  User as UserIcon,
  Mail,
  Lock,
  Coins,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Zap,
  Users2,
  Receipt
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, quickStart } = useAuth();
  const { showToast } = useNotification();

  const savedId = typeof window !== 'undefined' ? localStorage.getItem('hisaabdo_last_identifier') || '' : '';

  // Mode: 'login' | 'register' - Default to login if previously identified, or register
  const [mode, setMode] = useState<'login' | 'register'>(savedId ? 'login' : 'register');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(savedId);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerCurrency, setRegisterCurrency] = useState<CurrencyCode>('INR');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Handle verified login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginIdentifier.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanId) {
      showToast('Please enter your name or email', 'error');
      return;
    }
    if (!cleanPass) {
      showToast('Please enter your password or group passcode', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await login(cleanId, cleanPass);
      showToast(`Identity verified! Welcome back, ${cleanId}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Incorrect password or account not found', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new account creation with security password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = registerName.trim();
    const cleanEmail = registerEmail.trim();
    const cleanPass = registerPassword.trim();

    if (!cleanName) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!cleanPass) {
      showToast('Please set a password or security PIN to protect your account', 'error');
      return;
    }
    if (cleanPass.length < 2) {
      showToast('Password must be at least 2 characters long', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await quickStart(cleanName, registerCurrency, cleanPass, cleanEmail || undefined);
      showToast(`Account created and secured! Welcome, ${cleanName}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not create account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-8 px-4 sm:px-6">
      {/* Brand Header */}
      <div className="text-center max-w-lg mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 mb-4">
          <ArrowRightLeft className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Hisaab<span className="text-emerald-600 dark:text-emerald-400">do</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2">
          Split bills, track group expenses, and calculate fair settlements with password verification.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Tab Switcher: Register vs Log In */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-login"
          >
            <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-register"
          >
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Register Account</span>
          </button>
        </div>

        {/* Verification & Security Notice */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{mode === 'login' ? 'Verified Account Login' : 'Register New Account'}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {mode === 'login'
              ? 'Enter your registered name or email and password to access your groups and expenses.'
              : 'Enter your name, pick your currency, and set a password to create your account.'}
          </p>
        </div>

        {/* MODE 1: LOG IN WITH VERIFICATION */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Your Name or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Hardik or hardik@example.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white transition"
                  id="input-login-identifier"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password or Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono tracking-wider text-slate-900 dark:text-white transition"
                  id="input-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Use your account password or the passcode from your group invitation.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !loginIdentifier.trim() || !loginPassword.trim()}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="btn-verified-login"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Log In</span>
                </>
              )}
            </button>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Don't have an account yet? </span>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer hover:underline"
              >
                Create one here
              </button>
            </div>
          </form>
        ) : (
          /* MODE 2: REGISTER NEW PROTECTED ACCOUNT */
          <form onSubmit={handleRegister} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Your Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Hardik, Sneha, Alex..."
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white transition"
                  id="input-register-name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address <span className="text-slate-400 font-normal">(optional - keeps groups synced)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="e.g. hardik@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white transition"
                  id="input-register-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Set Password / Security PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="e.g. 1234 or a secret password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono tracking-wider text-slate-900 dark:text-white transition"
                  id="input-register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Required so you can log back in and protect your expenses.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Currency
              </label>
              <div className="relative">
                <Coins className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={registerCurrency}
                  onChange={(e) => setRegisterCurrency(e.target.value as CurrencyCode)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 dark:text-slate-200 transition"
                  id="select-register-currency"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !registerName.trim() || !registerPassword.trim()}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="btn-register-submit"
            >
              {isLoading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account & Start</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer hover:underline"
              >
                Log in with password
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-10">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Instant Calculations</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Automated debt simplification minimizes total payments needed across groups.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Flexible Splitting</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Split equally, by exact amounts, by percentage, or custom member shares.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Group Portals & Invites</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Share link invites and personal passcodes so members can log in directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
