import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  useTheme,
  useMediaQuery,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import {
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Newspaper as NewsIcon
} from '@mui/icons-material';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
}

interface Stock {
  ticker: string;
  price?: number;
  change?: number;
  changePercent?: string;
  marketCap?: string;
  volume?: string;
  peRatio?: string;
  news?: NewsItem[];
  lastUpdate?: string;
}

const PortfolioPage: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNews, setExpandedNews] = useState<string[]>([]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleToggleNews = (ticker: string) => {
    setExpandedNews(prev => 
      prev.includes(ticker) 
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker) return;

    setLoading(true);
    setError(null);

    try {
      const newStock: Stock = { 
        ticker: newTicker.toUpperCase(),
        price: 150.25,
        change: 2.5,
        changePercent: '1.67',
        marketCap: '2.5T',
        volume: '52.3M',
        peRatio: '25.6',
        news: [
          { title: 'Sample News 1', link: '#', pubDate: '2024-02-20' },
          { title: 'Sample News 2', link: '#', pubDate: '2024-02-19' },
        ],
        lastUpdate: new Date().toLocaleTimeString()
      };
      setStocks(prev => [...prev, newStock]);
      setNewTicker('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStock = (ticker: string) => {
    setStocks(prev => prev.filter(stock => stock.ticker !== ticker));
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
            Portfolio Dashboard
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
              onSubmit={handleAddStock}
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
                label="Add Stock to Portfolio"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                placeholder="Enter ticker symbol"
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
                disabled={!newTicker || loading}
                startIcon={<AddIcon />}
                sx={{ 
                  minWidth: isMobile ? '100%' : '120px'
                }}
              >
                Add Stock
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

          <Box sx={{ 
            width: '100%', 
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Grid 
              container 
              spacing={3} 
              sx={{ 
                width: '100%',
                margin: 0 
              }}
            >
              {stocks.map((stock) => (
                <Grid 
                  item 
                  xs={12} 
                  key={stock.ticker}
                  sx={{ 
                    width: '100%',
                    padding: '12px'
                  }}
                >
                  <Card 
                    sx={{ 
                      width: '100%',
                      height: { xs: '400px', sm: '360px' },
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)'
                      }
                    }}
                  >
                    <CardContent 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        p: { xs: 2, sm: 3 },
                        '&:last-child': { pb: '16px' }
                      }}
                    >
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {stock.ticker}
                        </Typography>
                        {stock.price && (
                          <Typography variant="h5" sx={{ fontWeight: 700, my: 1 }}>
                            ${stock.price.toFixed(2)}
                          </Typography>
                        )}
                        {stock.change && stock.changePercent && (
                          <Chip
                            icon={stock.change >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={`${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent}%)`}
                            color={stock.change >= 0 ? 'success' : 'error'}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {stock.marketCap && (
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Market Cap</Typography>
                            <Typography variant="body2">{stock.marketCap}</Typography>
                          </Grid>
                        )}
                        {stock.volume && (
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Volume</Typography>
                            <Typography variant="body2">{stock.volume}</Typography>
                          </Grid>
                        )}
                        {stock.peRatio && (
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">P/E Ratio</Typography>
                            <Typography variant="body2">{stock.peRatio}</Typography>
                          </Grid>
                        )}
                      </Grid>

                      <Divider />

                      <Box sx={{ 
                        py: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flexGrow: 1
                      }}>
                        <Button
                          startIcon={<NewsIcon />}
                          endIcon={expandedNews.includes(stock.ticker) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          onClick={() => handleToggleNews(stock.ticker)}
                          sx={{ width: '200px', mb: 1 }}
                        >
                          News
                        </Button>
                        <Box sx={{ 
                          width: '100%',
                          maxWidth: '500px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          overflow: 'auto',
                          maxHeight: expandedNews.includes(stock.ticker) ? '120px' : '0px',
                          opacity: expandedNews.includes(stock.ticker) ? 1 : 0,
                          visibility: expandedNews.includes(stock.ticker) ? 'visible' : 'hidden',
                          transition: 'all 0.3s ease-in-out'
                        }}>
                          {stock.news && stock.news.map((item, index) => (
                            <Box key={index} sx={{ 
                              p: 1.5,
                              width: '100%',
                              borderBottom: index < stock.news!.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                              textAlign: 'left'
                            }}>
                              <Typography variant="body2" component="a" href={item.link} target="_blank" rel="noopener noreferrer"
                                sx={{ 
                                  color: 'text.primary',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                  display: 'block',
                                  mb: 0.5
                                }}
                              >
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {new Date(item.pubDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ 
                        pt: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderTop: `1px solid ${theme.palette.divider}`
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                          Last updated: {stock.lastUpdate}
                        </Typography>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveStock(stock.ticker)}
                          sx={{ width: '160px' }}
                        >
                          Remove
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {stocks.length === 0 && (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 8,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 2,
                  mt: 3,
                  width: '100%'
                }}
              >
                <Typography color="text.secondary">
                  Your portfolio is empty. Add some stocks to get started!
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PortfolioPage; 