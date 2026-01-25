import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface LiveAnnouncerProps {
  message: string;
  severity?: AlertColor;
  open: boolean;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * Live Region Announcer for screen readers
 * Provides accessible notifications that are announced by screen readers
 */
const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({
  message,
  severity = 'info',
  open,
  onClose,
  autoHideDuration = 6000
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        sx={{ width: '100%' }}
        role="alert"
        aria-live={severity === 'error' ? 'assertive' : 'polite'}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default LiveAnnouncer;
