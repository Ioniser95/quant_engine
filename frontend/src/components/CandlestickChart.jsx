import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function CandlestickChart({ data, width = '100%', height = 300 }) {
  const chartContainerRef = useRef();

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

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', // success
      downColor: '#ef4444', // danger
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    if (data && data.length > 0) {
      // Ensure data is sorted by time ascending (TradingView requirement)
      const sortedData = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));
      candlestickSeries.setData(sortedData);
      chart.timeScale().fitContent();
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
  }, [data, height]);

  return (
    <div
      ref={chartContainerRef}
      style={{ width, height, position: 'relative', marginTop: '16px', borderRadius: '8px', overflow: 'hidden' }}
      className="candlestick-chart-container fade-in"
    />
  );
}
