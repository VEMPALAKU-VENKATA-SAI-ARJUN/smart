import { useState, useRef } from "react";
import { Send, BotMessageSquare , X } from "lucide-react";
import "../styles/SmartAssistantChat.css";

export default function SmartAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello 👋 I'm S.M.A.R.T, your ArtNexus assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${API_URL}/api/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      const botReply =
        data?.data?.botMessage?.content ||
        data?.data?.botMsg?.content ||
        data?.reply ||
        "Sorry, I couldn’t process that right now.";

      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Unable to reach the server. Try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button className="smart-toggle" onClick={toggleChat}>
        {isOpen ? <X size={22} /> : <BotMessageSquare  size={24} />}
        <span className="smart-tooltip">Ask S.M.A.R.T</span>
      </button>


      {/* Chat window */}
      {isOpen && (
        <div className="smart-chatbox">
          <div className="smart-header">
            🤖 <span>S.M.A.R.T Assistant</span>
          </div>

          <div className="smart-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`smart-message ${
                  msg.sender === "user" ? "user" : "bot"
                }`}
              >
                <p>{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="smart-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? (
                <div className="smart-loader"></div>
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
