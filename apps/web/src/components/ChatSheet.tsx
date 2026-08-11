"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

interface Message {
  id: string;
  journey_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string | null;
    photo_url: string | null;
  };
}

interface ChatSheetProps {
  journeyId: string;
  otherPartyName: string;
  onClose: () => void;
}

export default function ChatSheet({ journeyId, otherPartyName, onClose }: ChatSheetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [journeyId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const data = await apiClient.get(`/journeys/${journeyId}/messages`);
      setMessages(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    // Connect via Next.js proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    ws.current = new WebSocket(`${protocol}//${host}/api/v1/ws/${journeyId}?token=${token}`);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          setMessages((prev) => {
            // Deduplicate: if we already have this message (or optimistic one), update it or ignore
            // We use content matching as a simple heuristic if IDs differ initially
            const exists = prev.some(m => m.id === data.data.id || (m.content === data.data.content && m.sender_id === data.data.sender_id && m.id.startsWith("temp-")));
            if (exists) {
              return prev.map(m => (m.content === data.data.content && m.id.startsWith("temp-")) ? data.data : m);
            }
            return [...prev, data.data];
          });
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const tempId = `temp-${Date.now()}`;
    const msgText = newMessage.trim();
    
    // Optimistic Update
    const optimisticMsg: Message = {
      id: tempId,
      journey_id: journeyId,
      sender_id: user.id,
      content: msgText,
      created_at: new Date().toISOString(),
      sender: {
        name: user.name || "Me",
        photo_url: user.photo_url || null
      }
    };
    
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      await apiClient.post(`/journeys/${journeyId}/messages`, { content: msgText });
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      // Revert on failure
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      setNewMessage(msgText);
    }
  };

  return (
    <div className="w-full rounded-t-3xl bg-white flex flex-col shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300 pointer-events-auto h-[85vh]">
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            Chat with {otherPartyName}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full dark:bg-zinc-800">
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900/50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin dark:border-white"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Send a message to coordinate pickup!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id?.toLowerCase() === user?.id?.toLowerCase();
            const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in zoom-in duration-200`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 flex flex-col shadow-sm relative ${
                  isMe 
                    ? 'bg-[#25D366] text-white rounded-br-sm' 
                    : 'bg-white text-zinc-900 rounded-bl-sm dark:bg-zinc-800 dark:text-white'
                }`}>
                  {!isMe && (
                    <p className="text-[11px] font-bold opacity-60 mb-1 text-emerald-600 dark:text-emerald-400">{msg.sender?.name || "User"}</p>
                  )}
                  <p className="text-[15px] leading-snug">{msg.content}</p>
                  <span className={`text-[10px] mt-1 self-end opacity-70 flex items-center gap-1 ${
                    isMe ? 'text-green-100' : 'text-zinc-500'
                  }`}>
                    {timeString}
                    {isMe && (
                      <svg className="w-3 h-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-full border border-zinc-200 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
            placeholder="Type a message..."
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-50 dark:bg-white dark:text-black transition-transform active:scale-95"
          >
            <svg className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
