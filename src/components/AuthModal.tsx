import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { SECURITY_QUESTIONS } from './SecurityQuestionsSetupModal';
import {
  X,
  User as UserIcon,
  Lock,
  Coins,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  KeyRound,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose
}) => {
  const { login, quickStart, user: currentUser } = useAuth();
  const { showToast } = useNotification();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('register');

  // Login inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register inputs
  const [registerName, setRegisterName] = useState('');
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

  // Real-time name availability check
  const [nameCheckStatus, setNameCheckStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');
  const nameCheckTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (nameCheckTimeout.current) clearTimeout(nameCheckTimeout.current);
    const cleanName = registerName.trim();
    if (!cleanName || cleanName.length < 2) {
      setNameCheckStatus('idle');
      return;
    }
    setNameCheckStatus('checking');
    nameCheckTimeout.current = setTimeout(async () => {
      try {
        const res = await api.checkNameAvailability(cleanName);
        setNameCheckStatus(res.taken ? 'taken' : 'available');
      } catch {
        setNameCheckStatus('idle');
      }
    }, 400);
    return () => { if (nameCheckTimeout.current) clearTimeout(nameCheckTimeout.current); };
  }, [registerName]);

  if (!isOpen) return null;

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
      showToast(`Verified! Switched profile to ${cleanId}.`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Incorrect password or account not found', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = registerName.trim();
    const cleanPass = registerPassword.trim();

    if (!cleanName) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!cleanPass) {
      showToast('Please set a password or security PIN to protect your account', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await quickStart(cleanName, registerCurrency, cleanPass);
      showToast(`Account created! Welcome, ${cleanName}!`, 'success');
      onClose();
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              {mode === 'forgot'
                ? 'Reset Password'
                : currentUser ? 'Switch Account' : 'Verified Access'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {mode === 'forgot'
                ? 'Answer your security questions to reset'
                : 'Identity verification required to access any profile'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch (hidden in forgot mode) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-slate-100/80 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Register Account</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              <span>Log In</span>
            </button>
          </div>
        )}

        {/* ─── FORGOT PASSWORD FLOW ──────────────────── */}
        {mode === 'forgot' && (
          <div className="overflow-y-auto flex-1">
            {/* Step 1: Lookup */}
            {forgotStep === 'lookup' && (
              <form onSubmit={handleForgotLookup} className="p-4 sm:p-6 space-y-4">
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name or Email
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Hardik, sneha@..."
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      autoFocus
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !forgotIdentifier.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
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
              <form onSubmit={handleForgotReset} className="p-4 sm:p-6 space-y-4">
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showForgotPassword ? 'text' : 'password'}
                      placeholder="Choose a new password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(!showForgotPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || forgotAnswers.some(a => !a.trim()) || !forgotNewPassword.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Go to Login</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── LOGIN FORM ──────────────────── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Name or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Hardik, Alex, sneha@..."
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password or Group Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => { resetForgotState(); setMode('forgot'); }}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold hover:underline transition cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !loginIdentifier.trim() || !loginPassword.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Log In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── REGISTER FORM ──────────────────── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Hardik"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>
              {nameCheckStatus === 'taken' && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                  ⚠️ This name is already taken. Try "{registerName.trim()}1" or similar.
                </p>
              )}
              {nameCheckStatus === 'available' && registerName.trim().length >= 2 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  ✓ Name available!
                </p>
              )}
              {nameCheckStatus === 'checking' && (
                <p className="text-[11px] text-slate-400 mt-1">Checking...</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password / Security PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="Choose your password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Currency
              </label>
              <div className="relative">
                <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={registerCurrency}
                  onChange={(e) => setRegisterCurrency(e.target.value as CurrencyCode)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-800 dark:text-white"
                >
                  <option value="INR">INR (₹) - Rupee</option>
                  <option value="USD">USD ($) - Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - Pound</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !registerName.trim() || !registerPassword.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
