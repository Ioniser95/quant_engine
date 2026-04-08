import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState("RELIANCE.NS, ZOMATO.NS, HDFCBANK.NS") // Default search

  // Function to fetch data based on the input
  const fetchData = (tickerString) => {
    setLoading(true)
    axios.get(`http://localhost:8000/api/scan?tickers=${tickerString}`)
      .then(response => {
        setStocks(response.data.data)
        setLoading(false)
      })
      .catch(err => {
        alert("Make sure your Python API is running!")
        setLoading(false)
      })
  }

  // Load defaults on start
  useEffect(() => { fetchData(input) }, [])

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto', color: '#fff', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '10px' }}>📊 Quant Risk Engine</h1>
      
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter tickers (e.g. TCS.NS, INFY.NS)"
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#2a2a2a', color: '#fff' }}
        />
        <button 
          onClick={() => fetchData(input)}
          style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#3498db', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Scanning...' : 'Run Analysis'}
        </button>
      </div>

      <div style={{ backgroundColor: '#2a2a2a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#333' }}>
              <th style={{ padding: '15px' }}>Ticker</th>
              <th style={{ padding: '15px' }}>Master Risk</th>
              <th style={{ padding: '15px' }}>Price (Chart)</th>
              <th style={{ padding: '15px' }}>Health (Balance Sheet)</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(stock => (
              <tr key={stock.Ticker} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{stock.Ticker}</td>
                <td style={{ padding: '15px', color: stock.Risk > 50 ? '#ff4757' : '#2ed573', fontWeight: 'bold' }}>
                   {stock.Risk} {stock.Risk > 50 ? '⚠️' : '🛡️'}
                </td>
                <td style={{ padding: '15px', color: '#aaa' }}>{stock.Price_Risk}</td>
                <td style={{ padding: '15px', color: '#aaa' }}>{stock.Fund_Risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App