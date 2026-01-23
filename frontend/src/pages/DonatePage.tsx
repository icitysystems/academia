import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Favorite as HeartIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { CREATE_DONATION, CONFIRM_DONATION, GET_PUBLIC_DONATIONS } from '../graphql/queries';

// Initialize Stripe - replace with your publishable key from env
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000]; // In cents

interface DonationFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const DonationPaymentForm: React.FC<DonationFormProps> = ({
  clientSecret,
  amount,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/donate/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <PaymentElement />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        disabled={!stripe || processing}
        sx={{ mt: 3 }}
      >
        {processing ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          `Donate $${(amount / 100).toFixed(2)}`
        )}
      </Button>
    </Box>
  );
};

const DonatePage: React.FC = () => {
  const [amount, setAmount] = useState<number>(2500); // Default $25
  const [customAmount, setCustomAmount] = useState<string>('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [error, setError] = useState<string | null>(null);

  const { data: donationsData } = useQuery(GET_PUBLIC_DONATIONS, {
    variables: { limit: 5 },
  });

  const [createDonation, { loading: creatingDonation }] = useMutation(CREATE_DONATION);
  const [confirmDonation] = useMutation(CONFIRM_DONATION);

  const handleAmountSelect = (newAmount: number | null) => {
    if (newAmount) {
      setAmount(newAmount);
      setCustomAmount('');
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setAmount(Math.round(numValue * 100)); // Convert to cents
    }
  };

  const handleContinueToPayment = async () => {
    if (!email || amount < 100) {
      setError('Please provide a valid email and amount');
      return;
    }

    try {
      const { data } = await createDonation({
        variables: {
          input: {
            email,
            name: name || undefined,
            amount,
            currency: 'usd',
            message: message || undefined,
            isAnonymous,
          },
        },
      });

      if (data?.createDonation?.clientSecret) {
        setClientSecret(data.createDonation.clientSecret);
        setPaymentIntentId(data.createDonation.paymentIntentId);
        setStep('payment');
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create donation');
    }
  };

  const handlePaymentSuccess = async () => {
    if (paymentIntentId) {
      await confirmDonation({ variables: { paymentIntentId } });
    }
    setStep('success');
  };

  if (step === 'success') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <HeartIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Thank You!
          </Typography>
          <Typography color="text.secondary" paragraph>
            Your donation of ${(amount / 100).toFixed(2)} has been received.
            Your support helps us improve education for everyone.
          </Typography>
          <Button variant="contained" href="/">
            Return Home
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={4}>
        {/* Main Donation Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <HeartIcon sx={{ fontSize: 32, color: 'error.main', mr: 1 }} />
              <Typography variant="h4">Support Academia</Typography>
            </Box>
            
            <Typography color="text.secondary" paragraph>
              Your donation helps us maintain and improve the platform, develop new features,
              and keep education accessible for teachers worldwide.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {step === 'details' && (
              <>
                {/* Amount Selection */}
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Select Amount
                </Typography>
                <ToggleButtonGroup
                  value={PRESET_AMOUNTS.includes(amount) ? amount : null}
                  exclusive
                  onChange={(_, val) => handleAmountSelect(val)}
                  sx={{ flexWrap: 'wrap', mb: 2 }}
                >
                  {PRESET_AMOUNTS.map((preset) => (
                    <ToggleButton key={preset} value={preset} sx={{ px: 3 }}>
                      ${preset / 100}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                
                <TextField
                  label="Custom Amount ($)"
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="Enter custom amount"
                  size="small"
                  inputProps={{ min: 1, step: 0.01 }}
                  sx={{ width: 200 }}
                />

                <Divider sx={{ my: 3 }} />

                {/* Donor Information */}
                <Typography variant="h6" gutterBottom>
                  Your Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Message (optional)"
                      multiline
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Leave a message with your donation..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                      }
                      label="Make this donation anonymous"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleContinueToPayment}
                  disabled={creatingDonation || !email || amount < 100}
                  sx={{ mt: 3 }}
                >
                  {creatingDonation ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Continue to Payment - $${(amount / 100).toFixed(2)}`
                  )}
                </Button>
              </>
            )}

            {step === 'payment' && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'stripe' },
                }}
              >
                <Box sx={{ mt: 3 }}>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Donation amount: <strong>${(amount / 100).toFixed(2)}</strong>
                  </Alert>
                  <DonationPaymentForm
                    clientSecret={clientSecret}
                    amount={amount}
                    onSuccess={handlePaymentSuccess}
                    onError={setError}
                  />
                  <Button
                    variant="text"
                    onClick={() => {
                      setStep('details');
                      setClientSecret(null);
                    }}
                    sx={{ mt: 2 }}
                  >
                    ← Back to details
                  </Button>
                </Box>
              </Elements>
            )}
          </Paper>
        </Grid>

        {/* Recent Donations Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Supporters
            </Typography>
            <List>
              {donationsData?.publicDonations?.map((donation: any, index: number) => (
                <ListItem key={index} disablePadding sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={donation.name || 'Anonymous'}
                    secondary={`$${(donation.amount / 100).toFixed(2)}`}
                  />
                </ListItem>
              ))}
              {(!donationsData?.publicDonations || donationsData.publicDonations.length === 0) && (
                <Typography variant="body2" color="text.secondary">
                  Be the first to support us!
                </Typography>
              )}
            </List>
          </Paper>

          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Why Donate?
            </Typography>
            <List dense>
              {[
                'Support free education tools',
                'Help develop new features',
                'Keep the platform running',
                'Enable access for all teachers',
              ].map((reason, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={reason} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DonatePage;
