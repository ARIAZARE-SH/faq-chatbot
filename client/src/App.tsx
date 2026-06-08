import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number; // Unix ms
  streaming?: boolean;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

const STORAGE_KEY = "stylie_chat_history";

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hey there! 👋 I'm Stylie, your personal shopping assistant. Ask me anything about sizing, orders, shipping, returns, or our styles — or pick a question below!",
  timestamp: Date.now(),
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [{ ...WELCOME, timestamp: Date.now() }];
    const parsed: Message[] = JSON.parse(raw);
    return parsed.map((m) => ({
      ...m,
      streaming: false,
      // backfill timestamp for old history saved without it
      timestamp: m.timestamp ?? Date.now(),
    }));
  } catch {
    return [{ ...WELCOME, timestamp: Date.now() }];
  }
}

function saveHistory(messages: Message[]) {
  try {
    const clean = messages.map(({ streaming: _, ...m }) => m);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) saveHistory(messages);
  }, [messages, loading]);

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then(setFaqs)
      .catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{ ...WELCOME, timestamp: Date.now() }]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Placeholder with timestamp set now (will be the bot's reply time)
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true, timestamp: Date.now() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.token) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                }
                return updated;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ Error: Could not connect to the server.",
          timestamp: Date.now(),
        };
        return updated;
      });
    } finally {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.streaming) {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">👗 Stylie</span>
          <p className="sidebar-sub">Your personal style assistant</p>
        </div>
        <p className="sidebar-label">Quick questions</p>
        <ul className="faq-list">
          {faqs.map((faq) => (
            <li key={faq.id}>
              <button
                className="faq-pill"
                onClick={() => sendMessage(faq.question)}
                disabled={loading}
              >
                {faq.question}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-area">
        <div className="chat-header">
          <span className="chat-title">Chat</span>
          <button
            className="clear-btn"
            onClick={clearHistory}
            disabled={loading}
            title="Clear chat history"
          >
            🗑 Clear history
          </button>
        </div>

        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`bubble-wrap ${msg.role}`}>
              <div className="chatter-label">
                <span className="avatar">{msg.role === "assistant" ? "👗" : "🧑"}</span>
                <span className="chatter-name">{msg.role === "assistant" ? "Stylie" : "You"}</span>
              </div>
              <div className={`bubble ${msg.role}`}>
                {msg.content}
                {msg.streaming && <span className="cursor" />}
              </div>
              {!msg.streaming && (
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="input-bar">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Type your question..."
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="send-btn"
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}