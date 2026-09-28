import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  X,
  HelpCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  Sparkles
} from 'lucide-react';

// 10 predefined security questions
export const SECURITY_QUESTIONS: { id: number; text: string }[] = [
  { id: 1, text: "What is your mother's maiden name?" },
  { id: 2, text: "What was the name of your first pet?" },
  { id: 3, text: "In which city were you born?" },
  { id: 4, text: "What was your childhood nickname?" },
  { id: 5, text: "What is the name of your favorite childhood friend?" },
  { id: 6, text: "What was the make of your first car or bike?" },
  { id: 7, text: "What is the name of the school you first attended?" },
  { id: 8, text: "What is your favorite movie of all time?" },
  { id: 9, text: "What was the street name you grew up on?" },
  { id: 10, text: "What is the name of your favorite teacher?" },
];

interface SecurityQuestionsSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const SecurityQuestionsSetupModal: React.FC<SecurityQuestionsSetupModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  // 3 slots for the user to fill
  const [selectedQuestions, setSelectedQuestions] = useState<[number | null, number | null, number | null]>([null, null, null]);
  const [answers, setAnswers] = useState<[string, string, string]>(['', '', '']);

  if (!isOpen || !user) return null;

  const getAvailableQuestions = (slotIndex: number) => {
    // Filter out questions already selected in other slots
    const otherSelected = selectedQuestions.filter((_, i) => i !== slotIndex);
    return SECURITY_QUESTIONS.filter(q => !otherSelected.includes(q.id));
  };

  const handleSelectQuestion = (slotIndex: number, questionId: number) => {
    const updated = [...selectedQuestions] as [number | null, number | null, number | null];
    updated[slotIndex] = questionId;
    setSelectedQuestions(updated);
  };

  const handleAnswerChange = (slotIndex: number, value: string) => {
    const updated = [...answers] as [string, string, string];
    updated[slotIndex] = value;
    setAnswers(updated);
  };

  const isFormValid = selectedQuestions.every(q => q !== null) &&
    answers.every(a => a.trim().length > 0) &&
    new Set(selectedQuestions).size === 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      showToast('Please select 3 different questions and answer them all', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const questions = selectedQuestions.map((qId, i) => ({
        questionId: qId!,
        answer: answers[i].trim()
      }));

      await api.saveSecurityQuestions(questions);
      showToast('Security questions saved! You can now recover your password if forgotten.', 'success');
      onComplete();
    } catch (err: any) {
      showToast(err.message || 'Failed to save security questions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[95vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Secure Your Account
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Set up security questions for password recovery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-4 sm:px-6 py-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Hey {user.name}!</strong> Choose <strong>3 questions</strong> from the 10 options below and answer them.
              These will help you reset your password if you ever forget it. Answers are <strong>case-insensitive</strong>.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          {[0, 1, 2].map((slotIndex) => {
            const availableQuestions = getAvailableQuestions(slotIndex);
            const selectedQId = selectedQuestions[slotIndex];
            const selectedQuestion = SECURITY_QUESTIONS.find(q => q.id === selectedQId);

            return (
              <div key={slotIndex} className={`rounded-xl border-2 transition-all ${
                selectedQId && answers[slotIndex].trim()
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
              } p-3 sm:p-4`}>
                {/* Question Number Badge */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    selectedQId && answers[slotIndex].trim()
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {selectedQId && answers[slotIndex].trim() ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      slotIndex + 1
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Security Question {slotIndex + 1}
                  </span>
                </div>

                {/* Question Dropdown */}
                <div className="relative mb-2.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedQId ?? ''}
                    onChange={(e) => handleSelectQuestion(slotIndex, parseInt(e.target.value))}
                    className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500">
                      — Select a question —
                    </option>
                    {availableQuestions.map((q) => (
                      <option key={q.id} value={q.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {q.text}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Answer Input (only shown after selecting question) */}
                {selectedQId && (
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Type your answer..."
                      value={answers[slotIndex]}
                      onChange={(e) => handleAnswerChange(slotIndex, e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(selectedQuestions.filter(q => q !== null).length / 3) * 100}%`
                }}
              />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
              {selectedQuestions.filter(q => q !== null).length}/3
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSaving}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl shadow-md shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Save Security Questions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
