require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const translate = require('translate-google');
const app = express();
const fs = require('fs').promises;
const path = require('path');

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

// SEC EDGAR API configuration
const SEC_BASE_URL = 'https://www.sec.gov';
const EDGAR_SEARCH_URL = 'https://www.sec.gov/cgi-bin/browse-edgar';
const EDGAR_CIK_LOOKUP_URL = 'https://www.sec.gov/files/company_tickers.json';

// SEC headers configuration
const SEC_headers = {
  'User-Agent': 'Company-Research-Tool contact@company.com',
  'Accept-Encoding': 'gzip, deflate',
  'Host': 'www.sec.gov',
  'Accept': 'application/json, text/html, */*',
  'Connection': 'keep-alive'
};

// SEC API rate limiting configuration
const secRateLimiter = {
  requestsPerSecond: 0.1, // One request every 10 seconds
  lastRequestTime: 0,
  isBlocked: false,
  blockUntil: 0,
  consecutiveErrors: 0
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check and update SEC rate limit
async function checkSecRateLimit() {
  const now = Date.now();

  // If we're blocked, check if we can unblock
  if (secRateLimiter.isBlocked) {
    if (now < secRateLimiter.blockUntil) {
      const waitTime = Math.ceil((secRateLimiter.blockUntil - now) / 1000);
      throw new Error(`SEC API is blocked. Please wait ${waitTime} seconds.`);
    }
    console.log('SEC API block period ended, resuming requests...');
    secRateLimiter.isBlocked = false;
    secRateLimiter.consecutiveErrors = 0;
  }

  // Calculate required delay
  const timeSinceLastRequest = now - secRateLimiter.lastRequestTime;
  const minDelay = 1000 / secRateLimiter.requestsPerSecond;
  
  if (timeSinceLastRequest < minDelay) {
    const waitTime = minDelay - timeSinceLastRequest;
    console.log(`Waiting ${Math.ceil(waitTime / 1000)} seconds before next SEC request...`);
    await wait(waitTime);
  }

  secRateLimiter.lastRequestTime = Date.now();
}

// Helper function to handle SEC rate limit errors
function handleSecRateLimit(error) {
  if (error.response?.status === 429) {
    secRateLimiter.consecutiveErrors++;
    const blockTime = Math.min(Math.pow(2, secRateLimiter.consecutiveErrors) * 10 * 60 * 1000, 24 * 60 * 60 * 1000);
    secRateLimiter.isBlocked = true;
    secRateLimiter.blockUntil = Date.now() + blockTime;
    console.log(`SEC API rate limited. Blocking for ${Math.ceil(blockTime / 1000)} seconds.`);
    throw new Error('SEC rate limit exceeded. Please try again later.');
  }
  throw error;
}

// Helper function to make SEC API requests
async function makeSecRequest(url, options = {}) {
  await checkSecRateLimit();
  
  try {
    const response = await axios({
      url,
      ...options,
      headers: {
        ...SEC_headers,
        'Host': url.includes('data.sec.gov') ? 'data.sec.gov' : 'www.sec.gov'
      },
      timeout: 30000,
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });

    if (response.status === 404) {
      throw new Error(`Resource not found at ${url}`);
    }

    if (response.status !== 200) {
      throw new Error(`SEC request failed with status ${response.status}`);
    }
    
    // Reset consecutive errors on success
    secRateLimiter.consecutiveErrors = 0;
    return response;
  } catch (error) {
    console.error('SEC request error:', error.message);
    if (error.response?.status === 429) {
      return handleSecRateLimit(error);
    }
    throw error;
  }
}

// Helper function to get CIK from ticker
async function getCIK(ticker) {
  try {
    console.log(`Looking up CIK for ticker ${ticker}...`);
    const response = await makeSecRequest(EDGAR_CIK_LOOKUP_URL);
    
    // The response is an object with numeric keys
    const companies = Object.values(response.data);
    const tickerUpper = ticker.toUpperCase();
    
    const company = companies.find(c => c.ticker.toUpperCase() === tickerUpper);
    if (!company) {
      throw new Error(`No CIK found for ticker ${ticker}`);
    }

    // CIK needs to be padded with leading zeros to 10 digits
    const cik = company.cik_str.toString().padStart(10, '0');
    console.log(`Found CIK for ${ticker}: ${cik}`);
    return cik;
  } catch (error) {
    console.error('Error looking up CIK:', error);
    throw new Error(`Could not find CIK for ticker ${ticker}: ${error.message}`);
  }
}

// Helper function to fetch SEC filings
async function fetchSecFilings(ticker) {
  try {
    console.log(`Fetching SEC filings for ${ticker}...`);
    
    // First get the CIK
    const cik = await getCIK(ticker);
    console.log(`Using CIK: ${cik}`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 2);
    
    // Use the new SEC data endpoint
    const dataUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    console.log(`Fetching from ${dataUrl}`);
    
    const response = await makeSecRequest(dataUrl);
    
    if (response.status !== 200) {
      throw new Error(`SEC request failed with status ${response.status}`);
    }

    if (!response.data || !response.data.filings) {
      console.log('Response data:', JSON.stringify(response.data).substring(0, 1000));
      throw new Error('Invalid response format from SEC API');
    }

    const recentFilings = response.data.filings.recent;
    
    if (!recentFilings || !recentFilings.form) {
      throw new Error('No filings data in response');
    }

    console.log(`Found ${recentFilings.form.length} total filings`);

    // Filter and map the filings
    const filingUrls = [];
    for (let i = 0; i < recentFilings.form.length; i++) {
      const form = recentFilings.form[i];
      const date = recentFilings.filingDate[i];
      const accessionNumber = recentFilings.accessionNumber[i];
      const primaryDocument = recentFilings.primaryDocument[i];
      
      // Only include 10-K, 10-Q, and 8-K filings
      if (!['10-K', '10-Q', '8-K'].includes(form)) {
        console.log(`Skipping filing type: ${form}`);
        continue;
      }

      const filingDate = new Date(date);
      if (filingDate < startDate || filingDate > endDate) {
        console.log(`Skipping filing from ${date}: outside date range`);
        continue;
      }

      // Construct the document URL
      const accessionNumberNoDash = accessionNumber.replace(/-/g, '');
      const url = `/Archives/edgar/data/${cik}/${accessionNumberNoDash}/${primaryDocument}`;
      
      console.log(`Adding ${form} filing from ${date}`);
      filingUrls.push({
        type: form,
        date,
        url
      });
    }

    if (filingUrls.length === 0) {
      throw new Error(`No filings found for ${ticker} in the last 2 years`);
    }

    // Sort filings by date (most recent first)
    filingUrls.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Limit to most important filings
    const limitedFilings = [];
    const counts = { '10-K': 0, '10-Q': 0, '8-K': 0 };
    const limits = { '10-K': 1, '10-Q': 2, '8-K': 2 };
    
    for (const filing of filingUrls) {
      if (counts[filing.type] < limits[filing.type]) {
        limitedFilings.push(filing);
        counts[filing.type]++;
      }
      if (Object.values(counts).every((count, i) => count >= Object.values(limits)[i])) {
        break;
      }
    }

    console.log(`Successfully gathered ${limitedFilings.length} filing URLs for ${ticker}`);
    return limitedFilings;
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
    throw error;
  }
}

// Optimize content fetching with better HTML cleaning and size limits
async function fetchFilingContent(url) {
  try {
    console.log(`Fetching content from ${SEC_BASE_URL}${url}...`);
    
    if (!url) {
      throw new Error('Invalid filing URL');
    }

    const response = await makeSecRequest(`${SEC_BASE_URL}${url}`, {
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status === 404) {
      throw new Error(`Filing document not found at ${url}`);
    }

    if (response.status !== 200) {
      throw new Error(`Failed to fetch filing: HTTP ${response.status}`);
    }

    let text = response.data;
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid filing content received');
    }

    // Extract content between <TEXT> tags if present (common in SEC filings)
    const textMatch = text.match(/<TEXT>([\s\S]*?)<\/TEXT>/i);
    if (textMatch) {
      text = textMatch[1];
    }

    // Basic HTML cleaning
    text = text
      .replace(/<head>[\s\S]*?<\/head>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<(?!p|br)([^>]+)>/g, '\n') // Keep <p> and <br> tags, replace others with newline
      .replace(/<\/(p|br)>/g, '\n')        // Replace </p> and </br> with newline
      .replace(/<[^>]+>/g, '')             // Remove any remaining tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\n\s*\n/g, '\n')           // Remove multiple blank lines
      .replace(/\s+/g, ' ')
      .trim();

    // Extract sections using common SEC filing markers
    const sections = [];
    const sectionMarkers = [
      'ITEM 1. BUSINESS',
      'ITEM 1A. RISK FACTORS',
      'ITEM 2. MANAGEMENT',
      'ITEM 3. FINANCIAL',
      'ITEM 7. MANAGEMENT\'S DISCUSSION',
      'ITEM 7A. QUANTITATIVE AND QUALITATIVE DISCLOSURES'
    ];

    let currentSection = '';
    let currentContent = '';
    
    text.split('\n').forEach(line => {
      const upperLine = line.toUpperCase().trim();
      const matchedMarker = sectionMarkers.find(marker => upperLine.includes(marker));
      
      if (matchedMarker) {
        if (currentSection && currentContent) {
          sections.push({ title: currentSection, content: currentContent.trim() });
        }
        currentSection = matchedMarker;
        currentContent = line + '\n';
      } else if (currentSection) {
        currentContent += line + '\n';
      }
    });

    if (currentSection && currentContent) {
      sections.push({ title: currentSection, content: currentContent.trim() });
    }

    // If no sections found, try to find content between "ITEM" markers
    if (sections.length === 0) {
      const itemSections = text.split(/ITEM\s+\d+[A-Z]?\./i).filter(Boolean);
      if (itemSections.length > 0) {
        itemSections.forEach((section, index) => {
          sections.push({
            title: `ITEM ${index + 1}`,
            content: section.trim()
          });
        });
      }
    }

    // If still no sections, use the whole text
    if (sections.length === 0) {
      sections.push({
        title: 'FILING CONTENT',
        content: text.substring(0, 15000)
      });
    }

    // Format sections for analysis
    const formattedContent = sections
      .map(section => `### ${section.title} ###\n${section.content.substring(0, 5000)}`)
      .join('\n\n');

    console.log(`Extracted ${sections.length} sections from filing`);
    return formattedContent;
  } catch (error) {
    console.error('Error fetching filing content:', error);
    throw new Error(`Could not fetch filing content: ${error.message}`);
  }
}

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

// Add this helper function for cache management
function getCachedData(cache, key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

// Cache durations
const CACHE_DURATIONS = {
  STOCK: 30 * 1000, // 30 seconds for stock data
  NEWS: 5 * 60 * 1000 // 5 minutes for news
};

// Get stock data from Google Finance
app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    
    // Check cache first
    const cached = cache.stockData.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS.STOCK) {
      return res.json(cached.data);
    }

    // Try different exchange formats and variations
    const exchanges = [
      '', // No prefix
      'NYSE:', // NYSE direct
      'NYSEARCA:', // NYSE Arca
      'NYSEAMERICAN:', // NYSE American
      'NYSE-MKT:', // NYSE Market
      'NASDAQ:', // NASDAQ direct
      'NASDAQ-CM:', // NASDAQ Capital Market
      'NASDAQ-GM:', // NASDAQ Global Market
      'NASDAQ-GS:', // NASDAQ Global Select
      'OTCMKTS:', // OTC Markets
      'OTCBB:', // Over-the-counter Bulletin Board
      'PINK:', // Pink Sheets
      'BATS:', // BATS Exchange
    ];

    let stockData = null;
    let lastError = null;

    for (const exchange of exchanges) {
      try {
        console.log(`Trying ${exchange}${ticker}`);
        const response = await axios.get(`${GOOGLE_FINANCE_URL}/${exchange}${ticker}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
          },
          timeout: 8000,
          validateStatus: function (status) {
            return status < 500; // Accept any status less than 500
          }
        });

        if (response.status === 404) {
          continue;
        }

        const $ = require('cheerio').load(response.data);
        
        // Find the main price element with multiple possible selectors
        const priceSelectors = ['.YMlKec.fxKbKc', '.AHmHk', '.IsqQVc.NprOob'];
        let priceText;
        for (const selector of priceSelectors) {
          priceText = $(selector).first().text().trim();
          if (priceText) break;
        }
        
        if (!priceText) continue;
        
        const price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
        if (isNaN(price)) continue;

        // Find the company name with multiple possible selectors
        const nameSelectors = ['div[class="zzDege"]', 'h1[class="NydbP"]'];
        let companyName;
        for (const selector of nameSelectors) {
          companyName = $(selector).first().text().trim();
          if (companyName) break;
        }

        // Try different selectors for price changes
        const changeSelectors = ['.P2Luy', '.JwB6zf', '.qFiidc'];
        let changeText;
        for (const selector of changeSelectors) {
          changeText = $(selector).first().text().trim();
          if (changeText) break;
        }

        let change = 0;
        let changePercent = 0;
        let direction = 'up';

        if (changeText) {
          const matches = changeText.match(/([-+]?\d+\.?\d*)\s*\(([-+]?\d+\.?\d*)%\)/);
          if (matches) {
            change = parseFloat(matches[1]);
            changePercent = parseFloat(matches[2]);
            direction = change < 0 ? 'down' : 'up';
          }
        }

        // Extract market data from the table with multiple possible selectors
        const marketData = {};
        const dataSelectors = ['.gyFHrc', '.P6K39c'];
        for (const selector of dataSelectors) {
          $(selector).each((i, elem) => {
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
          if (Object.keys(marketData).length > 0) break;
        }

        stockData = {
          ticker,
          name: companyName || ticker,
          price,
          change,
          changePercent,
          direction,
          marketCap: marketData.marketCap || 'N/A',
          volume: marketData.volume || 'N/A',
          peRatio: marketData.peRatio || 'N/A',
          lastUpdate: new Date().toLocaleString(),
          exchange: exchange.replace(':', '') || 'Unknown'
        };

        break;
      } catch (error) {
        lastError = error;
        console.error(`Failed to fetch with ${exchange}:`, error.message);
        continue;
      }
    }

    if (!stockData) {
      throw new Error(lastError?.message || 'Stock not found on any exchange');
    }

    // Cache the result
    cache.stockData.set(ticker, {
      data: stockData,
      timestamp: Date.now()
    });

    res.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error.message);
    res.status(404).json({ 
      error: `Stock ${req.params.ticker} not found`,
      ticker: req.params.ticker.toUpperCase(),
      details: error.message
    });
  }
});

// Get stock news from Google News
app.get('/api/stock/:ticker/news', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    // Check cache first
    const cacheKey = `news_${ticker}`;
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS.NEWS) {
      return res.json(cached.data);
    }

    // Search Google News for the stock
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(ticker + ' stock')}&tbm=nws`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });

    const $ = require('cheerio').load(response.data);
    const news = [];

    // Find news articles
    $('.g').each((i, element) => {
      if (news.length >= 5) return false;

      const article = $(element);
      const titleElement = article.find('h3');
      const linkElement = article.find('a').first();
      const sourceElement = article.find('.CEMjEf');
      const timeElement = article.find('.LfVVr');
      const snippetElement = article.find('.VwiC3b');

      if (titleElement.length && linkElement.length) {
        const title = titleElement.text().trim();
        const link = linkElement.attr('href');
        const source = sourceElement.text().trim() || 'News Source';
        const pubDate = timeElement.text().trim() || new Date().toLocaleString();
        const description = snippetElement.text().trim() || title;

        news.push({
          title,
          link,
          source,
          pubDate,
          description
        });
      }
    });

    if (news.length === 0) {
      // Fallback to a basic market data response
      news.push({
        title: `Latest Market Data for ${ticker}`,
        link: `https://www.google.com/finance/quote/${ticker}`,
        source: 'Market Data',
        pubDate: new Date().toLocaleString(),
        description: `View the latest market data and trading information for ${ticker}.`
      });
    }

    // Cache the result
    newsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: news
    });

    res.json(news);
  } catch (error) {
    console.error('Error in news endpoint:', error);
    res.status(500).json([{
      title: `Latest Market Data for ${ticker}`,
      link: `https://www.google.com/finance/quote/${ticker}`,
      source: 'Market Data',
      pubDate: new Date().toLocaleString(),
      description: `View the latest market data and trading information for ${ticker}.`
    }]);
  }
});

