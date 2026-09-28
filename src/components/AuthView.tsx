import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { SECURITY_QUESTIONS } from './SecurityQuestionsSetupModal';
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
  Receipt,
  KeyRound,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, quickStart } = useAuth();
  const { showToast } = useNotification();

  const savedId = typeof window !== 'undefined' ? localStorage.getItem('hisaabdo_last_identifier') || '' : '';

  // Mode: 'login' | 'register' | 'forgot' - Default to login if previously identified, or register
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(savedId ? 'login' : 'register');

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

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState<'lookup' | 'verify' | 'success'>('lookup');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotUserId, setForgotUserId] = useState('');
  const [forgotUserName, setForgotUserName] = useState('');
  const [forgotQuestionIds, setForgotQuestionIds] = useState<number[]>([]);
  const [forgotAnswers, setForgotAnswers] = useState<string[]>(['', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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

  // Forgot Password — Step 1: Lookup
  const handleForgotLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = forgotIdentifier.trim();
    if (!cleanId) {
      showToast('Please enter your name or email', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPasswordLookup(cleanId);
      setForgotUserId(res.userId);
      setForgotUserName(res.userName);
      setForgotQuestionIds(res.questionIds);
      setForgotAnswers(res.questionIds.map(() => ''));
      setForgotStep('verify');
    } catch (err: any) {
      showToast(err.message || 'Could not find account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password — Step 2: Verify & Reset
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotAnswers.some(a => !a.trim())) {
      showToast('Please answer all security questions', 'error');
      return;
    }
    if (!forgotNewPassword.trim()) {
      showToast('Please enter a new password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const answers = forgotQuestionIds.map((qId, i) => ({
        questionId: qId,
        answer: forgotAnswers[i].trim()
      }));
      await api.forgotPasswordReset(forgotUserId, answers, forgotNewPassword.trim());
      setForgotStep('success');
      showToast('Password reset successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotState = () => {
    setForgotStep('lookup');
    setForgotIdentifier('');
    setForgotUserId('');
    setForgotUserName('');
    setForgotQuestionIds([]);
    setForgotAnswers(['', '', '']);
    setForgotNewPassword('');
    setShowForgotPassword(false);
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
        {/* Tab Switcher: Register vs Log In (hidden in forgot mode) */}
        {mode !== 'forgot' && (
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
        )}

        {/* Verification & Security Notice */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            {mode === 'forgot' ? (
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            )}
            <span>
              {mode === 'login' ? 'Verified Account Login' : mode === 'forgot' ? 'Reset Your Password' : 'Register New Account'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {mode === 'login'
              ? 'Enter your registered name or email and password to access your groups and expenses.'
              : mode === 'forgot'
              ? 'Answer your security questions to verify your identity and set a new password.'
              : 'Enter your name, pick your currency, and set a password to create your account.'}
          </p>
        </div>

        {/* ─── FORGOT PASSWORD FLOW ──────────────────── */}
        {mode === 'forgot' ? (
          <div>
            {/* Step 1: Lookup */}
            {forgotStep === 'lookup' && (
              <form onSubmit={handleForgotLookup} className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => { resetForgotState(); setMode('login'); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Back to Login
                  </span>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
                  <div className="flex items-start gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      Enter your <strong>name or email</strong> to look up your account. You'll need to answer your 3 security questions to reset the password.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Name or Email
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Hardik, sneha@..."
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      autoFocus
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !forgotIdentifier.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span>Looking up account...</span>
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4" />
                      <span>Find My Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Verify answers */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleForgotReset} className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep('lookup')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Account: <strong className="text-slate-700 dark:text-slate-200">{forgotUserName}</strong>
                  </span>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl">
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    Answer all <strong>3 security questions</strong> correctly to reset your password. Answers are case-insensitive.
                  </p>
                </div>

                {/* Security questions */}
                <div className="space-y-3">
                  {forgotQuestionIds.map((qId, i) => {
                    const question = SECURITY_QUESTIONS.find(q => q.id === qId);
                    return (
                      <div key={qId} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {question?.text || `Question #${qId}`}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Your answer..."
                          value={forgotAnswers[i]}
                          onChange={(e) => {
                            const updated = [...forgotAnswers];
                            updated[i] = e.target.value;
                            setForgotAnswers(updated);
                          }}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          autoComplete="off"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showForgotPassword ? 'text' : 'password'}
                      placeholder="Choose a new password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono tracking-wider text-slate-900 dark:text-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(!showForgotPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || forgotAnswers.some(a => !a.trim()) || !forgotNewPassword.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span>Verifying & Resetting...</span>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {forgotStep === 'success' && (
              <div className="p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Password Reset!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your password has been successfully changed. You can now log in with your new password.
                </p>
                <button
                  onClick={() => { resetForgotState(); setMode('login'); }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Go to Login</span>
                </button>
              </div>
            )}
          </div>
        ) : mode === 'login' ? (
          /* MODE 1: LOG IN WITH VERIFICATION */
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
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Use your account password or group passcode.
                </p>
                <button
                  type="button"
                  onClick={() => { resetForgotState(); setMode('forgot'); }}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold hover:underline transition cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
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
