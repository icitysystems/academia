import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Paper, Typography, Button, Box, CircularProgress } from '@mui/material';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';

const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // You could verify the session here with your backend if needed
    console.log('Checkout session completed:', sessionId);
  }, [sessionId]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Welcome to Your New Plan!
        </Typography>
        <Typography color="text.secondary" paragraph>
          Your subscription has been activated successfully. You now have access to all your plan's features.
        </Typography>
        <Box display="flex" gap={2} justifyContent="center" mt={3}>
          <Button variant="contained" onClick={() => navigate('/templates')}>
            Get Started
          </Button>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SubscriptionSuccessPage;
