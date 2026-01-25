import React from 'react';
import { Box, useTheme } from '@mui/material';

interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

/**
 * Skip to main content link for keyboard navigation
 * Helps screen reader users and keyboard-only users skip navigation
 */
const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId = 'main-content', 
  label = 'Skip to main content' 
}) => {
  const theme = useTheme();

  return (
    <Box
      component="a"
      href={`#${targetId}`}
      sx={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        zIndex: 9999,
        '&:focus': {
          position: 'fixed',
          top: 0,
          left: 0,
          width: 'auto',
          height: 'auto',
          padding: '16px 32px',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          borderRadius: '0 0 4px 0',
          boxShadow: theme.shadows[4],
        }
      }}
    >
      {label}
    </Box>
  );
};

export default SkipLink;
