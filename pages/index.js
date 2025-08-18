import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState([]);
  const [signals, setSignals] = useState({});
  const [stats, setStats] = useState({});
  const [strategy, setStrategy] = useState('MACD');
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [allSimulations, setAllSimulations] = useState({
    MACD: {
      balance: 10000,
      trades: [],
      totalPnL: 0,
      position: null,
      entryPrice: null,
    },
    RSI: {
      balance: 10000,
      trades: [],
      totalPnL: 0,
      position: null,
      entryPrice: null,
    },
    MA: {
      balance: 10000,
      trades: [],
      totalPnL: 0,
      position: null,
      entryPrice: null,
    },
    HYBRID: {
      balance: 10000,
      trades: [],
      totalPnL: 0,
      position: null,
      entryPrice: null,
    },
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

  // Process trading simulation for a specific strategy
  const processSimulation = (signalsData, strategyName) => {
    let simulation = {
      balance: 10000,
      position: null,
      entryPrice: null,
      trades: [],
      totalPnL: 0,
    };

    if (!signalsData || signalsData.length === 0) return simulation;

    // Process signals chronologically (reverse order since newest first)
    const chronologicalSignals = [...signalsData].reverse();

    chronologicalSignals.forEach((item) => {
      const signal = item.Signal;
      const price = item.USD_EUR;
      const timestamp = item.timestamp;

      // Buy signal and no position
      if (signal === 1 && !simulation.position) {
        simulation.position = 'LONG';
        simulation.entryPrice = price;
      }
      // Sell signal and have long position
      else if (signal === -1 && simulation.position === 'LONG') {
        const pips = calculatePips(simulation.entryPrice, price);
        const profit = pips * 1; // $1 per pip for simulation

        simulation.trades.push({
          entry: simulation.entryPrice,
          exit: price,
          pips: pips,
          profit: profit,
          timestamp: timestamp,
          strategy: strategyName,
        });

        simulation.balance += profit;
        simulation.totalPnL += profit;
        simulation.position = null;
        simulation.entryPrice = null;
      }
    });

    return simulation;
  };

  // Fetch data for all strategies
  const fetchAllStrategies = async () => {
    const strategies = ['MACD', 'RSI', 'MA', 'HYBRID'];
    const newSignals = {};
    const newStats = {};
    const newSimulations = {};

    try {
      // Fetch data (same for all strategies)
      const resData = await fetch('/api/data');
      const jsonData = await resData.json();
      setData(Array.isArray(jsonData) ? jsonData : []);

      // Fetch signals and stats for each strategy
      for (const strat of strategies) {
        try {
          const resSignals = await fetch(`/api/signals?strategy=${strat}`);
          const jsonSignals = await resSignals.json();
          newSignals[strat] = Array.isArray(jsonSignals) ? jsonSignals : [];

          const resStats = await fetch(`/api/trades?strategy=${strat}`);
          const jsonStats = await resStats.json();
          newStats[strat] = jsonStats.stats || {};

          // Process simulation for this strategy
          newSimulations[strat] = processSimulation(newSignals[strat], strat);
        } catch (err) {
          console.error(`Error fetching ${strat}:`, err);
          newSignals[strat] = [];
          newStats[strat] = {};
          newSimulations[strat] = {
            balance: 10000,
            trades: [],
            totalPnL: 0,
            position: null,
            entryPrice: null,
          };
        }
      }

      setSignals(newSignals);
      setStats(newStats);
      setAllSimulations(newSimulations);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('API fetch failed:', err);
      setError('Failed to load data from backend.');
    }
  };

  useEffect(() => {
    fetchAllStrategies();
  }, []);

  const currentSignals = signals[strategy] || [];
  const currentStats = stats[strategy] || {};

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

      {/* All Strategies Trading Simulation Comparison */}
      <section style={{ marginTop: 20 }}>
        <h2>Trading Simulation - All Strategies Comparison</h2>
        <div
          style={{
            background: '#f8f9fa',
            padding: 15,
            borderRadius: 5,
            marginBottom: 10,
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '800px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Strategy
                </th>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Balance
                </th>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Total P&L
                </th>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Position
                </th>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Trades
                </th>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Win Rate
                </th>
                <th
                  style={{ padding: 10, textAlign: 'left', fontWeight: 'bold' }}
                >
                  Entry Price
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allSimulations).map(([stratName, sim]) => {
                const winTrades = sim.trades.filter((t) => t.profit > 0).length;
                const totalTrades = sim.trades.length;
                const winRate =
                  totalTrades > 0
                    ? ((winTrades / totalTrades) * 100).toFixed(1)
                    : '0';

                return (
                  <tr
                    key={stratName}
                    style={{
                      borderBottom: '1px solid #eee',
                      backgroundColor:
                        stratName === strategy ? '#e3f2fd' : 'transparent',
                    }}
                  >
                    <td
                      style={{
                        padding: 10,
                        fontWeight: stratName === strategy ? 'bold' : 'normal',
                      }}
                    >
                      {stratName}
                    </td>
                    <td style={{ padding: 10 }}>${sim.balance.toFixed(2)}</td>
                    <td
                      style={{
                        padding: 10,
                        color: sim.totalPnL >= 0 ? 'green' : 'red',
                        fontWeight: 'bold',
                      }}
                    >
                      ${sim.totalPnL.toFixed(2)}
                    </td>
                    <td style={{ padding: 10 }}>{sim.position || 'None'}</td>
                    <td style={{ padding: 10 }}>{totalTrades}</td>
                    <td style={{ padding: 10 }}>{winRate}%</td>
                    <td style={{ padding: 10 }}>
                      {sim.entryPrice ? sim.entryPrice.toFixed(4) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Strategy Stats - {strategy}</h2>
        <div style={{ background: '#f0f0f0', padding: 15, borderRadius: 5 }}>
          <p>Total Return: {currentStats?.total_return?.toFixed(2) ?? '–'}x</p>
          <p>Avg PnL %: {currentStats?.avg_pnl_pct?.toFixed(2) ?? '–'}%</p>
          <p>
            Win Rate:{' '}
            {currentStats?.win_rate
              ? (currentStats.win_rate * 100).toFixed(1)
              : '–'}
            %
          </p>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Latest Signals - {strategy} (Newest First)</h2>
        <div
          style={{
            background: '#f0f0f0',
            padding: 15,
            borderRadius: 5,
            overflow: 'auto',
          }}
        >
          {currentSignals.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Time (EST)</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Price</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {currentSignals.slice(0, 10).map((signal, index) => (
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

      {/* Recent Trades for Selected Strategy */}
      {allSimulations[strategy]?.trades.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2>Recent Trades - {strategy}</h2>
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
                {allSimulations[strategy].trades
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
