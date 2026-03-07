'use client';

import React, { useState } from 'react';

// NEW: Accept the watchlist, news, and all available tabs
export default function ChatPanel({ 
  activeTab = '', 
  activeCharts = [],
  market = {},
  news = [],
  dynamicTabs = []
}: { 
  activeTab?: string, 
  activeCharts?: any[],
  market?: any,
  news?: any[],
  dynamicTabs?: string[]
}) {
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
      // 1. Build a super-detailed "Secret Whisper" for the AI
      let liveContext = `You are a sharp, helpful financial AI assistant. Keep answers concise.\n\n`;
      
      // Tell it about the Watchlist
      liveContext += `[WATCHLIST (Sidebar)]\n`;
      liveContext += `- S&P 500 (SPY): ${market?.spy?.price || 'Loading...'}\n`;
      liveContext += `- US 10Y Yield (IEF): ${market?.ief?.price || 'Loading...'}\n`;
      liveContext += `- DXY Index (UUP): ${market?.uup?.price || 'Loading...'}\n`;
      liveContext += `- Bitcoin (BTC): ${market?.btc?.price || 'Loading...'}\n`;
      liveContext += `- Gold (GC=F): ${market?.gold?.price || 'Loading...'}\n\n`;

      // Tell it about the Live Wire (Top 3 news stories)
      liveContext += `[LIVE WIRE NEWS (Sidebar)]\n`;
      if (news && news.length > 0) {
        news.slice(0, 3).forEach((n: any) => {
          liveContext += `- ${n.publisher}: "${n.title}"\n`;
        });
      } else {
        liveContext += `- No recent news loaded yet.\n`;
      }
      liveContext += `\n`;

      // Tell it about the Tabs
      liveContext += `[MAIN DASHBOARD CHARTS]\n`;
      liveContext += `The user is currently looking at the '${activeTab}' tab.\n`;
      liveContext += `If they ask about a chart not listed below, tell them: "Please click on the [Tab Name] tab so I can see that data!" (Available tabs: ${dynamicTabs.join(', ')}).\n\n`;
      
      liveContext += `Here are the latest values for the charts in the active '${activeTab}' tab:\n`;
      
      for (const chart of activeCharts) {
        try {
          // Quickly fetch the latest number for active charts
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
      {isOpen && (
        <div style={{ 
          width: '350px', height: '450px', background: '#0b0f0f', 
          border: '1px solid #1b2226', borderRadius: '12px', 
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          marginBottom: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ background: '#1b2226', padding: '15px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Macro AI Analyst</span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✖</button>
          </div>

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
            {isLoading && <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>Analyst is reading...</div>}
          </div>

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