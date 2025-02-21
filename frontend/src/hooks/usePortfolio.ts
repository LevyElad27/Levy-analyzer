import { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config';

interface Stock {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down';
  marketCap: string;
  volume: string;
  peRatio: string;
  lastUpdate: string;
  news?: Array<{
    title: string;
    link: string;
    source: string;
    pubDate: string;
    description: string;
  }>;
}

export const usePortfolio = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved stocks from localStorage
  useEffect(() => {
    const savedStocks = localStorage.getItem('portfolio');
    if (savedStocks) {
      setStocks(JSON.parse(savedStocks));
    }
  }, []);

  // Save stocks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(stocks));
  }, [stocks]);

  const addStock = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${BASE_URL}/stock/${ticker}`);
      let newsData = [];
      
      try {
        const newsResponse = await axios.get(`${BASE_URL}/stock/${ticker}/news`);
        newsData = newsResponse.data;
      } catch (newsError) {
        console.warn('Failed to fetch news:', newsError);
        // Continue without news data
      }
      
      const stockData = {
        ...response.data,
        news: newsData
      };

      if (stocks.some(s => s.ticker === stockData.ticker)) {
        setError('Stock already exists in portfolio');
        setLoading(false);
        return;
      }

      setStocks(prev => [...prev, stockData]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const removeStock = (ticker: string) => {
    setStocks(prev => prev.filter(stock => stock.ticker !== ticker));
  };

  const updateStockData = async () => {
    setLoading(true);
    try {
      const updatedStocks = await Promise.all(
        stocks.map(async (stock) => {
          const stockResponse = await axios.get(`${BASE_URL}/stock/${stock.ticker}`);
          let newsData = [];
          
          try {
            const newsResponse = await axios.get(`${BASE_URL}/stock/${stock.ticker}/news`);
            newsData = newsResponse.data;
          } catch (newsError) {
            if (axios.isAxiosError(newsError)) {
              console.error('News API Error:', {
                status: newsError.response?.status,
                statusText: newsError.response?.statusText,
                data: newsError.response?.data,
                headers: newsError.response?.headers
              });
            }
            // Keep existing news if available
            newsData = stock.news || [];
          }
          
          return {
            ...stockResponse.data,
            news: newsData
          };
        })
      );
      setStocks(updatedStocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stocks');
    } finally {
      setLoading(false);
    }
  };

  // Auto-update stocks every minute
  useEffect(() => {
    if (stocks.length > 0) {
      const interval = setInterval(updateStockData, 60000);
      return () => clearInterval(interval);
    }
  }, [stocks.length]);

  return {
    stocks,
    loading,
    error,
    addStock,
    removeStock
  };
}; 