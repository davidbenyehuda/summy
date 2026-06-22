import React, { useState } from "react";
import TopNav from "../components/dashboard/TopNav";
import DocumentPreview from "../components/dashboard/DocumentPreview";
import BottomActionBar from "../components/dashboard/BottomActionBar";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Upload a document and ask me anything about it." }
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: input },
      { role: "assistant", content: "This is a placeholder AI response." }
    ];

    setMessages(newMessages);
    setInput("");
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Document upload + preview */}
        <div className="w-[320px] border-r border-border p-3 hidden lg:block">
          <DocumentPreview />
        </div>

        {/* CENTER: Chat */}
        <div className="flex flex-col flex-1">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[70%] p-3 rounded-xl text-sm ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-muted"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {/* Input box */}
          <div className="border-t border-border p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something about your document..."
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <BottomActionBar />
    </div>
  );
}