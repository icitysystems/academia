import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  Contrast as ContrastIcon,
  TextFields as TextFieldsIcon,
  SlowMotionVideo as MotionIcon,
  Keyboard as KeyboardIcon,
  Visibility as FocusIcon,
  RecordVoiceOver as ScreenReaderIcon,
  RestartAlt as ResetIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AccessibilityPanelProps {
  position?: 'fixed' | 'relative';
  showToggle?: boolean;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  position = 'fixed',
  showToggle = true,
}) => {
  const { settings, updateSettings, announceToScreenReader } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap for accessibility panel
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    announceToScreenReader(isOpen ? 'Accessibility panel closed' : 'Accessibility panel opened');
  };

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
    announceToScreenReader(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
  };

  const handleFontSizeChange = (_: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setFontSize(value);
    document.documentElement.style.fontSize = `${value}%`;
    announceToScreenReader(`Font size set to ${value}%`);
  };

  const handleReset = () => {
    updateSettings({
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReaderOptimized: false,
      focusIndicators: true,
      keyboardNavigation: true,
    });
    setFontSize(100);
    document.documentElement.style.fontSize = '100%';
    announceToScreenReader('Accessibility settings reset to defaults');
  };

  const panelStyles = position === 'fixed' ? {
    position: 'fixed',
    bottom: 80,
    right: 16,
    zIndex: 1300,
    maxWidth: 320,
  } : {};

  const toggleButtonStyles = position === 'fixed' ? {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 1300,
  } : {};

  return (
    <>
      {showToggle && (
        <Tooltip title="Accessibility Options" placement="left">
          <IconButton
            onClick={handleToggle}
            aria-label="Open accessibility options"
            aria-expanded={isOpen}
            aria-controls="accessibility-panel"
            sx={{
              ...toggleButtonStyles,
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:focus': {
                outline: '3px solid',
                outlineColor: 'primary.light',
                outlineOffset: '2px',
              },
            }}
          >
            <AccessibilityIcon />
          </IconButton>
        </Tooltip>
      )}

      <Collapse in={isOpen || !showToggle}>
        <Paper
          ref={panelRef}
          id="accessibility-panel"
          role="dialog"
          aria-label="Accessibility settings"
          aria-modal="true"
          elevation={8}
          sx={{
            ...panelStyles,
            p: 2,
            maxHeight: '80vh',
            overflow: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              <AccessibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Accessibility
            </Typography>
            {showToggle && (
              <IconButton
                size="small"
                onClick={handleToggle}
                aria-label="Close accessibility panel"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            These settings will be saved for your next visit.
          </Alert>

          {/* High Contrast */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.highContrast}
                onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                inputProps={{ 'aria-describedby': 'high-contrast-desc' }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ContrastIcon />
                <Typography>High Contrast</Typography>
              </Box>
            }
          />
          <Typography variant="caption" id="high-contrast-desc" sx={{ display: 'block', ml: 7, mb: 2 }} color="text.secondary">
            Increase color contrast for better visibility
          </Typography>

          {/* Large Text */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.largeText}
                onChange={(e) => handleSettingChange('largeText', e.target.checked)}
                inputProps={{ 'aria-describedby': 'large-text-desc' }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextFieldsIcon />
                <Typography>Large Text</Typography>
              </Box>
            }
          />
          <Typography variant="caption" id="large-text-desc" sx={{ display: 'block', ml: 7, mb: 2 }} color="text.secondary">
            Increase text size for easier reading
          </Typography>

          {/* Font Size Slider */}
          <Typography gutterBottom>Font Size: {fontSize}%</Typography>
          <Slider
            value={fontSize}
            onChange={handleFontSizeChange}
            min={75}
            max={200}
            step={25}
            marks={[
              { value: 75, label: '75%' },
              { value: 100, label: '100%' },
              { value: 150, label: '150%' },
              { value: 200, label: '200%' },
            ]}
            valueLabelDisplay="auto"
            aria-label="Adjust font size"
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Reduced Motion */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.reducedMotion}
                onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                inputProps={{ 'aria-describedby': 'reduced-motion-desc' }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MotionIcon />
                <Typography>Reduce Motion</Typography>
              </Box>
            }
          />
          <Typography variant="caption" id="reduced-motion-desc" sx={{ display: 'block', ml: 7, mb: 2 }} color="text.secondary">
            Minimize animations and transitions
          </Typography>

          {/* Focus Indicators */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.focusIndicators}
                onChange={(e) => handleSettingChange('focusIndicators', e.target.checked)}
                inputProps={{ 'aria-describedby': 'focus-desc' }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FocusIcon />
                <Typography>Enhanced Focus</Typography>
              </Box>
            }
          />
          <Typography variant="caption" id="focus-desc" sx={{ display: 'block', ml: 7, mb: 2 }} color="text.secondary">
            Show larger focus indicators on interactive elements
          </Typography>

          {/* Keyboard Navigation */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.keyboardNavigation}
                onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
                inputProps={{ 'aria-describedby': 'keyboard-desc' }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyboardIcon />
                <Typography>Keyboard Navigation</Typography>
              </Box>
            }
          />
          <Typography variant="caption" id="keyboard-desc" sx={{ display: 'block', ml: 7, mb: 2 }} color="text.secondary">
            Enable full keyboard navigation support
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleReset}
            fullWidth
            aria-label="Reset all accessibility settings to defaults"
          >
            Reset to Defaults
          </Button>

          <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center' }} color="text.secondary">
            Press Escape to close this panel
          </Typography>
        </Paper>
      </Collapse>
    </>
  );
};

export default AccessibilityPanel;
