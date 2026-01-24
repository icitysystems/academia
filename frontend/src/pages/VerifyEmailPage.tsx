import React, { useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const VERIFY_EMAIL = gql`
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      success
      message
      email
    }
  }
`;

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [verifyEmail, { data, loading, error }] = useMutation(VERIFY_EMAIL);

  useEffect(() => {
    if (token) {
      verifyEmail({
        variables: {
          input: { token },
        },
      });
    }
  }, [token, verifyEmail]);

  // No token provided
  if (!token) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Invalid Verification Link
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            No verification token was provided.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Verifying
  if (loading) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Verifying your email...</Typography>
        </Paper>
      </Container>
    );
  }

  // Error
  if (error) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Verification Failed
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error.message || 'This verification link has expired or is invalid.'}
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Success
  if (data?.verifyEmail?.success) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Email Verified!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your email has been successfully verified. You can now access all features of Academia.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
          >
            Continue to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return null;
};

export default VerifyEmailPage;
