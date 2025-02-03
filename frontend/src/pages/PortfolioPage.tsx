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
  useTheme,
  useMediaQuery,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Link,
  Collapse,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';
import { usePortfolio } from '../hooks/usePortfolio';
import { BASE_URL } from '../config';

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
}

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down';
  marketCap: string;
  volume: string;
  peRatio: string;
  lastUpdate: string;
  news?: NewsItem[];
}

interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  fullSymbol: string;
}

const PortfolioPage: React.FC = () => {
  const {
    stocks,
    loading,
    error,
    addStock,
    removeStock
  } = usePortfolio();

  const [newTicker, setNewTicker] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [expandedNews, setExpandedNews] = useState<string[]>([]);
  const [translatedTitles, setTranslatedTitles] = useState<{ [key: string]: string }>({});
  const [translating, setTranslating] = useState<{ [key: string]: boolean }>({});
  const [translationErrors, setTranslationErrors] = useState<{ [key: string]: string }>({});
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleToggleNews = (ticker: string) => {
    setExpandedNews(prev => 
      prev.includes(ticker) 
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const handleTranslate = async (title: string, stockTicker: string, index: number) => {
    try {
      const translationKey = `${stockTicker}-${index}`;
      setTranslating(prev => ({ ...prev, [translationKey]: true }));
      setTranslationErrors(prev => ({ ...prev, [translationKey]: '' }));
      
      const response = await fetch(`${BASE_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: title,
          targetLanguage: 'iw'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = 'Translation failed';
        
        switch (data.code) {
          case 'NETWORK_ERROR':
            errorMessage = 'Service temporarily unavailable';
            break;
          case 'RATE_LIMIT':
            errorMessage = 'Too many requests, please try again later';
            break;
          case 'TEXT_TOO_LONG':
            errorMessage = 'Text is too long to translate';
            break;
          default:
            errorMessage = data.error || 'Translation failed';
        }
        
        throw new Error(errorMessage);
      }

      setTranslatedTitles(prev => ({ ...prev, [translationKey]: data.translatedText }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setTranslationErrors(prev => ({ ...prev, [`${stockTicker}-${index}`]: errorMessage }));
      console.error('Translation error:', err);
    } finally {
      setTranslating(prev => ({ ...prev, [`${stockTicker}-${index}`]: false }));
    }
  };

  const handleSearch = async (query: string) => {
    setNewTicker(query);
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      const response = await fetch(`${BASE_URL}/stock/search/${query}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.results);
      } else {
        setSearchError(data.error);
        setSearchResults([]);
      }
    } catch (error) {
      setSearchError('Failed to search stocks');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleStockSelect = async (stock: StockSearchResult | null) => {
    if (!stock) return;
    setSelectedStock(stock);
    await addStock(stock.fullSymbol);
    setNewTicker('');
    setSearchResults([]);
    setSelectedStock(null);
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
            <Box sx={{ width: '100%' }}>
              <Autocomplete
                fullWidth
                options={searchResults}
                getOptionLabel={(option) => `${option.symbol} - ${option.name} (${option.exchange})`}
                loading={searching}
                onInputChange={(_, value) => handleSearch(value)}
                onChange={(_, value) => handleStockSelect(value)}
                value={selectedStock}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Stocks"
                    placeholder="Enter company name or symbol"
                    variant="outlined"
                    size="small"
                    error={!!searchError}
                    helperText={searchError}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searching ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body1" component="span">
                        {option.symbol} - {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.exchange}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Box>
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
              {(stocks as Stock[]).map((stock: Stock) => (
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
                      background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(180deg, rgba(30,33,42,1) 0%, rgba(22,25,32,1) 100%)'
                        : 'linear-gradient(180deg, rgba(245,245,245,1) 0%, rgba(238,238,238,1) 100%)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative',
                      '&:hover': {
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ mb: 0.5 }}>
                        <Typography 
                          variant="subtitle2" 
                          color="text.secondary"
                          sx={{ mb: 0.5, fontSize: '0.875rem' }}
                        >
                          {stock.name}
                        </Typography>
                        <Typography 
                          variant="h5" 
                          component="div" 
                          sx={{ 
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            mb: 2
                          }}
                        >
                          {stock.ticker}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                        <Typography 
                          variant="h4" 
                          component="div"
                          sx={{ 
                            fontWeight: 700,
                            mr: 2
                          }}
                        >
                          ${stock.price.toFixed(2)}
                        </Typography>
                        <Chip
                          label={`${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)`}
                          color={stock.direction === 'up' ? 'success' : 'error'}
                          size="small"
                          sx={{ 
                            height: '24px',
                            backgroundColor: stock.direction === 'up' 
                              ? 'rgba(46, 160, 67, 0.3)' 
                              : 'rgba(248, 81, 73, 0.3)',
                            '& .MuiChip-label': {
                              px: 1,
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: stock.direction === 'up' 
                                ? 'rgb(46, 160, 67)' 
                                : 'rgb(248, 81, 73)'
                            }
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Market Cap: {stock.marketCap}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Volume: {stock.volume}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          P/E: {stock.peRatio}
                        </Typography>
                      </Box>

                      {stock.news && stock.news.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            onClick={() => handleToggleNews(stock.ticker)}
                            endIcon={expandedNews.includes(stock.ticker) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            size="small"
                            sx={{ 
                              color: 'text.secondary',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)'
                              }
                            }}
                          >
                            News
                          </Button>
                          <Collapse in={expandedNews.includes(stock.ticker)}>
                            <List dense sx={{ py: 1 }}>
                              {stock.news.map((item, index) => (
                                <ListItem 
                                  key={`${stock.ticker}-${index}`} 
                                  sx={{ 
                                    px: 0, 
                                    py: 0.5,
                                    display: 'flex',
                                    alignItems: 'flex-start'
                                  }}
                                >
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Link 
                                            href={item.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            sx={{ 
                                              color: 'text.primary',
                                              fontSize: '0.875rem',
                                              flexGrow: 1,
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              '&:hover': {
                                                color: theme.palette.primary.main
                                              }
                                            }}
                                          >
                                            {translatedTitles[`${stock.ticker}-${index}`] || item.title}
                                          </Link>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleTranslate(item.title, stock.ticker, index)}
                                            disabled={translating[`${stock.ticker}-${index}`]}
                                            sx={{ 
                                              ml: 1,
                                              p: 0.5,
                                              '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                              }
                                            }}
                                          >
                                            {translating[`${stock.ticker}-${index}`] ? (
                                              <CircularProgress size={16} />
                                            ) : (
                                              <TranslateIcon sx={{ fontSize: '1rem' }} />
                                            )}
                                          </IconButton>
                                        </Box>
                                        {translationErrors[`${stock.ticker}-${index}`] && (
                                          <Typography 
                                            variant="caption" 
                                            color="error"
                                            sx={{ 
                                              fontSize: '0.75rem',
                                              mt: 0.5
                                            }}
                                          >
                                            {translationErrors[`${stock.ticker}-${index}`]}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                    secondary={
                                      <Typography variant="caption" color="text.secondary">
                                        {item.source} - {item.pubDate}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Collapse>
                        </Box>
                      )}

                      <Box 
                        sx={{ 
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          display: 'flex',
                          gap: 1
                        }}
                      >
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeStock(stock.ticker)}
                          sx={{
                            minWidth: 'auto',
                            p: 1,
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            '&:hover': {
                              backgroundColor: theme.palette.error.dark
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
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