export default async function handler(req, res) {
  try {
    // Using Alpha Vantage free API for EUR/USD data
    const API_KEY = 'APN024VEBP97VVFM'; // Replace with actual key
    const symbol = 'EURUSD';

    const response = await fetch(
      `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=EUR&to_symbol=USD&interval=60min&apikey=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate data');
    }

    const data = await response.json();
    const timeSeries = data['Time Series FX (60min)'];

    if (!timeSeries) {
      // Fallback to mock data if API fails
      const mockData = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(
          Date.now() - (29 - i) * 60 * 60 * 1000
        ).toISOString(),
        USD_EUR: 0.92 + Math.random() * 0.02 - 0.01,
      }));
      return res.status(200).json(mockData);
    }

    // Convert EUR/USD to USD/EUR and format
    const result = Object.entries(timeSeries)
      .slice(0, 30)
      .map(([timestamp, values]) => ({
        timestamp,
        USD_EUR: 1 / parseFloat(values['4. close']),
      }))
      .reverse();

    res.status(200).json(result);
  } catch (error) {
    // Fallback to mock data on error
    const mockData = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 60 * 60 * 1000).toISOString(),
      USD_EUR: 0.92 + Math.random() * 0.02 - 0.01,
    }));

    res.status(200).json(mockData);
  }
}
