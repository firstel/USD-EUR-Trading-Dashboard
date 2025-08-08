import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState([]);
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState(null);
  const [strategy, setStrategy] = useState('MACD');
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [simulation, setSimulation] = useState({
    balance: 10000,
    position: null,
    entryPrice: null,
    trades: [],
    totalPnL: 0,
  });

  // Convert UTC to GMT-5 (EST)
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const est = new Date(date.getTime() - 5 * 60 * 60 * 1000);
    return est.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Convert signal number to text
  const formatSignal = (signal) => {
    if (signal === 1) return 'BUY';
    if (signal === -1) return 'SELL';
    return 'HOLD';
  };

  // Calculate pips difference
  const calculatePips = (entry, exit) => {
    return Math.round((exit - entry) * 10000); // 1 pip = 0.0001
  };

  // Process trading simulation
  const processSimulation = (signalsData) => {
    let currentSim = { ...simulation };
    let newTrades = [];

    // Process signals chronologically (reverse order since newest first)
    const chronologicalSignals = [...signalsData].reverse();

    chronologicalSignals.forEach((item, index) => {
      const signal = item.Signal;
      const price = item.USD_EUR;
      const timestamp = item.timestamp;

      // Buy signal and no position
      if (signal === 1 && !currentSim.position) {
        currentSim.position = 'LONG';
        currentSim.entryPrice = price;
      }
      // Sell signal and have long position
      else if (signal === -1 && currentSim.position === 'LONG') {
        const pips = calculatePips(currentSim.entryPrice, price);
        const profit = pips * 1; // $1 per pip for simulation

        newTrades.push({
          entry: currentSim.entryPrice,
          exit: price,
          pips: pips,
          profit: profit,
          timestamp: timestamp,
        });

        currentSim.balance += profit;
        currentSim.totalPnL += profit;
        currentSim.position = null;
        currentSim.entryPrice = null;
      }
    });

    return { ...currentSim, trades: newTrades };
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const resData = await fetch('/api/data');
        const jsonData = await resData.json();
        setData(Array.isArray(jsonData) ? jsonData : []);

        const resSignals = await fetch(`/api/signals?strategy=${strategy}`);
        const jsonSignals = await resSignals.json();
        setSignals(Array.isArray(jsonSignals) ? jsonSignals : []);

        const resStats = await fetch(`/api/trades`);
        const jsonStats = await resStats.json();
        setStats(jsonStats.stats || {});

        // Process trading simulation
        if (Array.isArray(jsonSignals) && jsonSignals.length > 0) {
          const newSimulation = processSimulation(jsonSignals);
          setSimulation(newSimulation);
        }

        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        console.error('API fetch failed:', err);
        setError('Failed to load data from backend.');
        setData([]);
        setSignals([]);
        setStats({});
      }
    };

    fetchAll();
  }, [strategy]);

  const winTrades = simulation.trades.filter((t) => t.profit > 0).length;
  const totalTrades = simulation.trades.length;

  return (
    <main style={{ padding: 20, position: 'relative' }}>
      {/* Last Update Timestamp */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          fontSize: '12px',
          color: '#666',
          background: '#f0f0f0',
          padding: '5px 10px',
          borderRadius: '4px',
        }}
      >
        {lastUpdate
          ? `Last Updated: ${formatTimestamp(lastUpdate)}`
          : 'Loading...'}
      </div>

      <h1>USD/EUR Trading Dashboard</h1>

      <div style={{ marginBottom: 10, color: '#666', fontSize: '14px' }}>
        Backtesting Period: 30 days (~720 hourly data points)
      </div>

      <label>
        Select Strategy:{' '}
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value='MACD'>MACD</option>
          <option value='RSI'>RSI</option>
          <option value='MA'>Moving Avg Cross</option>
          <option value='HYBRID'>Hybrid (SMA50+RSI+BB)</option>
        </select>
      </label>

      {error && (
        <div style={{ color: 'red', marginTop: 10 }}>
          <strong>{error}</strong>
        </div>
      )}

      {/* Trading Simulation Section */}
      <section style={{ marginTop: 20 }}>
        <h2>Trading Simulation</h2>
        <div
          style={{
            background: '#f8f9fa',
            padding: 15,
            borderRadius: 5,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 15,
            }}
          >
            <div>
              <strong>Balance:</strong> ${simulation.balance.toFixed(2)}
            </div>
            <div>
              <strong>Total P&L:</strong>
              <span
                style={{
                  color: simulation.totalPnL >= 0 ? 'green' : 'red',
                  marginLeft: 5,
                }}
              >
                ${simulation.totalPnL.toFixed(2)}
              </span>
            </div>
            <div>
              <strong>Position:</strong> {simulation.position || 'None'}
            </div>
            <div>
              <strong>Trades:</strong> {totalTrades}
            </div>
            <div>
              <strong>Win Rate:</strong>{' '}
              {totalTrades > 0
                ? ((winTrades / totalTrades) * 100).toFixed(1)
                : 0}
              %
            </div>
            <div>
              <strong>Entry Price:</strong>{' '}
              {simulation.entryPrice ? simulation.entryPrice.toFixed(4) : 'N/A'}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Strategy Stats</h2>
        <div style={{ background: '#f0f0f0', padding: 15, borderRadius: 5 }}>
          <p>Total Return: {stats?.total_return?.toFixed(2) ?? '–'}x</p>
          <p>Avg PnL %: {stats?.avg_pnl_pct?.toFixed(2) ?? '–'}%</p>
          <p>
            Win Rate:{' '}
            {stats?.win_rate ? (stats.win_rate * 100).toFixed(1) : '–'}%
          </p>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Latest Signals (Newest First)</h2>
        <div
          style={{
            background: '#f0f0f0',
            padding: 15,
            borderRadius: 5,
            overflow: 'auto',
          }}
        >
          {signals.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Time (EST)</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Price</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 10).map((signal, index) => (
                  <tr key={index}>
                    <td style={{ padding: 8 }}>
                      {formatTimestamp(signal.timestamp)}
                    </td>
                    <td style={{ padding: 8 }}>{signal.USD_EUR?.toFixed(4)}</td>
                    <td
                      style={{
                        padding: 8,
                        color:
                          signal.Signal === 1
                            ? 'green'
                            : signal.Signal === -1
                            ? 'red'
                            : 'gray',
                        fontWeight: 'bold',
                      }}
                    >
                      {formatSignal(signal.Signal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            'No data'
          )}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Recent Prices (Newest First)</h2>
        <div
          style={{
            background: '#f0f0f0',
            padding: 15,
            borderRadius: 5,
            overflow: 'auto',
          }}
        >
          {data.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Time (EST)</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>
                    USD/EUR Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: 8 }}>
                      {formatTimestamp(item.timestamp)}
                    </td>
                    <td style={{ padding: 8 }}>{item.USD_EUR?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            'No data'
          )}
        </div>
      </section>

      {/* Recent Trades */}
      {simulation.trades.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2>Recent Trades</h2>
          <div
            style={{
              background: '#f0f0f0',
              padding: 15,
              borderRadius: 5,
              overflow: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Time</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Entry</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Exit</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Pips</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {simulation.trades
                  .slice(-10)
                  .reverse()
                  .map((trade, index) => (
                    <tr key={index}>
                      <td style={{ padding: 8 }}>
                        {formatTimestamp(trade.timestamp)}
                      </td>
                      <td style={{ padding: 8 }}>{trade.entry.toFixed(4)}</td>
                      <td style={{ padding: 8 }}>{trade.exit.toFixed(4)}</td>
                      <td style={{ padding: 8 }}>{trade.pips}</td>
                      <td
                        style={{
                          padding: 8,
                          color: trade.profit >= 0 ? 'green' : 'red',
                          fontWeight: 'bold',
                        }}
                      >
                        ${trade.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
