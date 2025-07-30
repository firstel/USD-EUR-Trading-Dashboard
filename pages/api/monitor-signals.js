// Strategy performance calculation and monitoring
async function getStrategyPerformance(strategy) {
  try {
    const response = await fetch(
      `${
        process.env.VERCEL_URL || 'http://localhost:3000'
      }/api/trades?strategy=${strategy}`
    );
    const data = await response.json();
    return data.stats?.total_return || 1;
  } catch (error) {
    console.error(`Error getting ${strategy} performance:`, error);
    return 1;
  }
}

async function getSignalData(strategy) {
  try {
    const response = await fetch(
      `${
        process.env.VERCEL_URL || 'http://localhost:3000'
      }/api/signals?strategy=${strategy}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting ${strategy} signals:`, error);
    return [];
  }
}

async function findBestStrategy() {
  const strategies = ['MACD', 'RSI', 'MA'];
  const performances = {};

  for (const strategy of strategies) {
    performances[strategy] = await getStrategyPerformance(strategy);
  }

  // Find strategy with highest return
  const bestStrategy = Object.keys(performances).reduce((a, b) =>
    performances[a] > performances[b] ? a : b
  );

  return { bestStrategy, performances };
}

async function sendSignalAlert(strategy, signalData, latestSignal) {
  const latestPrice = signalData[signalData.length - 1]?.USD_EUR;

  try {
    const emailResponse = await fetch(
      `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/send-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'szerby@gmail.com',
          subject: `Trading Signal Alert - ${strategy} ${
            latestSignal === 1 ? 'BUY' : 'SELL'
          }`,
          strategy: strategy,
          price: latestPrice?.toFixed(4),
          signal: latestSignal,
        }),
      }
    );

    return emailResponse.ok;
  } catch (error) {
    console.error('Failed to send email alert:', error);
    return false;
  }
}

export default async function handler(req, res) {
  try {
    // Find best performing strategy
    const { bestStrategy, performances } = await findBestStrategy();

    // Get current signals for best strategy
    const signalData = await getSignalData(bestStrategy);

    if (!signalData || signalData.length === 0) {
      return res.status(200).json({
        message: 'No signal data available',
        bestStrategy,
        performances,
      });
    }

    // Get latest signal
    const latestSignal = signalData[signalData.length - 1]?.Signal;
    const previousSignal = signalData[signalData.length - 2]?.Signal;

    // Check if signal changed (new buy/sell signal)
    const signalChanged = latestSignal !== previousSignal && latestSignal !== 0;

    let emailSent = false;
    if (signalChanged) {
      emailSent = await sendSignalAlert(bestStrategy, signalData, latestSignal);
    }

    res.status(200).json({
      bestStrategy,
      performances,
      latestSignal,
      previousSignal,
      signalChanged,
      emailSent,
      timestamp: new Date().toISOString(),
      monitoringActive: true,
    });
  } catch (error) {
    console.error('Monitor error:', error);
    res.status(500).json({
      error: 'Monitoring failed',
      details: error.message,
    });
  }
}
