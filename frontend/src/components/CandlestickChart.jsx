import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, ColorType } from 'lightweight-charts';

export default function CandlestickChart({ data, type = 'candle', width = '100%', height = 300 }) {
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

    let series;
    if (type === 'line') {
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
        if (type === 'line') {
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

  return (
    <div
      ref={chartContainerRef}
      style={{ width, height, position: 'relative', marginTop: '16px', borderRadius: '8px', overflow: 'hidden' }}
      className="candlestick-chart-container fade-in"
    />
  );
}
