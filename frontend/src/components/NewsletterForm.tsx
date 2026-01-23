import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { SUBSCRIBE_NEWSLETTER } from '../graphql/queries';

interface NewsletterFormProps {
  variant?: 'inline' | 'card';
  source?: string;
}

const NewsletterForm: React.FC<NewsletterFormProps> = ({ 
  variant = 'card',
  source = 'footer'
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subscribe, { loading }] = useMutation(SUBSCRIBE_NEWSLETTER, {
    onCompleted: () => {
      setSuccess(true);
      setEmail('');
      setName('');
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    subscribe({
      variables: {
        input: {
          email,
          name: name || undefined,
          source,
        },
      },
    });
  };

  if (variant === 'inline') {
    return (
      <Box component="form" onSubmit={handleSubmit}>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Thank you for subscribing!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box display="flex" gap={1} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !email}
            startIcon={loading ? <CircularProgress size={16} /> : <EmailIcon />}
          >
            Subscribe
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 450 }}>
      <Typography variant="h6" gutterBottom>
        Subscribe to Our Newsletter
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Stay updated with the latest features, tips, and education resources.
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Thank you for subscribing! You'll hear from us soon.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          size="small"
          label="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || !email}
          startIcon={loading ? <CircularProgress size={16} /> : <EmailIcon />}
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </Box>
    </Paper>
  );
};

export default NewsletterForm;
