"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ChatPanel from '@/components/ChatPanel'; 

// This forces Next.js to skip Server-Side Rendering for the chart, 
// which stops the "removeChild" DOM mismatch crash dead in its tracks!
const MacroLineChart = dynamic(() => import('@/components/MacroLineChart'), { 
  ssr: false,
  loading: () => <p style={{ color: '#888', padding: '20px' }}>Loading chart data...</p>
});

export default function MacroPage() {
  const [activeTab, setActiveTab] = useState(''); 
  const [metadata, setMetadata] = useState<any[]>([]);
  const [market, setMarket] = useState<any>({
    spy: { price: "---", change: "0.00%", pos: true },
    ief: { price: "---", change: "0.00%", pos: true },
    uup: { price: "---", change: "0.00%", pos: true },
    btc: { price: "---", change: "0.00%", pos: true },
    gold: { price: "---", change: "0.00%", pos: true },
  });
  const [news, setNews] = useState<any[]>([]);
  const [latestGDP, setLatestGDP] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch Dynamic Tabs
    fetch("/api/tabs")
      .then(res => res.json())
      .then(data => {
        setMetadata(data);
        // Automatically set the first tab as active upon loading
        if (data.length > 0) {
          setActiveTab(data[0].tab_name);
        }
      })
      .catch(err => console.error("Failed to load tabs", err));

    // 2. Fetch Latest BEA GDP
    fetch("/api/latest/BEA_REAL_GDP")
      .then(res => res.json())
      .then(data => {
        // Ensure it's safely parsed as a number
        const val = parseFloat(data.value);
        setLatestGDP(isNaN(val) ? null : val);
      })
      .catch(err => console.error("Failed to load GDP", err));

    // 3. Fetch Yahoo Finance Market Data safely
    const fetchMarket = async (symbol: string) => {
      try {
        const res = await fetch(`/api/market/${symbol}`);
        if (!res.ok) throw new Error("Bad response");
        return await res.json();
      } catch (e) {
        return { price: "---", change: "0.00%", pos: true };
      }
    };

    // 4. Fetch Yahoo Finance News safely
    const fetchNews = async () => {
      try {
        const res = await fetch(`/api/news`);
        const json = await res.json();
        setNews(json.data || []);
      } catch (e) {
        console.error("News fetch failed", e);
        setNews([]);
      }
    };

    async function loadWatchlist() {
      const [spy, ief, uup, btc, gold] = await Promise.all([
        fetchMarket('SPY'), fetchMarket('IEF'), fetchMarket('UUP'), fetchMarket('BTC-USD'), fetchMarket('GC=F')
      ]);
      setMarket({ spy, ief, uup, btc, gold });
      fetchNews();
    }
    
    loadWatchlist();
  }, []); // <-- CRITICAL FIX: Empty array means this ONLY runs once on page load! No more traffic jams when switching tabs.

  const dynamicTabs = Array.from(new Set(metadata.map((item) => item.tab_name)));
  const activeCharts = metadata.filter((item) => item.tab_name === activeTab);

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px', backgroundColor: '#000', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #1b2226', paddingBottom: '15px' }}>
        <div><h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, color: '#fff' }}>SKXY TERMINAL</h1></div>
        <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.5, letterSpacing: '1px' }}>
          <div>LIVE CONNECTION: <span style={{ color: '#4caf50' }}>ACTIVE</span></div>
          <div>DATASET: US_MACRO_CORE</div>
        </div>
      </header>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px' }}>
        
        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* WATCHLIST */}
          <aside className="card" style={{ background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.5, marginBottom: '20px', letterSpacing: '1px' }}>WATCHLIST</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <WatchlistItem label="S&P 500 (SPY)" value={market.spy.price} change={market.spy.change} isPositive={market.spy.pos} />
              <WatchlistItem label="US 10Y Yield (IEF)" value={market.ief.price} change={market.ief.change} isPositive={market.ief.pos} />
              <WatchlistItem label="DXY Index (UUP)" value={market.uup.price} change={market.uup.change} isPositive={market.uup.pos} />
              <WatchlistItem label="Bitcoin (BTC)" value={market.btc.price} change={market.btc.change} isPositive={market.btc.pos} />
              <WatchlistItem label="Gold (GC=F)" value={market.gold.price} change={market.gold.change} isPositive={market.gold.pos} />
              <div style={{ height: '1px', background: '#1b2226', margin: '5px 0' }} />
              <WatchlistItem label="Real GDP (BEA)" value={latestGDP !== null ? `${(latestGDP / 1000).toFixed(2)}T` : "---"} change="Quarterly" isPositive={true} />
            </div>
          </aside>

          {/* LIVE WIRE */}
          <aside className="card" style={{ flex: 1, background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.5, marginBottom: '20px', letterSpacing: '1px' }}>LIVE WIRE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {news.length === 0 ? (
                 <div style={{opacity: 0.3, fontSize: '12px'}}>Connecting to wire...</div>
              ) : (
                 news.map((item: any, i: number) => (
                   <a key={i} href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', paddingBottom: '15px', borderBottom: '1px solid #1b2226' }}>
                     <div style={{ fontSize: '11px', color: '#d4af37', marginBottom: '5px', fontWeight: 'bold' }}>{item.publisher || 'News'}</div>
                     <div style={{ fontSize: '13px', lineHeight: '1.4', fontWeight: 500, marginBottom: '5px' }}>{item.title || 'Untitled'}</div>
                     {/* CRITICAL FIX: Safely check for item.time before converting it to a Date */}
                     <div style={{ fontSize: '10px', opacity: 0.4 }}>
                       {!item.time || isNaN(Number(item.time)) 
                         ? 'Recent' 
                         : new Date(Number(item.time) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </div>
                   </a>
                 ))
              )}
            </div>
          </aside>

          {/* ADVERTISEMENT BOX */}
          <aside className="card" style={{ background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px', textAlign: 'center', marginTop: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.5, marginBottom: '10px', letterSpacing: '1px', color: '#888' }}>SPONSORED</div>
            <div style={{ fontSize: '13px', color: '#aaa', padding: '10px 0', lineHeight: '1.5' }}>
              Advertisement Space Available<br/>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>(Contact sage@worldtradefactory.com)</span>
            </div>
          </aside>

        </div>

        {/* RIGHT CONTENT */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB NAVIGATION */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #1b2226', paddingBottom: '10px', overflowX: 'auto' }}>
            {dynamicTabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                style={{ 
                  background: activeTab === tab ? '#1b2226' : 'transparent', 
                  color: activeTab === tab ? '#fff' : '#888', 
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  transition: '0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* DYNAMIC CHARTS VERTICAL STACK */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {activeCharts.map((chart) => (
               <div key={chart.series_id} className="card" style={{ height: '600px', width: '100%', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
                 <div style={{ marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>{chart.title}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Source: {chart.source}</p>
                 </div>
                 <div style={{ height: 'calc(100% - 40px)' }}>
                    <MacroLineChart seriesId={chart.series_id} />
                 </div>
               </div>
            ))}
            {activeCharts.length === 0 && activeTab !== '' && <p style={{ color: '#888' }}>Loading charts...</p>}
          </div>

        </section>
      </div>

      <ChatPanel 
        activeTab={activeTab} 
        activeCharts={activeCharts} 
        market={market}
        news={news}
        dynamicTabs={dynamicTabs}
      />

    </main>
  );
}

function WatchlistItem({ label, value, change, isPositive }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 600, fontSize: '13px', color: '#aaa' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{value}</div>
        <div style={{ fontSize: '11px', color: isPositive ? '#4caf50' : '#ff5252' }}>{change}</div>
      </div>
    </div>
  );
}