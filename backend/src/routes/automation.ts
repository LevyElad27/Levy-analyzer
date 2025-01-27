import { Router, Request, Response, RequestHandler } from 'express';
import { automator } from '../services/webAutomation';

const router = Router();

interface AnalyzeCompanyRequest {
  ticker: string;
  template: string;
  urls: string[];
}

const analyzeCompanyHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { ticker, template, urls } = req.body as AnalyzeCompanyRequest;

    // Validate required fields
    if (!ticker || !template || !urls || !Array.isArray(urls)) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'ticker, template, and urls array are required',
        type: 'VALIDATION_ERROR'
      });
      return;
    }

    // Initialize ChatGPT session
    await automator.loginToChatGPT();

    // Analyze SEC filings
    const analysis = await automator.analyzeSECFilings(template, urls);

    // Return the analysis
    res.json({
      ticker,
      analysis,
      type: 'ANALYSIS_SUCCESS'
    });
  } catch (error: any) {
    console.error('Company analysis error:', error);
    res.status(500).json({
      error: 'Company analysis failed',
      message: error.message,
      type: 'ANALYSIS_ERROR'
    });
  }
};

// Mount the handler
router.post('/analyze-company', analyzeCompanyHandler);

export default router; 