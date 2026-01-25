import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Link,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Apple as AppleIcon,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useLazyQuery, gql } from '@apollo/client';

const GET_ICAL_URL = gql`
  query GetCalendarExportUrl($options: CalendarExportOptions!) {
    getCalendarExportUrl(options: $options) {
      url
      expiresAt
    }
  }
`;

interface CalendarExportProps {
  userId?: string;
  courseIds?: string[];
  classSubjectIds?: string[];
  includeAssignments?: boolean;
  includeQuizzes?: boolean;
  includeLessons?: boolean;
}

export const CalendarExport: React.FC<CalendarExportProps> = ({
  userId,
  courseIds = [],
  classSubjectIds = [],
  includeAssignments = true,
  includeQuizzes = true,
  includeLessons = true,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('google');
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const [getCalendarUrl, { loading }] = useLazyQuery(GET_ICAL_URL);

  const handleExport = async () => {
    try {
      const result = await getCalendarUrl({
        variables: {
          options: {
            userId,
            courseIds: courseIds.length > 0 ? courseIds : undefined,
            classSubjectIds: classSubjectIds.length > 0 ? classSubjectIds : undefined,
            includeAssignments,
            includeQuizzes,
            includeLessons,
          },
        },
      });

      if (result.data?.getCalendarExportUrl?.url) {
        setExportUrl(result.data.getCalendarExportUrl.url);
        setDialogOpen(true);
      }
    } catch (error: any) {
      setNotification({ message: `Failed to generate calendar: ${error.message}`, severity: 'error' });
    }
  };

  const copyToClipboard = async () => {
    if (exportUrl) {
      try {
        await navigator.clipboard.writeText(exportUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setNotification({ message: 'URL copied to clipboard!', severity: 'success' });
      } catch {
        setNotification({ message: 'Failed to copy to clipboard', severity: 'error' });
      }
    }
  };

  const getCalendarAppUrl = (calendarType: string) => {
    if (!exportUrl) return '';
    
    const encodedUrl = encodeURIComponent(exportUrl);
    
    switch (calendarType) {
      case 'google':
        return `https://calendar.google.com/calendar/r?cid=${encodedUrl}`;
      case 'outlook':
        return `https://outlook.live.com/calendar/0/addfromweb?url=${encodedUrl}&name=Academia%20Calendar`;
      case 'apple':
        return exportUrl.replace('https://', 'webcal://').replace('http://', 'webcal://');
      default:
        return exportUrl;
    }
  };

  const downloadIcal = () => {
    if (exportUrl) {
      window.open(exportUrl, '_blank');
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CalendarIcon />}
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Export to Calendar'}
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="primary" />
          Subscribe to Calendar
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Subscribe to this calendar feed to automatically sync your schedule with your preferred calendar app.
          </Typography>

          {/* Calendar URL */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Calendar URL (iCal format)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={exportUrl || ''}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: 12 },
                }}
              />
              <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                <IconButton onClick={copyToClipboard} color={copied ? 'success' : 'default'}>
                  {copied ? <SuccessIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>

          {/* Quick Subscribe Options */}
          <Typography variant="subtitle2" gutterBottom>
            Quick Subscribe
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<GoogleIcon sx={{ color: '#4285F4' }} />}
              href={getCalendarAppUrl('google')}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Calendar
            </Button>
            <Button
              variant="outlined"
              startIcon={<MicrosoftIcon sx={{ color: '#0078D4' }} />}
              href={getCalendarAppUrl('outlook')}
              target="_blank"
              rel="noopener noreferrer"
            >
              Outlook
            </Button>
            <Button
              variant="outlined"
              startIcon={<AppleIcon />}
              href={getCalendarAppUrl('apple')}
            >
              Apple Calendar
            </Button>
          </Box>

          {/* Download Option */}
          <Button
            variant="text"
            startIcon={<DownloadIcon />}
            onClick={downloadIcal}
            fullWidth
          >
            Download .ics file
          </Button>

          {/* What's Included */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              This calendar includes:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {includeLessons && <Chip size="small" label="Lessons" />}
              {includeAssignments && <Chip size="small" label="Assignments" />}
              {includeQuizzes && <Chip size="small" label="Quizzes" />}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notification?.severity} onClose={() => setNotification(null)}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CalendarExport;
