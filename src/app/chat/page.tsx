"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
}

const agents: Agent[] = [
  {
    id: "comms-advisor",
    name: "Communications Advisor",
    description: "Messages & relationships",
  },
  {
    id: "research",
    name: "Research Agent",
    description: "Industry research & insights",
  },
  {
    id: "content",
    name: "Content Creation Agent (LI & X)",
    description: "LinkedIn & Twitter posts",
  },
  {
    id: "startup-mentor",
    name: "Startup Mentor",
    description: "Brutally honest B2B advisor",
  },
];

export default function ChatPage() {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset thread when agent changes
  const handleAgentChange = (agent: Agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setThreadId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          message: userMessage,
          threadId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setThreadId(data.threadId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Agent Selector */}
      <div className="w-64 bg-white border-r p-4">
        <h2 className="text-lg font-semibold mb-4">Founder OS</h2>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleAgentChange(agent)}
              className={`w-full text-left p-3 rounded-lg transition ${
                selectedAgent.id === agent.id
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100"
              }`}
            >
              <div className="font-medium">{agent.name}</div>
              <div className="text-sm text-gray-500">{agent.description}</div>
            </button>
          ))}
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            setMessages([]);
            setThreadId(null);
          }}
          className="w-full mt-4 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          + New Chat
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <h1 className="text-xl font-semibold">{selectedAgent.name}</h1>
          <p className="text-gray-500">{selectedAgent.description}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-lg">👋 Hey Shenny!</p>
              <p className="text-sm mt-2">{getPlaceholderText()}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-2xl p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm p-4 rounded-lg">
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
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              placeholder={`Message ${selectedAgent.name}...`}
              className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}