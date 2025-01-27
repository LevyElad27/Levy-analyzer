import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { 
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

interface Filing {
  type: string;
  date: string;
  url: string;
}

interface AnalysisResponse {
  ticker: string;
  yearsAnalyzed: number;
  filings: Filing[];
  template: string;
}

interface ChatGPTAnalysis {
  ticker: string;
  analysis: string;
}

interface BasicAnalysis {
  ticker: string;
  overview: string;
}

interface SECAnalysis {
  ticker: string;
  filings: {
    type: string;
    date: string;
    analysis: string;
  }[];
}

const AnalysisPage: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basicAnalysis, setBasicAnalysis] = useState<BasicAnalysis | null>(null);
  const [secAnalysis, setSecAnalysis] = useState<SECAnalysis | null>(null);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'basic' | 'sec'>('idle');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleBasicAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setBasicAnalysis(null);
    setSecAnalysis(null);
    setAnalysisStep('basic');

    try {
      const response = await fetch('http://localhost:3002/api/analyze/basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json();
      setBasicAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setAnalysisStep('idle');
    }
  };

  const handleSECAnalysis = async () => {
    if (!basicAnalysis) return;

    setLoading(true);
    setError(null);
    setAnalysisStep('sec');

    try {
      const response = await fetch('http://localhost:3002/api/analyze/sec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'SEC Analysis failed');
      }

      const data = await response.json();
      setSecAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setAnalysisStep('idle');
    }
  };

  const renderAnalysisSection = (title: string, content: string) => {
    return (
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">{title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography 
            variant="body2" 
            component="div" 
            sx={{ 
              whiteSpace: 'pre-line',
              direction: 'rtl',
              textAlign: 'right'
            }}
          >
            {content}
          </Typography>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box sx={{ 
      width: '100vw',
      minHeight: '100%',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <Container 
        maxWidth={false}
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px !important',
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Box sx={{ 
          width: '100%', 
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              mb: 3,
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              textAlign: 'center'
            }}
          >
            Company Analysis
          </Typography>

          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 },
              mb: 4,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: 2,
              width: '100%'
            }}
          >
            <Box 
              component="form" 
              onSubmit={handleBasicAnalysis}
              sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: isMobile ? 'column' : 'row',
                width: '100%',
                alignItems: 'flex-start'
              }}
            >
              <TextField
                fullWidth
                label="Enter Stock Symbol"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                variant="outlined"
                disabled={loading}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!ticker || loading}
                startIcon={loading && analysisStep === 'basic' ? <CircularProgress size={20} /> : <SearchIcon />}
                size="small"
                sx={{ height: '40px', minWidth: 'fit-content' }}
              >
                Analyze Company
              </Button>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ mt: 2 }}
              >
                {error}
              </Alert>
            )}
          </Paper>

          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                {analysisStep === 'basic' ? 'מנתח מידע בסיסי על החברה...' : 'מנתח דוחות SEC...'}
              </Typography>
            </Box>
          )}

          {basicAnalysis && (
            <Paper 
              sx={{ 
                width: '100%',
                p: { xs: 2, sm: 3 },
                mb: 3,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">Basic Analysis for {basicAnalysis.ticker}</Typography>
                {!secAnalysis && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSECAnalysis}
                    disabled={loading}
                    startIcon={loading && analysisStep === 'sec' ? <CircularProgress size={20} /> : <DescriptionIcon />}
                  >
                    Analyze SEC Filings
                  </Button>
                )}
              </Box>
              
              {basicAnalysis.overview.split('\n\n').map((section, index) => {
                const [title, ...content] = section.split('\n');
                return renderAnalysisSection(
                  title.replace(/^\d+\.\s*/, ''),
                  content.join('\n')
                );
              })}
            </Paper>
          )}

          {secAnalysis && (
            <Paper 
              sx={{ 
                width: '100%',
                p: { xs: 2, sm: 3 },
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h5" sx={{ mb: 3 }}>SEC Filings Analysis</Typography>
              
              {secAnalysis.filings.map((filing) => (
                <Accordion key={`${filing.type}-${filing.date}`}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{filing.type} - {filing.date}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography 
                      variant="body2" 
                      component="div" 
                      sx={{ 
                        whiteSpace: 'pre-line',
                        direction: 'rtl',
                        textAlign: 'right'
                      }}
                    >
                      {filing.analysis}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default AnalysisPage; 