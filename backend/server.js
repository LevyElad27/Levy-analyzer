require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Yahoo Finance API configuration
const YAHOO_API_BASE = 'https://query1.finance.yahoo.com/v8/finance';
const YAHOO_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache'
};

// Helper function to format market cap
const formatMarketCap = (marketCap) => {
  if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(2)}M`;
  return marketCap.toString();
};

// Helper function to format volume
const formatVolume = (volume) => {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toString();
};

// Get stock data
app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const response = await axios.get(`${YAHOO_API_BASE}/quote`, {
      headers: YAHOO_API_HEADERS,
      params: {
        symbols: ticker
      }
    });

    const stockData = response.data.quoteResponse.result[0];
    if (!stockData) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({
      ticker: stockData.symbol,
      price: stockData.regularMarketPrice,
      change: stockData.regularMarketChange,
      changePercent: stockData.regularMarketChangePercent.toFixed(2),
      marketCap: formatMarketCap(stockData.marketCap),
      volume: formatVolume(stockData.regularMarketVolume),
      peRatio: stockData.forwardPE ? stockData.forwardPE.toFixed(2) : 'N/A'
    });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Get stock news
app.get('/api/stock/:ticker/news', async (req, res) => {
  try {
    const { ticker } = req.params;
    const response = await axios.get(`${YAHOO_API_BASE}/news`, {
      headers: YAHOO_API_HEADERS,
      params: {
        symbol: ticker,
        count: 5
      }
    });

    const news = response.data.data.stream.map(item => ({
      title: item.title,
      link: item.url,
      pubDate: new Date(item.pubDate).toISOString()
    }));

    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get SEC filings analysis
app.get('/api/sec/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    // This is where you'll integrate with OpenAI for SEC filings analysis
    // For now, return a placeholder response
    res.json({
      analysis: `Sample SEC analysis for ${ticker}. Integration with OpenAI API pending.`
    });
  } catch (error) {
    console.error('Error analyzing SEC filings:', error);
    res.status(500).json({ error: 'Failed to analyze SEC filings' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 