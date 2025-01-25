import axios from 'axios';

const BASE_URL = 'http://localhost:3002/api';

export interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: string;
  marketCap: string;
  volume: string;
  peRatio: string;
  news?: {
    title: string;
    link: string;
    pubDate: string;
  }[];
  lastUpdate: string;
}

class StockService {
  async getStockData(ticker: string): Promise<StockData> {
    try {
      const response = await axios.get(`${BASE_URL}/stock/${ticker}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Stock ${ticker} not found`);
      }
      throw new Error('Failed to fetch stock data');
    }
  }

  async getStockNews(ticker: string) {
    try {
      const response = await axios.get(`${BASE_URL}/stock/${ticker}/news`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return [];
    }
  }

  async getSecAnalysis(ticker: string): Promise<string> {
    try {
      const response = await axios.get(`${BASE_URL}/sec/${ticker}`);
      return response.data.analysis;
    } catch (error) {
      console.error('Error fetching SEC analysis:', error);
      throw new Error('Failed to fetch SEC analysis');
    }
  }
}

export const stockService = new StockService(); 