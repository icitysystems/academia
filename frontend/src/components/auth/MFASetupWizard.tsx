import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  QrCode as QrCodeIcon,
  Verified as VerifiedIcon,
  Phone as PhoneIcon,
  Key as KeyIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useMutation, useLazyQuery, gql } from '@apollo/client';

const SETUP_MFA = gql`
  mutation SetupMFA {
    setupMFA {
      secret
      qrCodeDataUrl
      backupCodes
    }
  }
`;

const VERIFY_MFA = gql`
  mutation VerifyMFASetup($token: String!) {
    verifyMFASetup(token: $token) {
      success
      message
    }
  }
`;

const DISABLE_MFA = gql`
  mutation DisableMFA($token: String!) {
    disableMFA(token: $token) {
      success
    }
  }
`;

const GET_MFA_STATUS = gql`
  query GetMFAStatus {
    myMFAStatus {
      enabled
      enabledAt
      lastUsed
    }
  }
`;

interface MFASetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  open?: boolean;
  asDialog?: boolean;
}

export const MFASetupWizard: React.FC<MFASetupWizardProps> = ({
  onComplete,
  onCancel,
  open = true,
  asDialog = false,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  const [setupMFA, { loading: setupLoading }] = useMutation(SETUP_MFA);
  const [verifyMFA, { loading: verifyLoading }] = useMutation(VERIFY_MFA);

  const handleSetup = async () => {
    setError(null);
    try {
      const result = await setupMFA();
      const { secret, qrCodeDataUrl, backupCodes } = result.data.setupMFA;
      setQrCode(qrCodeDataUrl);
      setSecret(secret);
      setBackupCodes(backupCodes);
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to setup MFA');
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError(null);
    try {
      const result = await verifyMFA({
        variables: { token: verificationCode },
      });

      if (result.data.verifyMFASetup.success) {
        setActiveStep(3);
      } else {
        setError(result.data.verifyMFASetup.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const copySecret = async () => {
    if (secret) {
      try {
        await navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy');
      }
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setBackupCodesCopied(true);
      setTimeout(() => setBackupCodesCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy');
    }
  };

  const downloadBackupCodes = () => {
    const content = `Academia MFA Backup Codes\n========================\n\nStore these codes in a safe place. Each code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academia-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = [
    {
      label: 'Get Started',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            Two-factor authentication adds an extra layer of security to your account. 
            You'll need to enter a code from your authenticator app each time you sign in.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Recommended apps:</strong>
            </Typography>
            <List dense>
              <ListItem><ListItemText primary="Google Authenticator" /></ListItem>
              <ListItem><ListItemText primary="Microsoft Authenticator" /></ListItem>
              <ListItem><ListItemText primary="Authy" /></ListItem>
            </List>
          </Alert>

          <Button
            variant="contained"
            onClick={handleSetup}
            disabled={setupLoading}
            startIcon={setupLoading ? <CircularProgress size={20} color="inherit" /> : <SecurityIcon />}
          >
            {setupLoading ? 'Setting up...' : 'Begin Setup'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'Scan QR Code',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            Scan this QR code with your authenticator app:
          </Typography>

          {qrCode && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, display: 'inline-block' }}>
                <img src={qrCode} alt="MFA QR Code" style={{ width: 200, height: 200 }} />
              </Paper>
            </Box>
          )}

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Can't scan? Enter this code manually:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1 }}
              >
                {secret}
              </Typography>
              <IconButton size="small" onClick={copySecret}>
                {copied ? <SuccessIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Alert>

          <Button variant="contained" onClick={() => setActiveStep(2)}>
            Continue
          </Button>
        </Box>
      ),
    },
    {
      label: 'Verify Code',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            Enter the 6-digit code from your authenticator app to verify setup:
          </Typography>

          <TextField
            fullWidth
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
            }}
            placeholder="000000"
            inputProps={{
              maxLength: 6,
              style: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: 'monospace' },
            }}
            sx={{ mb: 2 }}
            autoFocus
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={verifyLoading || verificationCode.length !== 6}
            startIcon={verifyLoading ? <CircularProgress size={20} color="inherit" /> : <VerifiedIcon />}
          >
            {verifyLoading ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'Save Backup Codes',
      content: (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold">
              Two-factor authentication is now enabled!
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Save these backup codes in a secure location. 
              You can use them to sign in if you lose access to your authenticator app.
              Each code can only be used once.
            </Typography>
          </Alert>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Backup Codes</Typography>
              <IconButton size="small" onClick={copyBackupCodes}>
                {backupCodesCopied ? <SuccessIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
                fontFamily: 'monospace',
              }}
            >
              {backupCodes.map((code, i) => (
                <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {code}
                </Typography>
              ))}
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={downloadBackupCodes}>
              Download Codes
            </Button>
            <Button variant="contained" onClick={onComplete}>
              Done
            </Button>
          </Box>
        </Box>
      ),
    },
  ];

  const content = (
    <Box>
      {error && activeStep < 2 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              {step.content}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );

  if (asDialog) {
    return (
      <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            Set Up Two-Factor Authentication
          </Box>
          {onCancel && (
            <IconButton onClick={onCancel} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>{content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon color="primary" />
        Set Up Two-Factor Authentication
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {content}
    </Paper>
  );
};

export default MFASetupWizard;
