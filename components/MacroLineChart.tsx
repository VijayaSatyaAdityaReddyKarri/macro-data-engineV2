'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const recessionPlugin = {
  id: 'recessionBars',
  beforeDraw: (chart: any, args: any, options: any) => {
    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
    const recessionData = options.data;
    if (!recessionData || recessionData.length === 0) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    recessionData.forEach((point: any, index: number) => {
      if (point.value === 1) {
        const xPos = x.getPixelForValue(point.time);
        const nextXPos = x.getPixelForValue(recessionData[index + 1]?.time || point.time);
        const width = Math.max(nextXPos - xPos, 2);
        ctx.fillRect(xPos, top, width, bottom - top);
      }
    });
    ctx.restore();
  }
};

interface MacroLineChartProps {
  title: string;
  subtitle?: string;
  series: {
    id: string;
    name?: string;
    data: { time: string; value: number }[];
    unit?: string;
  }[];
  recessions?: { time: string; value: number }[];
}

export default function MacroLineChart({ title, subtitle, series, recessions }: MacroLineChartProps) {
  const [transform, setTransform] = useState<'level' | 'yoy'>('level');

  // Calculate YoY Data: (Current / Value 12 periods ago) - 1 
  const transformedSeries = useMemo(() => {
    if (transform === 'level') return series;
    
    return series.map(s => ({
      ...s,
      data: s.data.map((point, i) => {
        const prevYearIndex = i - 12; // Assuming monthly data
        if (prevYearIndex < 0) return { ...point, value: null };
        const prevValue = s.data[prevYearIndex].value;
        const yoy = ((point.value / prevValue) - 1) * 100;
        return { ...point, value: parseFloat(yoy.toFixed(2)) };
      }).filter(p => p.value !== null)
    }));
  }, [series, transform]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#1b2226',
        titleColor: '#888',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}${transform === 'yoy' ? '%' : ''}`
        }
      },
      recessionBars: { data: recessions || [] }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#444', maxTicksLimit: 6 } },
      y: { grid: { color: '#1b2226' }, ticks: { color: '#888' } }
    }
  };

  const data = {
    labels: transformedSeries[0]?.data.map(d => d.time) || [],
    datasets: transformedSeries.map(s => ({
      label: s.name || s.id,
      data: s.data.map(d => d.value),
      borderColor: '#fccb0b',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
    }))
  };

  return (
    <div style={{ height: '320px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff' }}>{title}</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>{subtitle} ({transform.toUpperCase()})</p>
        </div>
        {/* Toggle Buttons [cite: 22, 131, 216] */}
        <div style={{ display: 'flex', background: '#1b2226', borderRadius: '6px', padding: '2px' }}>
          <button 
            onClick={() => setTransform('level')}
            style={{ padding: '4px 8px', fontSize: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: transform === 'level' ? '#333' : 'transparent', color: '#fff' }}
          >LEVEL</button>
          <button 
            onClick={() => setTransform('yoy')}
            style={{ padding: '4px 8px', fontSize: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: transform === 'yoy' ? '#333' : 'transparent', color: '#fff' }}
          >YoY %</button>
        </div>
      </div>
      <Line options={options as any} data={data} plugins={[recessionPlugin]} />
    </div>
  );
}