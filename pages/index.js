import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState([]);
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState(null);
  const [strategy, setStrategy] = useState('MACD');
  const [error, setError] = useState(null);

  // Convert UTC to GMT-5 (EST)
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const est = new Date(date.getTime() - 5 * 60 * 60 * 1000); // GMT-5
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

  return (
    <main style={{ padding: 20 }}>
      <h1>USD/EUR Trading Dashboard</h1>

      <label>
        Select Strategy:{' '}
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value='MACD'>MACD</option>
          <option value='RSI'>RSI</option>
          <option value='MA'>Moving Avg Cross</option>
        </select>
      </label>

      {error && (
        <div style={{ color: 'red', marginTop: 10 }}>
          <strong>{error}</strong>
        </div>
      )}

      <section style={{ marginTop: 20 }}>
        <h2>Stats</h2>
        <p>Total Return: {stats?.total_return?.toFixed(2) ?? '–'}x</p>
        <p>Avg PnL %: {stats?.avg_pnl_pct?.toFixed(2) ?? '–'}%</p>
        <p>
          Win Rate: {stats?.win_rate ? (stats.win_rate * 100).toFixed(1) : '–'}%
        </p>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Latest Signals</h2>
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
                {signals.slice(-10).map((signal, index) => (
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
        <h2>Recent Prices</h2>
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
                {data.slice(-10).map((item, index) => (
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
    </main>
  );
}
