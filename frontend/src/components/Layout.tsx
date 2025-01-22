import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  IconButton, 
  Box,
  Button,
  useTheme,
  CssBaseline,
  useMediaQuery
} from '@mui/material';
import { 
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  Search as SearchIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onToggleTheme, isDarkMode }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navItems = [
    { path: '/', label: 'Portfolio', icon: <HomeIcon /> },
    { path: '/analysis', label: 'Analysis', icon: <SearchIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: isDarkMode ? '#121212' : '#f8f9fa' }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          backdropFilter: 'blur(8px)',
          backgroundColor: isDarkMode ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/"
            sx={{ 
              textDecoration: 'none', 
              color: isDarkMode ? '#ffffff' : '#2c3e50',
              fontWeight: 700,
              letterSpacing: '-0.5px'
            }}
          >
            Levy Analyzer
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                component={RouterLink}
                to={item.path}
                startIcon={!isMobile && item.icon}
                sx={{ 
                  color: isDarkMode ? '#ffffff' : '#2c3e50',
                  minWidth: isMobile ? 'auto' : undefined,
                  px: isMobile ? 1 : 2,
                  py: 1,
                  borderRadius: '8px',
                  backgroundColor: location.pathname === item.path ? 
                    (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)') : 
                    'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                {isMobile ? item.icon : item.label}
              </Button>
            ))}

            <IconButton 
              onClick={onToggleTheme} 
              sx={{ 
                ml: 1,
                color: isDarkMode ? '#ffffff' : '#2c3e50',
                bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'
                }
              }}
            >
              {isDarkMode ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          mt: '64px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 }
        }}
      >
        {children}
      </Box>

      <Box 
        component="footer" 
        sx={{ 
          py: 2,
          px: 2,
          mt: 'auto',
          textAlign: 'center',
          borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          backgroundColor: isDarkMode ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          color: isDarkMode ? '#ffffff' : '#2c3e50'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.7 }}>
            © {new Date().getFullYear()} Levy Analyzer
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 