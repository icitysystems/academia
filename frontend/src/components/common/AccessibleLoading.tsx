import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

interface AccessibleLoadingProps {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  size?: number;
}

/**
 * Accessible loading indicator
 * Provides proper aria attributes and screen reader announcements
 */
const AccessibleLoading: React.FC<AccessibleLoadingProps> = ({
  loading,
  loadingText = 'Loading content...',
  children,
  size = 40
}) => {
  if (loading) {
    return (
      <Box
        role="status"
        aria-busy="true"
        aria-live="polite"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          gap: 2
        }}
      >
        <CircularProgress size={size} aria-hidden="true" />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            // Visible for screen readers but also visible on screen
            textAlign: 'center'
          }}
        >
          {loadingText}
        </Typography>
        {/* Screen reader only announcement */}
        <Box
          component="span"
          sx={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
          aria-live="assertive"
        >
          {loadingText}
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AccessibleLoading;
