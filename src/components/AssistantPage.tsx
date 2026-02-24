import React, { useState, useRef, useEffect } from "react";
import "../theme.css";
import "./AssistantPage.css";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

const WELCOME: Message = {
    id: "welcome",
    role: "assistant",
    content:
        "👋 Hi! I'm **PMX Assistant**, your AI project management advisor.\n\nI can help you with:\n- 📋 Project planning & charter writing\n- ⚠️ Risk management strategies\n- 📊 Scheduling & resource allocation\n- 🏃 Agile, Waterfall & hybrid methodologies\n- 💡 Best practices & PM frameworks\n\nAsk me anything about project management!",
};

function renderMarkdown(text: string) {
    // Very lightweight markdown: bold, bullets, line breaks
    return text
        .split("\n")
        .map((line, i) => {
            // Bold
            let html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            // Inline code
            html = html.replace(/`(.+?)`/g, '<code style="background:var(--surface-2);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
            // Bullet
            if (/^[-•]\s/.test(html)) {
                html = `<span style="margin-left:8px">${html}</span>`;
            }
            return `<span key="${i}">${html}</span>`;
        })
        .join("<br/>");
}

const AssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([WELCOME]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    async function handleSend() {
        const text = input.trim();
        if (!text || sending) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setSending(true);

        try {
            // Build history (skip welcome message)
            const history = messages
                .filter((m) => m.id !== "welcome")
                .map((m) => ({ role: m.role, content: m.content }));

            const res = await fetch("/api/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || "Failed to get response");

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.reply || "Sorry, I couldn't generate a response.",
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `⚠️ ${err.message || "Something went wrong. Please try again."}`,
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="container ast-container">
            <header className="page-header">
                <h1 className="page-title">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-3px", marginRight: 8 }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    PMX Assistant
                </h1>
                <p className="page-subtitle">
                    Your AI project management advisor
                    <span className="dots"><span>.</span><span>.</span><span>.</span></span>
                </p>
            </header>

            {/* ── Chat Area ── */}
            <div className="ast-chat">
                <div className="ast-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`ast-msg ast-msg-${msg.role}`}>
                            <div className="ast-msg-avatar">
                                {msg.role === "user" ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                )}
                            </div>
                            <div className="ast-msg-body">
                                <span className="ast-msg-name">{msg.role === "user" ? "You" : "PMX Assistant"}</span>
                                <div
                                    className="ast-msg-content"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                />
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="ast-msg ast-msg-assistant">
                            <div className="ast-msg-avatar">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <div className="ast-msg-body">
                                <span className="ast-msg-name">PMX Assistant</span>
                                <div className="ast-msg-content ast-typing">
                                    Thinking<span className="dots"><span>.</span><span>.</span><span>.</span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* ── Input ── */}
                <div className="ast-input-bar">
                    <textarea
                        ref={inputRef}
                        className="ast-input"
                        placeholder="Ask anything about project management..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={sending}
                    />
                    <button className="ast-send-btn" onClick={handleSend} disabled={!input.trim() || sending}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssistantPage;
