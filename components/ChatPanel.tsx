'use client';

import React, { useState } from 'react';

// NEW: We added prop definitions here so TypeScript knows to accept the data!
export default function ChatPanel({ activeTab = '', activeCharts = [] }: { activeTab?: string, activeCharts?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! I am your Macro AI Analyst. Ask me anything about the data on your screen.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message to screen
    const newMessages = [...messages, { role: 'user' as const, text: inputText }];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // 1. Build the "Secret Whisper" dynamically based on what is on the screen!
      let liveContext = `The user is currently looking at the '${activeTab}' tab.\nHere are the charts they can see and their latest values:\n`;
      
      for (const chart of activeCharts) {
        try {
          // Quickly fetch the latest number for each visible chart
          const res = await fetch(`/api/latest/${chart.series_id}`);
          const valData = await res.json();
          liveContext += `- ${chart.title}: ${valData.value}\n`;
        } catch (e) {
          console.error("Failed to fetch context for", chart.series_id);
        }
      }

      // 2. Send the question AND the live context to Groq
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputText,
          chart_data: liveContext
        })
      });

      const data = await response.json();

      // Add AI answer to screen
      if (data.answer) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: "Sorry, I ran into an error reading the data." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', text: "Connection error. Make sure the backend is running!" }]);
    }

    setIsLoading(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 50 }}>
      {/* The Chat Window */}
      {isOpen && (
        <div style={{ 
          width: '350px', height: '450px', background: '#0b0f0f', 
          border: '1px solid #1b2226', borderRadius: '12px', 
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          marginBottom: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{ background: '#1b2226', padding: '15px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Macro AI Analyst</span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✖</button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#fccb0b' : '#1b2226',
                color: msg.role === 'user' ? '#000' : '#fff',
                padding: '10px 14px', borderRadius: '8px', maxWidth: '80%', fontSize: '13px', lineHeight: '1.4'
              }}>
                {msg.text}
              </div>
            ))}
            {isLoading && <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>Analyst is typing...</div>}
          </div>

          {/* Input Area */}
          <div style={{ padding: '10px', borderTop: '1px solid #1b2226', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about the charts..."
              style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '6px', outline: 'none' }}
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading}
              style={{ background: '#fccb0b', border: 'none', color: '#000', padding: '0 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* The Floating Button to open chat */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            background: '#fccb0b', color: '#000', border: 'none', 
            borderRadius: '50px', padding: '15px 25px', fontSize: '14px', 
            fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(252, 203, 11, 0.3)'
          }}
        >
          💬 Ask AI Analyst
        </button>
      )}
    </div>
  );
}