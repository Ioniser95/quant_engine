import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, ColorType } from 'lightweight-charts';

export default function CandlestickChart({ data, type = 'candle', width = '100%', height = 300 }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a1a1aa', // text-secondary
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });
    
    chartRef.current = chart;

    let series;
    const chartType = type.toLowerCase();
    if (chartType === 'line') {
      series = chart.addSeries(LineSeries, {
        color: '#8b5cf6', // accent color
        lineWidth: 2,
        crosshairMarkerVisible: true,
      });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e', // success
        downColor: '#ef4444', // danger
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
    }

    if (data && data.length > 0) {
      // Ensure data is sorted by time ascending (TradingView requirement)
      const sortedData = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));
      
      // Filter out duplicate dates and invalid numbers which cause fatal crashes
      const uniqueData = [];
      const seenTimes = new Set();
      for (const item of sortedData) {
        if (!seenTimes.has(item.time) && !isNaN(item.open) && !isNaN(item.close)) {
          seenTimes.add(item.time);
          uniqueData.push(item);
        }
      }
      
      if (uniqueData.length > 0) {
        if (chartType === 'line') {
          // Line series requires only time and value
          series.setData(uniqueData.map(d => ({ time: d.time, value: d.close })));
        } else {
          series.setData(uniqueData);
        }
        chart.timeScale().fitContent();
      }
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) {
        return;
      }
      const newRect = entries[0].contentRect;
      chart.applyOptions({ width: newRect.width, height: newRect.height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, height, type]);

  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const currentRange = timeScale.getVisibleLogicalRange();
    if (currentRange) {
        const span = currentRange.to - currentRange.from;
        timeScale.setVisibleLogicalRange({
           from: currentRange.from + span * 0.1,
           to: currentRange.to - span * 0.1
        });
    }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const currentRange = timeScale.getVisibleLogicalRange();
    if (currentRange) {
        const span = currentRange.to - currentRange.from;
        timeScale.setVisibleLogicalRange({
           from: currentRange.from - span * 0.1,
           to: currentRange.to + span * 0.1
        });
    }
  };

  const handleReset = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
  };

  return (
    <div style={{ position: 'relative', width, height, marginTop: '16px' }} className="candlestick-chart-wrapper">
      <div
        style={{
          position: 'absolute', bottom: '30px', left: '5px', zIndex: 10,
          display: 'flex', gap: '6px', background: 'rgba(30, 30, 30, 0.6)', padding: '4px', borderRadius: '8px',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
        }}
      >
        <button onClick={handleZoomIn} style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold' }}>+</button>
        <button onClick={handleZoomOut} style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1rem' }}>-</button>
        <button onClick={handleReset} style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>RESET</button>
      </div>
      <div
        ref={chartContainerRef}
        style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}
        className="candlestick-chart-container fade-in"
      />
    </div>
  );
}
