'use client';

import React, { useEffect, useState } from 'react';
import MacroLineChart from '@/components/MacroLineChart';

export default function MacroPage() {
  // 1. Define State (Added Active Tab & New Labor Data)
  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState<any>({
    gdp: { data: [] },
    unemployment: { data: [] },
    cpi: { data: [] },
    fedFunds: { data: [] },
    recessions: { data: [] },
    sp500: { price: "---", change: "0.00%", pos: true },
    dxy: { price: "---", change: "0.00%", pos: true },
    yields: { price: "---", change: "0.00%", pos: true },
    btc: { price: "---", change: "0.00%", pos: true },
    gold: { price: "---", change: "0.00%", pos: true },
    news: [],
    // New Phase 2 Data
    nfp: { data: [] },
    participation: { data: [] }
  });

  // 2. Fetch Data
  useEffect(() => {
    async function loadAllData() {
      console.log("⚡ Client-side fetch starting...");

      const fetchSeries = async (slug: string) => {
        try {
          const res = await fetch(`/api/series/${slug}`);
          const json = await res.json();
          if (!json.data) return { data: [] };
          const cleanData = json.data.map((item: any) => ({
            time: item.date,
            value: item.value
          }));
          return { data: cleanData };
        } catch (e) {
          console.error(`Failed to fetch ${slug}`, e);
          return { data: [] };
        }
      };

      const fetchMarket = async (symbol: string) => {
        try {
          const res = await fetch(`/api/market/${symbol}`);
          if (!res.ok) return { price: "---", change: "0.00%", pos: true };
          return await res.json();
        } catch (e) {
          return { price: "ERR", change: "0.00%", pos: true };
        }
      };

      const fetchNews = async () => {
        try {
          const res = await fetch(`/api/news`);
          const json = await res.json();
          return json.data || [];
        } catch (e) {
          return [];
        }
      };

      // Fetch core + new labor data
      const [gdp, ur, cpi, fed, rec, spy, uup, ief, btcData, goldData, newsData, nfpData, partData] = await Promise.all([
        fetchSeries('real_gdp'),
        fetchSeries('unemployment_rate'),
        fetchSeries('cpi_headline'),
        fetchSeries('fed_funds'),
        fetchSeries('recessions'),
        fetchMarket('SPY'),
        fetchMarket('UUP'),
        fetchMarket('IEF'),
        fetchMarket('BTC-USD'),
        fetchMarket('GC=F'),
        fetchNews(),
        fetchSeries('nonfarm_payrolls'),
        fetchSeries('labor_participation')
      ]);

      setData({
        gdp, unemployment: ur, cpi, fedFunds: fed, recessions: rec,
        sp500: spy, dxy: uup, yields: ief, btc: btcData, gold: goldData, news: newsData,
        nfp: nfpData, participation: partData
      });
    }

    loadAllData();
  }, []);

  const latestGDPValue = data.gdp.data.length > 0 ? data.gdp.data[data.gdp.data.length - 1].value : null;
  const latestUnemploymentValue = data.unemployment.data.length > 0 ? data.unemployment.data[data.unemployment.data.length - 1].value : null;

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px', backgroundColor: 'transparent', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #1b2226', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, color: '#fff' }}>SKXY TERMINAL</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.5, letterSpacing: '1px' }}>
          <div>LIVE CONNECTION: <span style={{ color: '#4caf50' }}>ACTIVE</span></div>
          <div>DATASET: US_MACRO_CORE</div>
        </div>
      </header>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px' }}>
        
        {/* LEFT SIDEBAR (Watchlist + News + Ad Box) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* WATCHLIST */}
          <aside className="card" style={{ background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.5, marginBottom: '20px', letterSpacing: '1px' }}>WATCHLIST</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <WatchlistItem label="S&P 500 (SPY)" value={data.sp500.price} change={data.sp500.change} isPositive={data.sp500.pos} />
              <WatchlistItem label="US 10Y Yield (IEF)" value={data.yields.price} change={data.yields.change} isPositive={data.yields.pos} />
              <WatchlistItem label="DXY Index (UUP)" value={data.dxy.price} change={data.dxy.change} isPositive={data.dxy.pos} />
              <WatchlistItem label="Bitcoin (BTC)" value={data.btc.price} change={data.btc.change} isPositive={data.btc.pos} />
              <WatchlistItem label="Gold (GC=F)" value={data.gold.price} change={data.gold.change} isPositive={data.gold.pos} />
              <div style={{ height: '1px', background: '#1b2226', margin: '5px 0' }} />
              <WatchlistItem label="Real GDP" value={typeof latestGDPValue === 'number' ? `${(latestGDPValue / 1000).toFixed(1)}T` : "---"} change="Quarterly" isPositive={true} />
              <WatchlistItem label="Unemployment" value={latestUnemploymentValue ? `${latestUnemploymentValue}%` : "---"} change="Monthly" isPositive={latestUnemploymentValue < 5} />
            </div>
          </aside>

          {/* LIVE WIRE */}
          <aside className="card" style={{ flex: 1, background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.5, marginBottom: '20px', letterSpacing: '1px' }}>LIVE WIRE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {data.news.length === 0 ? (
                 <div style={{opacity: 0.3, fontSize: '12px'}}>Connecting to wire...</div>
              ) : (
                 data.news.map((item: any, i: number) => (
                   <a key={i} href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', paddingBottom: '15px', borderBottom: '1px solid #1b2226' }}>
                     <div style={{ fontSize: '11px', color: '#d4af37', marginBottom: '5px', fontWeight: 'bold' }}>{item.publisher}</div>
                     <div style={{ fontSize: '13px', lineHeight: '1.4', fontWeight: 500, marginBottom: '5px' }}>{item.title}</div>
                     <div style={{ fontSize: '10px', opacity: 0.4 }}>{new Date(item.time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                   </a>
                 ))
              )}
            </div>
          </aside>

          {/* ADVERTISEMENT PLACEHOLDER */}
          <aside className="card" style={{ background: '#0b0f0f', border: '1px dashed #333', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', opacity: 0.7 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.5, letterSpacing: '2px', marginBottom: '10px' }}>SPONSORED</div>
            <div style={{ fontSize: '13px', color: '#aaa', textAlign: 'center' }}>
              Advertisement Space Available<br/>
              <span style={{ fontSize: '11px', opacity: 0.5 }}>(Contact admin to place your ad here)</span>
            </div>
          </aside>

        </div>

        {/* RIGHT CONTENT: Tabs + Charts */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB NAVIGATION */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #1b2226', paddingBottom: '10px' }}>
            {['Overview', 'Labor Market', 'Inflation', 'Liquidity'].map(tab => (
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
                  transition: '0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB CONTENT: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="card" style={{ height: '400px', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
                <MacroLineChart title="Monetary Policy & Inflation" subtitle="CPI Headline vs. Fed Funds Rate" series={[{ id: 'cpi', name: 'CPI', data: data.cpi.data }, { id: 'fed', name: 'Fed Funds', data: data.fedFunds.data }]} recessions={data.recessions.data} />
              </div>
              <div className="card" style={{ height: '400px', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
                <MacroLineChart title="Economic Growth" subtitle="Real GDP" series={[{ id: 'gdp', name: 'Real GDP', data: data.gdp.data }]} recessions={data.recessions.data} />
              </div>
            </div>
          )}

          {/* TAB CONTENT: LABOR MARKET */}
          {activeTab === 'Labor Market' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="card" style={{ height: '400px', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
                <MacroLineChart title="Job Creation" subtitle="Non-Farm Payrolls (Monthly Change)" series={[{ id: 'nfp', name: 'NFP (Thousands)', data: data.nfp.data }]} recessions={data.recessions.data} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div className="card" style={{ height: '350px', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
                  <MacroLineChart title="Unemployment" subtitle="Headline Rate (U3)" series={[{ id: 'ur', name: 'Unemployment', data: data.unemployment.data, unit: '%' }]} recessions={data.recessions.data} />
                </div>
                <div className="card" style={{ height: '350px', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
                  <MacroLineChart title="Workforce" subtitle="Labor Force Participation" series={[{ id: 'part', name: 'Participation', data: data.participation.data, unit: '%' }]} recessions={data.recessions.data} />
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: PLACEHOLDERS FOR NEXT STEPS */}
          {(activeTab === 'Inflation' || activeTab === 'Liquidity') && (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f0f', border: '1px dashed #333', borderRadius: '16px', color: '#888' }}>
              {activeTab} Data Modules Initializing... (Next Step)
            </div>
          )}

        </section>

      </div>
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