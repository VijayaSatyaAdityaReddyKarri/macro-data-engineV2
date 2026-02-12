'use client'; // 👈 This tells Next.js to run this in the browser

import React, { useEffect, useState } from 'react';
import MacroLineChart from '@/components/MacroLineChart';

const ALPHA_VANTAGE_KEY = 'G3MRG40E7MG8QEOB';

export default function MacroPage() {
  // 1. Define State to hold the data
  const [data, setData] = useState({
    gdp: { data: [] },
    unemployment: { data: [] },
    cpi: { data: [] },
    fedFunds: { data: [] },
    recessions: { data: [] },
    sp500: { price: "---", change: "0.00%", pos: true },
    dxy: { price: "---", change: "0.00%", pos: true },
    yields: { price: "---", change: "0.00%", pos: true }
  });

  // 2. Fetch Data when the page loads (in the Browser)
  useEffect(() => {
    async function loadAllData() {
      console.log("⚡ Client-side fetch starting...");

      // Helper to fetch series from YOUR API
      const fetchSeries = async (slug: string) => {
        try {
          // We use a relative path '/api/...' so it works automatically
          const res = await fetch(`/api/series/${slug}`);
          const json = await res.json();
          if (!json.data) return { data: [] };
          
          // Clean data
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

      // Helper to fetch Market Data (Alpha Vantage)
      const fetchMarket = async (symbol: string) => {
        try {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
          );
          const json = await res.json();
          const quote = json["Global Quote"];
          if (!quote) return { price: "---", change: "0.00%", pos: true };

          const price = parseFloat(quote["05. price"]);
          const changePercent = quote["10. change percent"];
          return {
            price: price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            change: changePercent,
            pos: !changePercent.startsWith('-')
          };
        } catch (e) {
          return { price: "ERR", change: "0.00%", pos: true };
        }
      };

      // Run all fetches at once
      const [gdp, ur, cpi, fed, rec, spy, uup, ief] = await Promise.all([
        fetchSeries('real_gdp'),
        fetchSeries('unemployment_rate'),
        fetchSeries('cpi_headline'),
        fetchSeries('fed_funds'),
        fetchSeries('recessions'),
        fetchMarket('SPY'),
        fetchMarket('UUP'),
        fetchMarket('IEF')
      ]);

      // Save to state
      setData({
        gdp,
        unemployment: ur,
        cpi,
        fedFunds: fed,
        recessions: rec,
        sp500: spy,
        dxy: uup,
        yields: ief
      });
    }

    loadAllData();
  }, []);

  // Calculate latest values for the side panel
  const latestGDPValue = data.gdp.data.length > 0 ? data.gdp.data[data.gdp.data.length - 1].value : null;
  const latestUnemploymentValue = data.unemployment.data.length > 0 ? data.unemployment.data[data.unemployment.data.length - 1].value : null;

  return (
    <main style={{ maxWidth: '1450px', margin: '0 auto', padding: '20px', backgroundColor: 'transparent', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
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

      {/* GRID CONTAINER */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '25px' }}>
        
        {/* WATCHLIST */}
        <aside className="card" style={{ height: 'fit-content', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.5, marginBottom: '20px', letterSpacing: '1px' }}>WATCHLIST</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <WatchlistItem label="S&P 500 (SPY)" value={data.sp500.price} change={data.sp500.change} isPositive={data.sp500.pos} />
            <WatchlistItem label="US 10Y Yield (IEF)" value={data.yields.price} change={data.yields.change} isPositive={data.yields.pos} />
            <WatchlistItem label="DXY Index (UUP)" value={data.dxy.price} change={data.dxy.change} isPositive={data.dxy.pos} />
            
            <div style={{ height: '1px', background: '#1b2226', margin: '5px 0' }} />
            
            <WatchlistItem 
               label="Real GDP" 
               value={typeof latestGDPValue === 'number' ? `${(latestGDPValue / 1000).toFixed(1)}T` : "---"} 
               change="Quarterly" 
               isPositive={true} 
            />
            <WatchlistItem 
               label="Unemployment" 
               value={latestUnemploymentValue ? `${latestUnemploymentValue}%` : "---"} 
               change="Monthly" 
               isPositive={latestUnemploymentValue < 5} 
            />
          </div>
        </aside>

        {/* MAIN TERMINAL GRID */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
          
          {/* LARGE MAIN CHART */}
          <div className="card" style={{ gridColumn: '1 / -1', background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
            <MacroLineChart 
              title="Monetary Policy & Inflation" 
              subtitle="CPI Headline Index vs. Effective Federal Funds Rate" 
              series={[
                { id: 'cpi', name: 'CPI Index', data: data.cpi.data },
                { id: 'fed', name: 'Fed Funds', data: data.fedFunds.data }
              ]} 
              recessions={data.recessions.data}
            />
          </div>

          {/* SECONDARY CHARTS */}
          <div className="card" style={{ background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
            <MacroLineChart 
              title="Economic Growth" 
              subtitle="Real GDP (Billions)" 
              series={[{ id: 'gdp', name: 'Real GDP', data: data.gdp.data }]} 
              recessions={data.recessions.data}
            />
          </div>

          <div className="card" style={{ background: '#0b0f0f', border: '1px solid #1b2226', borderRadius: '16px', padding: '20px' }}>
            <MacroLineChart 
              title="Labor Market" 
              subtitle="Unemployment Rate (%)" 
              series={[{ id: 'ur', name: 'Unemployment', data: data.unemployment.data, unit: '%' }]} 
              recessions={data.recessions.data}
            />
          </div>
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