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
  useMediaQuery
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const AnalysisPage: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // API call will be implemented here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalysis('Sample analysis for ' + ticker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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
            SEC Filings Analysis
          </Typography>

          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 },
              mb: 4,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: 2,
              width: '100%',
              maxWidth: '600px'
            }}
          >
            <Box 
              component="form" 
              onSubmit={handleSubmit}
              sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: isMobile ? 'column' : 'row',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <TextField
                fullWidth={isMobile}
                label="Enter Stock Ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                variant="outlined"
                disabled={loading}
                size="small"
                sx={{ 
                  flexGrow: 1,
                  maxWidth: isMobile ? '100%' : '400px'
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!ticker || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                sx={{ 
                  minWidth: isMobile ? '100%' : '120px'
                }}
              >
                Analyze
              </Button>
            </Box>

            {error && (
              <Typography 
                color="error" 
                sx={{ 
                  mt: 2,
                  fontSize: '0.875rem',
                  textAlign: 'center'
                }}
              >
                {error}
              </Typography>
            )}
          </Paper>

          {analysis && (
            <Paper 
              sx={{ 
                p: { xs: 2, sm: 3 },
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 2,
                width: '100%'
              }}
            >
              <Typography variant="body1">
                {analysis}
              </Typography>
            </Paper>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default AnalysisPage; 