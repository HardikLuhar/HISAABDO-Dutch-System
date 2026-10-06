import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import { CheckCircle2 } from 'lucide-react';

interface ParsedReminder {
  id: string;
  senderName: string;
  amount: string | number;
  currency?: string;
  groupId?: string;
}

// Synthesize loud dramatic alert & gunshot boom using Web Audio API as fallback
function playSynthesizedLoudSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1. Sharp gunshot crack (noise burst)
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    whiteNoise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // 2. Heavy cinematic sub-bass explosion
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(200, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.9);
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.2);

    // 3. High alert horn/siren chord
    const sirenOsc = ctx.createOscillator();
    const sirenGain = ctx.createGain();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.setValueAtTime(520, now);
    sirenOsc.frequency.linearRampToValueAtTime(880, now + 0.2);
    sirenOsc.frequency.linearRampToValueAtTime(320, now + 0.5);
    sirenGain.gain.setValueAtTime(0.7, now);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOsc.start(now);
    sirenOsc.stop(now + 0.7);
  } catch (err) {
    console.warn('Web Audio synthesis failed:', err);
  }
}

export const GunReminderOverlay: React.FC<{
  onOpenSettle?: (props: { groupId?: string; receiverName?: string }) => void;
}> = () => {
  const { notifications, markAsRead } = useNotification();
  const [activeReminder, setActiveReminder] = useState<ParsedReminder | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [showCloseButton, setShowCloseButton] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loopIntervalRef = useRef<any>(null);

  // Parse notification into personName and amount
  const parseReminder = useCallback((notif: any): ParsedReminder => {
    let senderName = '';
    let amount: string | number = '';
    let currency = 'INR';
    let groupId = notif.groupId;

    // 1. Try JSON in relatedId
    if (notif.relatedId) {
      try {
        const parsed = JSON.parse(notif.relatedId);
        if (parsed.senderName) senderName = parsed.senderName;
        if (parsed.amount !== undefined) amount = parsed.amount;
        if (parsed.currency) currency = parsed.currency;
        if (parsed.groupId) groupId = parsed.groupId;
      } catch {}
    }

    // 2. Fallback: Parse regex from message
    if (!senderName || !amount) {
      const msg = notif.message || '';
      const match =
        msg.match(/^(.*?)\s+sent\s+(?:a\s+friendly\s+reminder|a\s+payment\s+reminder)?:\s*You owe\s*(?:[A-Za-z$€₹\s]+)?([0-9.,]+)/i) ||
        msg.match(/^(.*?)\s+sent.*?(?:owe|for)\s*(?:[A-Za-z$€₹\s]+)?([0-9.,]+)/i);

      if (match) {
        senderName = match[1].trim();
        amount = match[2].trim();
      } else {
        senderName = notif.title || 'Someone';
        amount = 'paise';
      }
    }

    return {
      id: notif.id,
      senderName,
      amount,
      currency,
      groupId
    };
  }, []);

  // Check for any unread PAYMENT_REMINDER
  useEffect(() => {
    const unreadReminder = notifications.find(
      n => n.type === 'PAYMENT_REMINDER' && !n.read && !dismissedIds.has(n.id)
    );

    if (unreadReminder) {
      const parsed = parseReminder(unreadReminder);
      setActiveReminder(parsed);
      setShowCloseButton(false); // Initially hide the button when a reminder opens
    } else {
      setActiveReminder(null);
      setShowCloseButton(false);
    }
  }, [notifications, dismissedIds, parseReminder]);

  // Stop all audio
  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
  }, []);

  // Directly play sound on infinite loop non-stop
  const startDirectLoopingAudio = useCallback(() => {
    stopAllAudio();

    const soundCandidates = [
      '/reminder.mp3',
      '/sounds/reminder.mp3',
      '/reminder.wav',
      '/sounds/reminder.wav',
      '/reminder.mp4',
      '/sounds/reminder.mp4'
    ];

    let audioIndex = 0;

    const playWithAudioElement = () => {
      if (audioIndex >= soundCandidates.length) {
        // Fallback: Web Audio synthesizer loop every 1.5 seconds repeatedly
        playSynthesizedLoudSound();
        loopIntervalRef.current = setInterval(() => {
          playSynthesizedLoudSound();
        }, 1500);
        return;
      }

      const src = soundCandidates[audioIndex++];
      const audio = new Audio(src);
      audio.volume = 1.0;
      audio.loop = true; // REPEATEDLY PLAY TILL POPUP CLOSES!
      audioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === 'NotAllowedError') {
            // Autoplay restricted until user touches/clicks anywhere
            const unlockPlay = () => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
              window.removeEventListener('click', unlockPlay);
              window.removeEventListener('touchstart', unlockPlay);
              window.removeEventListener('keydown', unlockPlay);
            };
            window.addEventListener('click', unlockPlay, { once: true });
            window.addEventListener('touchstart', unlockPlay, { once: true });
            window.addEventListener('keydown', unlockPlay, { once: true });
          } else {
            // Try next candidate
            playWithAudioElement();
          }
        });
      }

      audio.onerror = () => {
        playWithAudioElement();
      };
    };

    playWithAudioElement();
  }, [stopAllAudio]);

  // When reminder appears, immediately play loud sound continuously
  useEffect(() => {
    if (activeReminder) {
      startDirectLoopingAudio();
    } else {
      stopAllAudio();
    }

    return () => {
      stopAllAudio();
    };
  }, [activeReminder?.id, startDirectLoopingAudio, stopAllAudio]);

  // Screen tapped: reveal the close button and guarantee audio is playing
  const handleScreenTap = () => {
    if (!showCloseButton) {
      setShowCloseButton(true);
    }
    // Also resume audio if browser delayed it
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  // Close button clicked: then and then only close the popup and stop audio
  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Do not trigger screen tap again
    if (!activeReminder) return;

    // 1. Stop audio immediately
    stopAllAudio();

    // 2. Mark reminder as read in DB
    try {
      await markAsRead(activeReminder.id);
    } catch (err) {
      console.error('Failed to mark reminder read:', err);
    }

    // 3. Close the popup
    setDismissedIds(prev => new Set(prev).add(activeReminder.id));
    setActiveReminder(null);
    setShowCloseButton(false);
  };

  if (!activeReminder) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/98 backdrop-blur-3xl red-danger-pulse select-none overflow-hidden cursor-pointer"
      role="dialog"
      aria-modal="true"
      onClick={handleScreenTap}
    >
      {/* Cinematic dark red vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/70 via-black/95 to-black pointer-events-none" />

      {/* Flashing top & bottom warning borders */}
      <div className="absolute top-0 left-0 right-0 h-3 bg-red-600 animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-red-600 animate-pulse pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl w-full flex flex-col items-center justify-center text-center space-y-10 sm:space-y-14">
        {/* The Exact Sentence with Gun Emoji */}
        <div className="gun-shake w-full px-2 pointer-events-none">
          <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-white leading-tight sm:leading-tight drop-shadow-[0_0_40px_rgba(239,68,68,1)]">
            "Tu {activeReminder.amount} rupe de {activeReminder.senderName} ko"🔫
          </h1>
        </div>

        {/* When someone taps anywhere on the popup screen, the button appears here */}
        {showCloseButton && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white text-lg sm:text-2xl font-black tracking-wide shadow-[0_0_50px_rgba(225,29,72,0.9)] transition-all cursor-pointer hover:scale-105 active:scale-95 border-2 border-red-400 flex items-center justify-center gap-3"
            >
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              <span>ha bhai de raha hu close</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
