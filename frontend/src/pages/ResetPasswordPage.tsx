import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const VALIDATE_RESET_TOKEN = gql`
  query ValidateResetToken($token: String!) {
    validateResetToken(token: $token) {
      success
      message
    }
  }
`;

const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      success
      message
    }
  }
`;

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: tokenData, loading: validating, error: tokenError } = useQuery(
    VALIDATE_RESET_TOKEN,
    {
      variables: { token },
      skip: !token,
    }
  );

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD, {
    onCompleted: (data) => {
      if (data.resetPassword.success) {
        setSuccess(true);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    resetPassword({
      variables: {
        input: { token, newPassword },
      },
    });
  };

  // No token provided
  if (!token) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Invalid Reset Link
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            No reset token was provided. Please request a new password reset link.
          </Typography>
          <Button
            component={RouterLink}
            to="/forgot-password"
            variant="contained"
          >
            Request New Link
          </Button>
        </Paper>
      </Container>
    );
  }

  // Validating token
  if (validating) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Validating reset link...</Typography>
        </Paper>
      </Container>
    );
  }

  // Invalid or expired token
  if (tokenError || (tokenData && !tokenData.validateResetToken.success)) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Link Expired
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            This password reset link has expired or is invalid. Please request a new one.
          </Typography>
          <Button
            component={RouterLink}
            to="/forgot-password"
            variant="contained"
          >
            Request New Link
          </Button>
        </Paper>
      </Container>
    );
  }

  // Success state
  if (success) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Password Reset Successfully!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your password has been updated. You can now log in with your new password.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockResetIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Reset Password
          </Typography>
          <Typography color="text.secondary">
            Enter your new password below.
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
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            error={confirmPassword !== '' && newPassword !== confirmPassword}
            helperText={
              confirmPassword !== '' && newPassword !== confirmPassword
                ? 'Passwords do not match'
                : ''
            }
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Password must be at least 8 characters long
          </Typography>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage;
