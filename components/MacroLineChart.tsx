'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  seriesId: string;
}

export default function MacroLineChart({ seriesId }: MacroLineChartProps) {
  const [transform, setTransform] = useState<'level' | 'yoy'>('level');
  const [chartData, setChartData] = useState<{ time: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. THIS IS THE FETCH! (Updated for Vercel production)
  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/${seriesId}`) // <--- REMOVED localhost URL HERE
      .then(res => res.json())
      .then(data => {
        const formattedData = data.map((d: any) => ({
          time: d.date,
          value: d.value
        }));
        setChartData(formattedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching chart data:", err);
        setLoading(false);
      });
  }, [seriesId]);

  // 2. Calculate YoY Data
  const transformedData = useMemo(() => {
    if (transform === 'level') return chartData;
    
    return chartData.map((point, i) => {
      const prevYearIndex = i - 12; // Assuming monthly data spacing
      if (prevYearIndex < 0) return { ...point, value: null };
      const prevValue = chartData[prevYearIndex].value;
      const yoy = ((point.value / prevValue) - 1) * 100;
      return { ...point, value: parseFloat(yoy.toFixed(2)) };
    }).filter(p => p.value !== null);
  }, [chartData, transform]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading {seriesId}...</div>;
  }

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
      recessionBars: { data: [] }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#444', maxTicksLimit: 6 } },
      y: { grid: { color: '#1b2226' }, ticks: { color: '#888' } }
    }
  };

  const data = {
    labels: transformedData.map(d => d.time) || [],
    datasets: [{
      label: seriesId,
      data: transformedData.map(d => d.value),
      borderColor: '#fccb0b',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
    }]
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
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
      <div style={{ height: 'calc(100% - 35px)' }}>
        <Line options={options as any} data={data} plugins={[recessionPlugin]} />
      </div>
    </div>
  );
}