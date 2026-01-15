"use client";

import { useState, useRef, useEffect } from "react";

// Web Speech API type declarations
interface SpeechRecognitionResult {
  [index: number]: { transcript: string };
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  agentId: string;
  title: string;
  messages: Message[];
  threadId: string | null;
  createdAt: number;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: "chat" | "search" | "edit" | "lightbulb" | "heart";
  color: string;
  bgColor: string;
}

const agents: Agent[] = [
  {
    id: "comms-advisor",
    name: "Comms Advisor",
    description: "Messaging & relationships",
    icon: "chat",
    color: "text-rose-400",
    bgColor: "bg-rose-100",
  },
  {
    id: "research",
    name: "Research Agent",
    description: "Industry insights",
    icon: "search",
    color: "text-emerald-400",
    bgColor: "bg-emerald-100",
  },
  {
    id: "content",
    name: "Content Creator",
    description: "LinkedIn & Twitter",
    icon: "edit",
    color: "text-violet-400",
    bgColor: "bg-violet-100",
  },
  {
    id: "startup-mentor",
    name: "Startup Mentor",
    description: "B2B SaaS guidance",
    icon: "lightbulb",
    color: "text-amber-400",
    bgColor: "bg-amber-100",
  },
  {
    id: "inner-work",
    name: "Inner Work",
    description: "Feelings, growth & reflection",
    icon: "heart",
    color: "text-pink-400",
    bgColor: "bg-pink-100",
  },
];

