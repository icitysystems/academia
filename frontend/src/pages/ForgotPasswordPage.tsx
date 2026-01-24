import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) {
      success
      message
    }
  }
`;

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD, {
    onCompleted: (data) => {
      if (data.forgotPassword.success) {
        setSubmitted(true);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    forgotPassword({
      variables: {
        input: { email },
      },
    });
  };

  if (submitted) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Check Your Email
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            If an account exists with <strong>{email}</strong>, we've sent instructions to reset your password.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Didn't receive the email? Check your spam folder, or{' '}
            <Link
              component="button"
              onClick={() => setSubmitted(false)}
              sx={{ cursor: 'pointer' }}
            >
              try again
            </Link>
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Forgot Password?
          </Typography>
          <Typography color="text.secondary">
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoFocus
            placeholder="you@example.com"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link component={RouterLink} to="/login">
            <ArrowBackIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Back to Login
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPasswordPage;
