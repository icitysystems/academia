import React from 'react';
import { Box, Button, Link } from '@mui/material';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface SkipLink {
  target: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { target: 'main-content', label: 'Skip to main content' },
  { target: 'navigation', label: 'Skip to navigation' },
  { target: 'search', label: 'Skip to search' },
];

export const SkipLinks: React.FC<SkipLinksProps> = ({ links = defaultLinks }) => {
  const { settings } = useAccessibility();

  const handleSkipLink = (targetId: string, event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Skip links"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9999,
        '& a': {
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          padding: '1rem',
          backgroundColor: 'background.paper',
          color: 'primary.main',
          textDecoration: 'none',
          fontWeight: 'bold',
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
          '&:focus': {
            left: '1rem',
            top: '1rem',
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        },
      }}
    >
      {links.map((link, index) => (
        <Link
          key={link.target}
          href={`#${link.target}`}
          onClick={(e) => handleSkipLink(link.target, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSkipLink(link.target, e);
            }
          }}
          sx={{
            '&:focus': {
              top: `${1 + index * 4}rem !important`,
            },
          }}
        >
          {link.label}
        </Link>
      ))}
    </Box>
  );
};

export default SkipLinks;
