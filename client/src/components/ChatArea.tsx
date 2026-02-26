import { useEffect, useRef } from "react";
import { Paperclip, MessageSquare, Zap } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatAreaProps {
  messages: Message[];
}

export default function ChatArea({ messages }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-messages">
      {messages.length === 0 && (
        <div className="chat-empty">
          <p className="chat-empty-title">Ready to compress</p>
          <p className="chat-empty-sub">
            Drop your code context in, choose a mode, and get a compressed bundle
            that fits far more into any LLM's context window.
          </p>
          <div className="chat-hints">
            <div className="chat-hint-item">
              <Paperclip size={15} className="chat-hint-icon" />
              <span>Use the <strong>paperclip</strong> to attach code files — each is analysed for tokens instantly.</span>
            </div>
            <div className="chat-hint-item">
              <MessageSquare size={15} className="chat-hint-icon" />
              <span>Optionally <strong>type a prompt</strong> to include your conversation history in the bundle.</span>
            </div>
            <div className="chat-hint-item">
              <Zap size={15} className="chat-hint-icon" />
              <span>Hit <strong>Compress &amp; Export</strong> in the file tray to download your bundle.</span>
            </div>
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`chat-bubble-wrap ${msg.role === "user" ? "user" : "assistant"}`}
        >
          <div className="chat-bubble">{msg.content}</div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
