require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Google Finance API configuration
const GOOGLE_FINANCE_URL = 'https://www.google.com/finance/quote';

// Yahoo Finance API configuration (for news only)
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2/everything';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
};

// Cache for stock data and news
const cache = {
  stockData: new Map(),
  newsData: new Map()
};

const CACHE_DURATION = 60000; // 1 minute cache

// Add cache for news
const newsCache = new Map();
const NEWS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to format market cap and volume
const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toString();
};

// Helper function to get cached data
const getCachedData = (cache, key) => {
  const cachedData = cache.get(key);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }
  return null;
};

// News fetching function
async function fetchNewsWithCache(ticker) {
  const cacheKey = `news_${ticker}`;
  const cached = newsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < NEWS_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(NEWS_API_BASE_URL, {
      params: {
        q: `${ticker} stock market`,
        apiKey: process.env.NEWS_API_KEY,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 5
      },
      headers: {
        'X-Api-Key': process.env.NEWS_API_KEY
      }
    });

    if (!response.data?.articles) {
      throw new Error('Invalid response from News API');
    }

    const news = response.data.articles.map(article => ({
      title: article.title,
      link: article.url,
      source: article.source.name,
      pubDate: new Date(article.publishedAt).toLocaleString(),
      description: article.description
    }));

    newsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: news
    });

    return news;
  } catch (error) {
    if (error.response?.status === 429) {
      if (cached) {
        return cached.data;
      }
      return [{
        title: "News temporarily unavailable (API rate limit reached)",
        link: "#",
        source: "System Message",
        pubDate: new Date().toLocaleString(),
        description: "Please try again later. News API rate limit has been reached."
      }];
    }
    throw error;
  }
}

// Get stock data from Google Finance
app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const tickerMap = {
      'meta': 'META',
      'facebook': 'META',
      'google': 'GOOGL',
      'alphabet': 'GOOGL',
      'amazon': 'AMZN',
      'apple': 'AAPL',
      'microsoft': 'MSFT'
    };

    const actualTicker = tickerMap[ticker.toLowerCase()] || ticker.toUpperCase();
    
    // Check cache first
    const cachedData = getCachedData(cache.stockData, actualTicker);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Try different exchanges in order
    const exchanges = ['NASDAQ', 'NYSE', 'NYSEARCA', 'BATS'];
    let stockData = null;
    let error = null;

    for (const exchange of exchanges) {
      try {
        const response = await axios.get(`${GOOGLE_FINANCE_URL}/${actualTicker}:${exchange}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 5000
        });

        const $ = require('cheerio').load(response.data);
        
        // Debug: Log the HTML structure around price elements
        console.log('HTML structure:', $('.YMlKec.fxKbKc').parent().html());
        
        // Find the main price element
        const priceText = $('.YMlKec.fxKbKc').first().text().trim();
        if (!priceText) continue;
        
        const price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
        if (isNaN(price)) continue;

        // Find the company name
        const companyName = $('div[class="zzDege"]').first().text().trim();

        // Try different selectors for price changes
        const priceChangeElement = $('.P2Luy').first();
        const changeText = priceChangeElement.text().trim();
        console.log('Price change element found:', changeText);

        let change = 0;
        let changePercent = 0;
        let direction = 'up';

        if (changeText) {
            // Example format: "+25.19 (+1.23%)" or "-25.19 (-1.23%)"
            const matches = changeText.match(/([-+]?\d+\.?\d*)\s*\(([-+]?\d+\.?\d*)%\)/);
            console.log('Regex matches:', matches);
            
            if (matches) {
                change = parseFloat(matches[1]);
                changePercent = parseFloat(matches[2]);
                direction = change < 0 ? 'down' : 'up';
                console.log('Parsed values:', { change, changePercent, direction });
            }
        }

        // Extract market data from the table
        const marketData = {};
        $('.gyFHrc').each((i, elem) => {
          const label = $(elem).find('.mfs7Fc').text().trim();
          const value = $(elem).find('.P6K39c').text().trim();
          
          if (label.includes('Market cap')) {
            marketData.marketCap = value;
          } else if (label.includes('P/E ratio')) {
            marketData.peRatio = value;
          } else if (label.includes('Volume')) {
            marketData.volume = value;
          }
        });

        stockData = {
          ticker: actualTicker,
          name: companyName || actualTicker,
          price,
          change,
          changePercent,
          direction,
          marketCap: marketData.marketCap || 'N/A',
          volume: marketData.volume || 'N/A',
          peRatio: marketData.peRatio || 'N/A',
          lastUpdate: new Date().toLocaleString()
        };

        break;
      } catch (e) {
        error = e;
        continue;
      }
    }

    if (!stockData) {
      throw error || new Error('Failed to fetch stock data from any exchange');
    }

    // Cache the result
    cache.stockData.set(actualTicker, {
      data: stockData,
      timestamp: Date.now()
    });

    res.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error.message);
    const errorMessage = error.response?.status === 404 
      ? `Stock ${req.params.ticker} not found`
      : 'Failed to fetch stock data: ' + error.message;
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// Get stock news from Yahoo Finance
app.get('/api/stock/:ticker/news', async (req, res) => {
  try {
    const { ticker } = req.params;
    const news = await fetchNewsWithCache(ticker);
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching news',
      message: error.message
    });
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