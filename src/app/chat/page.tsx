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
  avatar: string;
  color: string;
}

const agents: Agent[] = [
  {
    id: "comms-advisor",
    name: "Communications Advisor",
    description: "Messaging & relationship building",
    avatar: "💬",
    color: "bg-blue-500",
  },
  {
    id: "research",
    name: "Research Agent",
    description: "Industry research & insights",
    avatar: "🔍",
    color: "bg-emerald-500",
  },
  {
    id: "content",
    name: "Content Creation Agent",
    description: "LinkedIn & Twitter posts",
    avatar: "✍️",
    color: "bg-purple-500",
  },
  {
    id: "startup-mentor",
    name: "Startup Mentor",
    description: "Early stage B2B SaaS",
    avatar: "🎓",
    color: "bg-amber-500",
  },
];

export default function ChatPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<string[]>(agents.map(a => a.id));
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("founder-os-chats");
    if (savedChats) {
      setChats(JSON.parse(savedChats));
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

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
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
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
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
  };

  const selectChat = (chat: Chat) => {
    setActiveChat(chat);
    const agent = agents.find((a) => a.id === chat.agentId);
    if (agent) setSelectedAgent(agent);
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
    // Update localStorage
    const updatedChats = chats.filter((c) => c.id !== chatId);
    localStorage.setItem("founder-os-chats", JSON.stringify(updatedChats));
  };

  const generateTitle = (message: string): string => {
    // Take first 30 chars of message as title
    const title = message.slice(0, 30);
    return title.length < message.length ? `${title}...` : title;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage = input.trim();
    setInput("");

    // Create new chat if none active
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

    // Update title if it's the first message
    if (currentChat.messages.length === 0) {
      currentChat = { ...currentChat, title: generateTitle(userMessage) };
    }

    // Add user message
    const updatedMessages: Message[] = [
      ...currentChat.messages,
      { role: "user", content: userMessage },
    ];
    
    const updatedChat = { ...currentChat, messages: updatedMessages };
    setActiveChat(updatedChat);
    setChats((prev) =>
      prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
    );
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
          { role: "assistant", content: data.message },
        ],
      };

      setActiveChat(finalChat);
      setChats((prev) =>
        prev.map((c) => (c.id === finalChat.id ? finalChat : c))
      );
    } catch (error) {
      console.error("Error:", error);
      const errorChat: Chat = {
        ...updatedChat,
        messages: [
          ...updatedMessages,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ],
      };
      setActiveChat(errorChat);
      setChats((prev) =>
        prev.map((c) => (c.id === errorChat.id ? errorChat : c))
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
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
        return 'Try: "Got a message from an investor asking about our progress"';
      case "research":
        return 'Try: "What are the latest trends in AI hiring?"';
      case "content":
        return 'Try: "Write a LinkedIn post about structured interviews"';
      case "startup-mentor":
        return 'Try: "What should I be focused on right now?"';
      default:
        return `Start a conversation with ${selectedAgent.name}`;
    }
  };

  const getChatsForAgent = (agentId: string) => {
    return chats.filter((chat) => chat.agentId === agentId);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">Founder OS</h1>
          <p className="text-sm text-gray-500">Your AI advisory team</p>
        </div>

        {/* Agents & Chats */}
        <div className="flex-1 overflow-y-auto">
          {agents.map((agent) => (
            <div key={agent.id} className="border-b border-gray-100">
              {/* Agent Header */}
              <div
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleAgentExpanded(agent.id)}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 ${agent.color} rounded-full flex items-center justify-center text-xl`}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {agent.description}
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedAgents.includes(agent.id) ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Agent's Chats */}
              {expandedAgents.includes(agent.id) && (
                <div className="bg-gray-50">
                  {/* New Chat Button */}
                  <button
                    onClick={() => createNewChat(agent)}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>New chat</span>
                  </button>

                  {/* Chat List */}
                  {getChatsForAgent(agent.id).map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => selectChat(chat)}
                      className={`group flex items-center justify-between px-4 py-2 cursor-pointer transition ${
                        activeChat?.id === chat.id
                          ? "bg-blue-100 border-r-2 border-blue-500"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {chat.title}
                      </span>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition"
                        title="Delete chat"
                      >
                        <svg
                          className="w-4 h-4 text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {getChatsForAgent(agent.id).length === 0 && (
                    <div className="px-4 py-2 text-xs text-gray-400 italic">
                      No conversations yet
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center space-x-3">
          <div
            className={`w-10 h-10 ${selectedAgent.color} rounded-full flex items-center justify-center text-xl`}
          >
            {selectedAgent.avatar}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {selectedAgent.name}
            </h1>
            <p className="text-sm text-gray-500">{selectedAgent.description}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!activeChat || activeChat.messages.length === 0) && (
            <div className="text-center text-gray-400 mt-20">
              <div
                className={`w-16 h-16 ${selectedAgent.color} rounded-full flex items-center justify-center text-3xl mx-auto mb-4`}
              >
                {selectedAgent.avatar}
              </div>
              <p className="text-lg font-medium text-gray-600">
                {selectedAgent.name}
              </p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                {getPlaceholderText()}
              </p>
            </div>
          )}

          {activeChat?.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-start space-x-2 max-w-2xl">
                {msg.role === "assistant" && (
                  <div
                    className={`w-8 h-8 ${selectedAgent.color} rounded-full flex items-center justify-center text-sm flex-shrink-0`}
                  >
                    {selectedAgent.avatar}
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white border shadow-sm rounded-bl-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div
                  className={`w-8 h-8 ${selectedAgent.color} rounded-full flex items-center justify-center text-sm`}
                >
                  {selectedAgent.avatar}
                </div>
                <div className="bg-white border shadow-sm p-4 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-4">
          <div className="flex space-x-2 max-w-4xl mx-auto">
            <button
              onClick={toggleListening}
              className={`px-4 py-3 rounded-xl transition ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              placeholder={
                isListening
                  ? "Listening..."
                  : `Message ${selectedAgent.name}...`
              }
              className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isListening ? "border-red-300 bg-red-50" : ""
              }`}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
          {isListening && (
            <p className="text-sm text-red-500 mt-2 text-center">
              🎤 Listening... Click the microphone or press Send when done
            </p>
          )}
        </div>
      </div>
    </div>
  );
}