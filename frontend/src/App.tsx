import { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Layout from './components/Layout';
import AnalysisPage from './pages/AnalysisPage';
import PortfolioPage from './pages/PortfolioPage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: '#1976d2', // Slightly darker blue for better contrast
          },
          secondary: {
            main: '#dc004e', // Slightly darker pink for better contrast
          },
          background: {
            default: isDarkMode ? '#121212' : '#f8f9fa',
            paper: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
          text: {
            primary: isDarkMode ? '#ffffff' : '#2c3e50',
            secondary: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#505764',
          },
        },
        shape: {
          borderRadius: 8,
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 600,
          },
          h2: {
            fontWeight: 600,
          },
          h3: {
            fontWeight: 600,
          },
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: isDarkMode 
                  ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
                  : '0 2px 4px rgba(45, 55, 72, 0.1), 0 4px 6px rgba(45, 55, 72, 0.05)',
                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [isDarkMode]
  );

  const handleToggleTheme = () => {
    setIsDarkMode((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Layout onToggleTheme={handleToggleTheme} isDarkMode={isDarkMode}>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
