import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Levy Analyzer
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Financial Analysis & Portfolio Management
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage; 