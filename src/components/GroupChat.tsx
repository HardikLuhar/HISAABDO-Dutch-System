import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessageItem, GroupMemberInfo } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Send, MessageCircle, RefreshCw, Smile } from 'lucide-react';

interface GroupChatProps {
  groupId: string;
  groupName: string;
  members: GroupMemberInfo[];
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId, groupName, members }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const fetchMessages = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      const msgs = await api.getChatMessages(groupId, 200);
      setMessages(msgs);
    } catch (err: any) {
      console.error('Failed to fetch chat messages:', err);
      if (showLoading) setError(err.message || 'Failed to load messages');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [groupId]);

  // Initial load
  useEffect(() => {
    fetchMessages(true).then(() => {
      setTimeout(() => scrollToBottom(false), 100);
    });
  }, [groupId, fetchMessages, scrollToBottom]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(false).then(() => {
        // Only auto-scroll if user is already near bottom
        const container = chatContainerRef.current;
        if (container) {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
          if (isNearBottom) {
            scrollToBottom(true);
          }
        }
      });
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [groupId, fetchMessages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const sentMsg = await api.sendChatMessage(groupId, trimmed);
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      setTimeout(() => scrollToBottom(true), 50);
      inputRef.current?.focus();
    } catch (err: any) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const getMemberAvatar = (userId: string, fallbackAvatar: string) => {
    const member = members.find(m => m.userId === userId);
    return member?.avatarUrl || fallbackAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  };

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Group consecutive messages from same user
  const groupedMessages: Array<{ dateLabel: string; messages: ChatMessageItem[] }> = [];
  let currentDate = '';

  for (const msg of messages) {
    const label = getDateLabel(msg.createdAt);
    if (label !== currentDate) {
      currentDate = label;
      groupedMessages.push({ dateLabel: label, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col" style={{ height: 'min(600px, 70vh)' }}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{groupName} Chat</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{members.length} members • {messages.length} messages</p>
          </div>
        </div>
        <button
          onClick={() => fetchMessages(false)}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
          title="Refresh messages"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1 scroll-smooth" style={{ overscrollBehavior: 'contain' }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3">
            <MessageCircle className="w-8 h-8 opacity-40" />
            <span className="text-xs">{error}</span>
            <button onClick={() => fetchMessages(true)} className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No messages yet</p>
              <p className="text-xs mt-1 max-w-xs">Be the first to say something in the group chat!</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                {/* Date Separator */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60"></div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                    {group.dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60"></div>
                </div>

                {/* Messages in this date group */}
                {group.messages.map((msg, mi) => {
                  const isMe = msg.userId === user?.id;
                  const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
                  const isContinuation = prevMsg && prevMsg.userId === msg.userId &&
                    (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000);

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isContinuation ? 'mt-0.5' : 'mt-2.5'}`}
                    >
                      <div className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar — only show if not continuation */}
                        {!isContinuation ? (
                          <img
                            src={getMemberAvatar(msg.userId, msg.userAvatar)}
                            alt={msg.userName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 flex-shrink-0"></div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {/* Sender name — only if not me and not continuation */}
                          {!isMe && !isContinuation && (
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 ml-1">
                              {msg.userName}
                            </span>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`px-3 py-1.5 rounded-2xl text-[13px] leading-relaxed break-words ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-md'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md'
                            }`}
                          >
                            {msg.message}
                          </div>

                          {/* Timestamp — only show on last of continuation or hover */}
                          {!isContinuation && (
                            <span className={`text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                              {formatTime(msg.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
          className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          disabled={isSending}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-emerald-600/20 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