const AgentIcon = ({ icon, className }: { icon: string; className?: string }) => {
  switch (icon) {
    case "chat":
      // ... existing code
    case "search":
      // ... existing code
    case "edit":
      // ... existing code
    case "lightbulb":
      // ... existing code
    case "heart":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function ChatPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<string[]>([agents[0].id]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("founder-os-chats");
    if (savedChats) {
      const parsed = JSON.parse(savedChats);
      // Convert timestamp strings back to Date objects
      const chatsWithDates = parsed.map((chat: Chat) => ({
        ...chat,
        messages: chat.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      setChats(chatsWithDates);
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("founder-os-chats", JSON.stringify(chats));
    }
  }, [chats]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result: SpeechRecognitionResult) => result[0].transcript)
            .join("");
          setInput(transcript);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const createNewChat = (agent: Agent) => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      agentId: agent.id,
      title: "New conversation",
      messages: [],
      threadId: null,
      createdAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newChat);
    setSelectedAgent(agent);
    if (!expandedAgents.includes(agent.id)) {
      setExpandedAgents((prev) => [...prev, agent.id]);
    }
  };

  const selectChat = (chat: Chat) => {
    setActiveChat(chat);
    const agent = agents.find((a) => a.id === chat.agentId);
    if (agent) setSelectedAgent(agent);
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChats = chats.filter((c) => c.id !== chatId);
    setChats(updatedChats);
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
    localStorage.setItem("founder-os-chats", JSON.stringify(updatedChats));
  };

  const generateTitle = (message: string): string => {
    const title = message.slice(0, 30);
    return title.length < message.length ? `${title}...` : title;
  };

  const getChatsForAgent = (agentId: string) => {
    return chats.filter((chat) => chat.agentId === agentId);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage = input.trim();
    setInput("");

    let currentChat = activeChat;
    if (!currentChat) {
      currentChat = {
        id: `chat-${Date.now()}`,
        agentId: selectedAgent.id,
        title: generateTitle(userMessage),
        messages: [],
        threadId: null,
        createdAt: Date.now(),
      };
      setChats((prev) => [currentChat!, ...prev]);
    }

    if (currentChat.messages.length === 0) {
      currentChat = { ...currentChat, title: generateTitle(userMessage) };
    }

    const updatedMessages: Message[] = [
      ...currentChat.messages,
      { role: "user", content: userMessage, timestamp: new Date() },
    ];

    const updatedChat = { ...currentChat, messages: updatedMessages };
    setActiveChat(updatedChat);
    setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          message: userMessage,
          threadId: currentChat.threadId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const finalChat: Chat = {
        ...updatedChat,
        threadId: data.threadId,
        messages: [
          ...updatedMessages,
          { role: "assistant", content: data.message, timestamp: new Date() },
        ],
      };

      setActiveChat(finalChat);
      setChats((prev) => prev.map((c) => (c.id === finalChat.id ? finalChat : c)));
    } catch (error) {
      console.error("Error:", error);
      const errorChat: Chat = {
        ...updatedChat,
        messages: [
          ...updatedMessages,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            timestamp: new Date(),
          },
        ],
      };
      setActiveChat(errorChat);
      setChats((prev) => prev.map((c) => (c.id === errorChat.id ? errorChat : c)));
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const getPlaceholderText = () => {
    switch (selectedAgent.id) {
      case "comms-advisor":
        return "Ask me to draft messages, review emails, or plan your outreach...";
      case "research":
        return "Ask me about market trends, competitors, or industry insights...";
      case "content":
        return "Ask me to write LinkedIn posts, Twitter threads, or blog content...";
      case "startup-mentor":
        return "Ask me about strategy, prioritization, or startup challenges...";
      default:
        return `Message ${selectedAgent.name}...`;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Sidebar */}
      <div className="w-80 bg-gradient-to-b from-slate-50 to-slate-100/50 border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-indigo-400 rounded-xl shadow-sm" />
            <div>
              <span className="font-semibold text-slate-800">Founder OS</span>
              <p className="text-xs text-slate-500">Your AI advisory team</p>
            </div>
          </div>
        </div>

        {/* Agents */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {agents.map((agent) => {
            const isExpanded = expandedAgents.includes(agent.id);
            const agentChats = getChatsForAgent(agent.id);
            const isSelected = selectedAgent.id === agent.id;

            return (
              <div
                key={agent.id}
                className={`rounded-2xl transition-all ${
                  isSelected && isExpanded
                    ? "bg-white shadow-sm border-2 border-violet-200"
                    : "bg-white/60 hover:bg-white hover:shadow-sm"
                }`}
              >
                {/* Agent Header */}
                <div
                  className="flex items-center space-x-3 p-4 cursor-pointer"
                  onClick={() => {
                    setSelectedAgent(agent);
                    toggleAgentExpanded(agent.id);
                  }}
                >
                  <div className={`w-11 h-11 ${agent.bgColor} rounded-xl flex items-center justify-center`}>
                    <AgentIcon icon={agent.icon} className={`w-6 h-6 ${agent.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{agent.name}</div>
                    <div className="text-xs text-slate-500">{agent.description}</div>
                  </div>
                  {!isExpanded && agentChats.length > 0 && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                      {agentChats.length}
                    </span>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-1">
                    {agentChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => selectChat(chat)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition ${
                          activeChat?.id === chat.id
                            ? "bg-violet-50 text-violet-700 font-medium"
                            : "hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className="text-sm truncate flex-1">{chat.title}</span>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg transition"
                          title="Delete chat"
                        >
                          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* New Chat Button */}
                    <button
                      onClick={() => createNewChat(agent)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-violet-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New chat</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-11 h-11 ${selectedAgent.bgColor} rounded-xl flex items-center justify-center`}>
              <AgentIcon icon={selectedAgent.icon} className={`w-6 h-6 ${selectedAgent.color}`} />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800">{selectedAgent.name}</h1>
              <p className="text-sm text-slate-400">
                {activeChat ? activeChat.title : selectedAgent.description}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {(!activeChat || activeChat.messages.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className={`w-16 h-16 ${selectedAgent.bgColor} rounded-2xl flex items-center justify-center mb-6`}>
                <AgentIcon icon={selectedAgent.icon} className={`w-8 h-8 ${selectedAgent.color}`} />
              </div>
              <h2 className="text-xl font-medium text-slate-700 mb-2">Start a conversation</h2>
              <p className="text-slate-400 max-w-sm">{getPlaceholderText()}</p>
            </div>
          )}

          {activeChat?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" ? (
                <div className="flex space-x-3 max-w-2xl">
                  <div className={`w-8 h-8 ${selectedAgent.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 mt-1`}>
                    <AgentIcon icon={selectedAgent.icon} className={`w-4 h-4 ${selectedAgent.color}`} />
                  </div>
                  <div>
                    <div className="bg-slate-50 px-5 py-4 rounded-2xl rounded-bl-md">
                      <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1.5">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ) : (
                <div className="max-w-lg">
                  <div className="bg-violet-500 text-white px-5 py-3 rounded-2xl rounded-br-md shadow-sm">
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 text-right">{formatTime(msg.timestamp)}</div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <div className={`w-8 h-8 ${selectedAgent.bgColor} rounded-lg flex items-center justify-center`}>
                  <AgentIcon icon={selectedAgent.icon} className={`w-4 h-4 ${selectedAgent.color}`} />
                </div>
                <div className="bg-slate-50 px-5 py-4 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-8 py-5 border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            <div className={`bg-slate-50 rounded-2xl border transition-all ${
              isListening 
                ? "border-red-300 ring-2 ring-red-100" 
                : "border-slate-200 focus-within:ring-2 focus-within:ring-violet-200 focus-within:border-violet-300 focus-within:bg-white"
            }`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={isListening ? "Listening..." : `Message ${selectedAgent.name}...`}
                rows={1}
                className="w-full px-5 py-4 bg-transparent resize-none focus:outline-none text-slate-700 placeholder-slate-400"
                disabled={loading}
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-lg transition ${
                      isListening
                        ? "text-red-500 bg-red-100 animate-pulse"
                        : "text-slate-400 hover:text-violet-500 hover:bg-violet-50"
                    }`}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition shadow-sm"
                >
                  Send
                </button>
              </div>
            </div>
            {isListening && (
              <p className="text-sm text-red-500 mt-2 text-center">
                🎤 Listening... Click the microphone or press Send when done
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}