// Technical Analysis Functions
function calculateRSI(prices, period = 14) {
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    let ema = data[0];
    const result = [ema];

    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      result.push(ema);
    }
    return result;
  };

  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const macdLine = emaFast.map((val, i) => val - emaSlow[i]);
  const signalLine = ema(macdLine, signal);

  return { macdLine, signalLine };
}

function calculateMA(prices, period) {
  const result = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
    result.push(sum / period);
  }
  return result;
}

export default async function handler(req, res) {
  try {
    const { strategy = 'MACD' } = req.query;

    // Get USD/EUR data first
    const API_KEY = 'APN024VEBP97VVFM';
    const response = await fetch(
      `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=EUR&to_symbol=USD&interval=60min&apikey=${API_KEY}`
    );

    let prices, timestamps;

    if (response.ok) {
      const data = await response.json();
      const timeSeries = data['Time Series FX (60min)'];

      if (timeSeries) {
        const entries = Object.entries(timeSeries).slice(0, 100).reverse();
        timestamps = entries.map(([ts]) => ts);
        prices = entries.map(
          ([, values]) => 1 / parseFloat(values['4. close'])
        );
      }
    }

    // Fallback to mock data
    if (!prices) {
      timestamps = Array.from({ length: 100 }, (_, i) =>
        new Date(Date.now() - (99 - i) * 60 * 60 * 1000).toISOString()
      );
      prices = Array.from(
        { length: 100 },
        (_, i) => 0.92 + Math.sin(i / 10) * 0.01 + Math.random() * 0.005
      );
    }

    let signals;

    switch (strategy.toUpperCase()) {
      case 'RSI':
        const rsiValues = prices
          .slice(14)
          .map((_, i) => calculateRSI(prices.slice(0, i + 15)));
        signals = rsiValues.map((rsi) => (rsi < 30 ? 1 : rsi > 70 ? -1 : 0));
        break;

      case 'MACD':
        const { macdLine, signalLine } = calculateMACD(prices);
        signals = macdLine
          .slice(26)
          .map((macd, i) => (macd > signalLine[i + 26] ? 1 : -1));
        break;

      case 'MA':
        const ma5 = calculateMA(prices, 5);
        const ma20 = calculateMA(prices, 20);
        signals = ma5.slice(15).map((ma5Val, i) => (ma5Val > ma20[i] ? 1 : -1));
        break;

      default:
        return res.status(400).json({ error: 'Unknown strategy' });
    }

    // Return last 30 data points with signals
    const result = timestamps.slice(-30).map((timestamp, i) => ({
      timestamp,
      USD_EUR: prices[prices.length - 30 + i],
      Signal: signals[Math.min(i, signals.length - 1)] || 0,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
