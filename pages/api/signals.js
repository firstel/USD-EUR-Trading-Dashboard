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

// Hybrid Signal Functions
function sma(data, period) {
  return data.map((_, i) =>
    i < period - 1
      ? null
      : data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  );
}

function stddev(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(
      slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period
    );
  });
}

function rsiDetailed(data, period) {
  let gains = [],
    losses = [],
    result = [];

  result.push(null); // First element can't have RSI

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));

    if (i >= period) {
      const avgGain =
        gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      result.push(null);
    }
  }
  return result;
}

function calculateHybridSignals(prices) {
  const SMA_PERIOD = 50;
  const RSI_PERIOD = 14;
  const BB_PERIOD = 20;
  const BB_MULTIPLIER = 2;

  const sma50 = sma(prices, SMA_PERIOD);
  const rsi14 = rsiDetailed(prices, RSI_PERIOD);
  const stddevBB = stddev(prices, BB_PERIOD);
  const bbSma = sma(prices, BB_PERIOD);
  const upperBB = bbSma.map((v, i) =>
    v !== null && stddevBB[i] !== null ? v + BB_MULTIPLIER * stddevBB[i] : null
  );
  const lowerBB = bbSma.map((v, i) =>
    v !== null && stddevBB[i] !== null ? v - BB_MULTIPLIER * stddevBB[i] : null
  );

  return prices.map((price, i) => {
    if (!sma50[i] || !rsi14[i] || !upperBB[i] || !lowerBB[i]) return 0;

    const inTrend = price > sma50[i];
    const inPullback = rsi14[i] < 40 && price < sma50[i];
    const overextended = price > upperBB[i] || price < lowerBB[i];

    if (inTrend && !overextended) return 1; // BUY
    if (!inTrend && overextended) return -1; // REVERT (SELL)
    return 0; // HOLD
  });
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

      case 'HYBRID':
        signals = calculateHybridSignals(prices);
        break;

      default:
        return res.status(400).json({ error: 'Unknown strategy' });
    }

    // Return last 30 data points with signals - NEWEST FIRST
    const result = timestamps
      .slice(-30)
      .map((timestamp, i) => ({
        timestamp,
        USD_EUR: prices[prices.length - 30 + i],
        Signal: signals[Math.min(i, signals.length - 1)] || 0,
      }))
      .reverse(); // Reverse to show newest first

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