// Optimize chunking strategy
function chunkText(filings) {
  const MAX_CHUNK_LENGTH = 4000; // Reduced from 6000
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  // Sort filings by importance
  const filingPriority = { '10-K': 0, '10-Q': 1, '8-K': 2 };
  filings.sort((a, b) => filingPriority[a.type] - filingPriority[b.type]);

  for (const filing of filings) {
    // Truncate individual filings if needed
    if (filing.content.length > MAX_CHUNK_LENGTH) {
      const partLength = Math.floor(MAX_CHUNK_LENGTH * 0.4);
      filing.content = filing.content.slice(0, partLength) + 
        '\n...[content summarized]...\n' + 
        filing.content.slice(-partLength);
    }

    // Start new chunk if current would exceed limit
    if (currentLength + filing.content.length > MAX_CHUNK_LENGTH) {
      if (currentChunk.length > 0) {
        chunks.push([...currentChunk]);
        currentChunk = [];
        currentLength = 0;
      }
    }

    currentChunk.push(filing);
    currentLength += filing.content.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Add this helper function for retry logic
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '30');
        const waitTime = retryAfter * 1000;
        console.log(`Rate limited. Waiting ${waitTime/1000} seconds before retry ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

// Modify the SEC analysis endpoint
app.post('/api/analyze/sec', async (req, res) => {
  const { ticker } = req.body;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    console.log(`Starting SEC analysis for ${ticker}...`);
    
    const filings = await fetchSecFilings(ticker);
    if (!filings || filings.length === 0) {
      throw new Error('No SEC filings found');
    }

    // Process filings sequentially with retry logic
    const analyzedFilings = [];
    for (const filing of filings) {
      const content = await fetchFilingContent(filing.url);
      
      const analysis = await retryWithBackoff(async () => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert financial analyst specializing in SEC filing analysis. Your task is to provide detailed insights in Hebrew, focusing on key financial metrics, business developments, and risk factors. Break down complex financial information into clear, actionable insights.

When analyzing filings:
1. Focus on material changes in financial position
2. Highlight significant business developments
3. Identify emerging risks and opportunities
4. Compare with previous periods
5. Note management's forward-looking statements
6. Evaluate the company's competitive position`
            },
            {
              role: "user",
              content: `Analyze this ${filing.type} filing and provide a comprehensive analysis in Hebrew. Structure your response in these sections:

1. תמצית מנהלים
- שינויים מהותיים עיקריים
- נקודות מפתח לתשומת לב המשקיעים

2. ניתוח פיננסי
- מגמות בהכנסות ורווחיות
- תזרים מזומנים ונזילות
- שינויים במאזן
- יחסים פיננסיים מרכזיים

3. התפתחויות עסקיות
- אסטרטגיה ומיקוד עסקי
- השקעות ורכישות
- שינויים בהנהלה
- התפתחויות בשוק

4. סיכונים והזדמנויות
- סיכונים חדשים או מתפתחים
- הזדמנויות צמיחה
- אתגרים תחרותיים
- סיכונים רגולטוריים

5. השוואה לתקופות קודמות
- שינויים משמעותיים
- מגמות ארוכות טווח
- התפתחות ביחסים פיננסיים

6. תחזית והערכה
- תחזיות החברה
- הערכת מצב כללית
- המלצות למשקיעים

Content to analyze:
${content}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2500,
          presence_penalty: 0.2,
          frequency_penalty: 0.3
        });
        return completion.choices[0].message.content;
      });

      analyzedFilings.push({
        type: filing.type,
        date: filing.date,
        analysis
      });

      // Add a small delay between filings to help prevent rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    res.json({
      ticker,
      filings: analyzedFilings
    });

  } catch (error) {
    console.error('Error in SEC analysis:', error);
    res.status(error.status || 500).json({ 
      error: 'Failed to analyze SEC filings',
      details: error.message 
    });
  }
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'iw' } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: 'Text is too long. Maximum length is 5000 characters.',
        code: 'TEXT_TOO_LONG'
      });
    }

    const translation = await translate(text, { to: 'iw' });
    if (!translation) {
      throw new Error('Empty translation result');
    }
    
    res.json({
      originalText: text,
      translatedText: translation,
      targetLanguage: 'iw'
    });
  } catch (error) {
    console.error('Translation error:', error);
    
    let statusCode = 500;
    let errorMessage = 'Translation failed';
    let errorCode = 'TRANSLATION_FAILED';

    if (error.message.includes('network')) {
      statusCode = 503;
      errorMessage = 'Translation service is temporarily unavailable';
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('rate')) {
      statusCode = 429;
      errorMessage = 'Too many translation requests. Please try again later';
      errorCode = 'RATE_LIMIT';
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      code: errorCode,
      message: error.message 
    });
  }
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('Error starting server:', error);
    return;
  }
  console.log(`Server is running on port ${PORT}`);
});