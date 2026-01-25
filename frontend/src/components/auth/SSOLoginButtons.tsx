import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Collapse,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  Business as SamlIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useMutation, gql } from '@apollo/client';

const INITIATE_SSO = gql`
  mutation InitiateSSO($provider: String!, $domain: String) {
    initiateSSOLogin(provider: $provider, domain: $domain) {
      redirectUrl
      requestId
    }
  }
`;

const CHECK_INSTITUTION_SSO = gql`
  mutation CheckInstitutionSSO($email: String!) {
    checkInstitutionSSO(email: $email) {
      hasSSOEnabled
      provider
      institutionName
    }
  }
`;

interface SSOLoginButtonsProps {
  onSSORedirect?: (url: string) => void;
  onError?: (error: string) => void;
  showInstitutionSSO?: boolean;
  compact?: boolean;
}

export const SSOLoginButtons: React.FC<SSOLoginButtonsProps> = ({
  onSSORedirect,
  onError,
  showInstitutionSSO = true,
  compact = false,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);
  const [institutionInfo, setInstitutionInfo] = useState<{
    hasSSOEnabled: boolean;
    provider: string;
    institutionName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [initiateSSO] = useMutation(INITIATE_SSO);
  const [checkInstitutionSSO] = useMutation(CHECK_INSTITUTION_SSO);

  const handleSocialSSO = async (provider: 'google' | 'microsoft') => {
    setLoading(provider);
    setError(null);
    try {
      const result = await initiateSSO({
        variables: { provider },
      });

      const { redirectUrl } = result.data.initiateSSOLogin;
      if (onSSORedirect) {
        onSSORedirect(redirectUrl);
      } else {
        window.location.href = redirectUrl;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initiate SSO login';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleCheckInstitution = async () => {
    if (!institutionEmail || !institutionEmail.includes('@')) {
      setError('Please enter a valid institutional email');
      return;
    }

    setLoading('institution');
    setError(null);
    try {
      const result = await checkInstitutionSSO({
        variables: { email: institutionEmail },
      });

      const info = result.data.checkInstitutionSSO;
      setInstitutionInfo(info);

      if (info.hasSSOEnabled) {
        // Automatically redirect to institution SSO
        handleInstitutionSSO(info.provider);
      } else {
        setError('Your institution does not have SSO configured. Please use email/password login.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check institution SSO');
    } finally {
      setLoading(null);
    }
  };

  const handleInstitutionSSO = async (provider?: string) => {
    setLoading('saml');
    setError(null);
    try {
      const domain = institutionEmail.split('@')[1];
      const result = await initiateSSO({
        variables: {
          provider: provider || 'saml',
          domain,
        },
      });

      const { redirectUrl } = result.data.initiateSSOLogin;
      if (onSSORedirect) {
        onSSORedirect(redirectUrl);
      } else {
        window.location.href = redirectUrl;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initiate institution SSO';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Social SSO Buttons */}
      <Box sx={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 2 }}>
        <Button
          fullWidth={!compact}
          variant="outlined"
          startIcon={loading === 'google' ? <CircularProgress size={20} /> : <GoogleIcon />}
          onClick={() => handleSocialSSO('google')}
          disabled={!!loading}
          sx={{
            borderColor: '#4285F4',
            color: '#4285F4',
            '&:hover': {
              borderColor: '#4285F4',
              backgroundColor: 'rgba(66, 133, 244, 0.04)',
            },
          }}
        >
          {compact ? '' : 'Continue with Google'}
        </Button>

        <Button
          fullWidth={!compact}
          variant="outlined"
          startIcon={loading === 'microsoft' ? <CircularProgress size={20} /> : <MicrosoftIcon />}
          onClick={() => handleSocialSSO('microsoft')}
          disabled={!!loading}
          sx={{
            borderColor: '#00A4EF',
            color: '#00A4EF',
            '&:hover': {
              borderColor: '#00A4EF',
              backgroundColor: 'rgba(0, 164, 239, 0.04)',
            },
          }}
        >
          {compact ? '' : 'Continue with Microsoft'}
        </Button>
      </Box>

      {/* Institution SSO */}
      {showInstitutionSSO && (
        <>
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Collapse in={!showInstitutionForm}>
            <Button
              fullWidth
              variant="text"
              startIcon={<SamlIcon />}
              onClick={() => setShowInstitutionForm(true)}
              sx={{ color: 'text.secondary' }}
            >
              Sign in with your institution
            </Button>
          </Collapse>

          <Collapse in={showInstitutionForm}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Institution Sign-In
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your institutional email to be redirected to your organization's login page.
              </Typography>
              
              <TextField
                fullWidth
                size="small"
                label="Institutional Email"
                placeholder="you@university.edu"
                value={institutionEmail}
                onChange={(e) => setInstitutionEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCheckInstitution()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                disabled={!!loading}
                sx={{ mb: 2 }}
              />

              {institutionInfo?.hasSSOEnabled && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  SSO enabled for {institutionInfo.institutionName}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="text"
                  onClick={() => {
                    setShowInstitutionForm(false);
                    setInstitutionEmail('');
                    setInstitutionInfo(null);
                  }}
                  disabled={!!loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCheckInstitution}
                  disabled={!!loading || !institutionEmail}
                  startIcon={loading === 'institution' || loading === 'saml' ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  Continue
                </Button>
              </Box>
            </Paper>
          </Collapse>
        </>
      )}
    </Box>
  );
};

export default SSOLoginButtons;
