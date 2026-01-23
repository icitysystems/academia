import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  Rocket as RocketIcon,
  Business as BusinessIcon,
  WorkspacePremium as PremiumIcon,
  Analytics as AnalyticsIcon,
  Api as ApiIcon,
  Support as SupportIcon,
  Palette as PaletteIcon,
  Group as GroupIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import {
  GET_SUBSCRIPTION_PLANS,
  GET_MY_SUBSCRIPTION,
  CREATE_SUBSCRIPTION,
} from '../graphql/queries';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const { data: plansData, loading: plansLoading } = useQuery(GET_SUBSCRIPTION_PLANS);
  const { data: subscriptionData } = useQuery(GET_MY_SUBSCRIPTION, {
    skip: !isAuthenticated,
  });

  const [createSubscription, { loading: creating }] = useMutation(CREATE_SUBSCRIPTION, {
    onCompleted: (data) => {
      if (data?.createSubscription?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.createSubscription.url;
      }
    },
  });

  const currentSubscription = subscriptionData?.mySubscription;
  const plans = plansData?.subscriptionPlans || [];

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/pricing');
      return;
    }

    await createSubscription({
      variables: {
        input: {
          planId,
          billingCycle,
        },
      },
    });
  };

  const getPlanIcon = (tier: number, name: string) => {
    switch (tier) {
      case 0:
        return <CheckIcon />;
      case 1:
        return <StarIcon />;
      case 2:
        return <PremiumIcon />;
      case 3:
        return <BusinessIcon />;
      default:
        return <RocketIcon />;
    }
  };

  const getPlanColor = (tier: number) => {
    const colors = ['default', 'primary', 'secondary', 'warning'] as const;
    return colors[tier] || 'default';
  };

  const getTierLabel = (tier: number) => {
    const labels = ['Free', 'Starter', 'Professional', 'Enterprise'];
    return labels[tier] || 'Custom';
  };

  const formatPrice = (priceMonthly: number, priceYearly?: number, discountPercentYearly?: number) => {
    if (billingCycle === 'YEARLY' && priceYearly) {
      const monthlyEquivalent = priceYearly / 12;
      const regularYearly = priceMonthly * 12;
      const actualSavings = regularYearly - priceYearly;
      return {
        price: (monthlyEquivalent / 100).toFixed(2),
        total: (priceYearly / 100).toFixed(2),
        savings: actualSavings > 0 ? (actualSavings / 100).toFixed(2) : null,
        discountPercent: discountPercentYearly || (actualSavings > 0 ? Math.round((actualSavings / regularYearly) * 100) : 0),
      };
    }
    return {
      price: (priceMonthly / 100).toFixed(2),
      total: (priceMonthly / 100).toFixed(2),
      savings: null,
      discountPercent: 0,
    };
  };

  const renderFeatureIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckIcon color="success" fontSize="small" />
    ) : (
      <CloseIcon color="disabled" fontSize="small" />
    );
  };

  if (plansLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" gutterBottom>
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Unlock powerful grading features and scale your workflow
        </Typography>

        {/* Billing Cycle Toggle */}
        <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={3}>
          <ToggleButtonGroup
            value={billingCycle}
            exclusive
            onChange={(_, value) => value && setBillingCycle(value)}
            size="small"
          >
            <ToggleButton value="MONTHLY">Monthly</ToggleButton>
            <ToggleButton value="YEARLY">
              Yearly
              <Chip label="Save 20%" size="small" color="success" sx={{ ml: 1 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {currentSubscription && (
        <Alert severity="info" sx={{ mb: 4 }}>
          You're currently on the <strong>{currentSubscription.plan.name}</strong> plan.
          {currentSubscription.cancelAtPeriodEnd && (
            <span> Your subscription will end on {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}.</span>
          )}
        </Alert>
      )}

      <Grid container spacing={4} justifyContent="center">
        {plans.map((plan: any, index: number) => {
          const pricing = formatPrice(plan.priceMonthly, plan.priceYearly, plan.discountPercentYearly);
          const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
          const isPopular = plan.tier === 2; // Professional tier is popular
          const tierColor = getPlanColor(plan.tier);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: isPopular ? 2 : 1,
                  borderColor: isPopular ? 'primary.main' : 'divider',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {isPopular && (
                  <Chip
                    label="Most Popular"
                    color="primary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
                {plan.trialDays > 0 && (
                  <Chip
                    label={`${plan.trialDays}-day free trial`}
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: isPopular ? 16 : -12,
                      right: 8,
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, pt: isPopular ? 4 : 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        bgcolor: `${tierColor}.light`,
                        borderRadius: 1,
                        p: 1,
                        mr: 1,
                        color: `${tierColor}.main`,
                      }}
                    >
                      {getPlanIcon(plan.tier, plan.name)}
                    </Box>
                    <Box>
                      <Typography variant="h5">{plan.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getTierLabel(plan.tier)} Tier
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                    {plan.description}
                  </Typography>

                  <Box mb={3}>
                    <Typography variant="h3" component="span">
                      ${pricing.price}
                    </Typography>
                    <Typography variant="body1" component="span" color="text.secondary">
                      /month
                    </Typography>
                    {billingCycle === 'YEARLY' && pricing.savings && (
                      <Box>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          Save ${pricing.savings}/year ({pricing.discountPercent}% off)
                        </Typography>
                      </Box>
                    )}
                    {billingCycle === 'YEARLY' && (
                      <Typography variant="caption" color="text.secondary">
                        Billed ${pricing.total} yearly
                      </Typography>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Usage Limits */}
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Usage Limits
                  </Typography>
                  <List dense>
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={plan.maxTemplates === -1 ? 'Unlimited templates' : `${plan.maxTemplates} templates`} 
                      />
                    </ListItem>
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={plan.maxSheetsPerMonth === -1 ? 'Unlimited sheets/month' : `${plan.maxSheetsPerMonth} sheets/month`} 
                      />
                    </ListItem>
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={plan.maxModelsPerTemplate === -1 ? 'Unlimited ML models' : `${plan.maxModelsPerTemplate} ML model${plan.maxModelsPerTemplate > 1 ? 's' : ''}/template`} 
                      />
                    </ListItem>
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <StorageIcon color="action" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={plan.maxStorageMB === -1 ? 'Unlimited storage' : `${plan.maxStorageMB >= 1024 ? `${(plan.maxStorageMB / 1024).toFixed(0)} GB` : `${plan.maxStorageMB} MB`} storage`} 
                      />
                    </ListItem>
                  </List>

                  {/* Premium Features */}
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Premium Features
                  </Typography>
                  <List dense>
                    <Tooltip title="Access detailed analytics and insights about grading patterns" placement="left">
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {renderFeatureIcon(plan.hasAdvancedAnalytics)}
                        </ListItemIcon>
                        <ListItemText 
                          primary="Advanced Analytics"
                          sx={{ color: plan.hasAdvancedAnalytics ? 'text.primary' : 'text.disabled' }}
                        />
                      </ListItem>
                    </Tooltip>
                    <Tooltip title="Integrate with external systems via our REST API" placement="left">
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {renderFeatureIcon(plan.hasAPIAccess)}
                        </ListItemIcon>
                        <ListItemText 
                          primary="API Access"
                          sx={{ color: plan.hasAPIAccess ? 'text.primary' : 'text.disabled' }}
                        />
                      </ListItem>
                    </Tooltip>
                    <Tooltip title="Get faster response times and dedicated support" placement="left">
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {renderFeatureIcon(plan.hasPrioritySupport)}
                        </ListItemIcon>
                        <ListItemText 
                          primary="Priority Support"
                          sx={{ color: plan.hasPrioritySupport ? 'text.primary' : 'text.disabled' }}
                        />
                      </ListItem>
                    </Tooltip>
                    <Tooltip title="Add your institution's branding to reports" placement="left">
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {renderFeatureIcon(plan.hasCustomBranding)}
                        </ListItemIcon>
                        <ListItemText 
                          primary="Custom Branding"
                          sx={{ color: plan.hasCustomBranding ? 'text.primary' : 'text.disabled' }}
                        />
                      </ListItem>
                    </Tooltip>
                    <Tooltip title="Collaborate with team members and share templates" placement="left">
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {renderFeatureIcon(plan.hasTeamFeatures)}
                        </ListItemIcon>
                        <ListItemText 
                          primary="Team Collaboration"
                          sx={{ color: plan.hasTeamFeatures ? 'text.primary' : 'text.disabled' }}
                        />
                      </ListItem>
                    </Tooltip>
                  </List>

                  {/* Custom Features from plan */}
                  {plan.features && plan.features.length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Additional Features
                      </Typography>
                      <List dense>
                        {plan.features.map((feature: string, idx: number) => (
                          <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={feature} />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </CardContent>
                <CardActions sx={{ p: 2 }}>
                  <Button
                    variant={isPopular ? 'contained' : 'outlined'}
                    fullWidth
                    size="large"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={creating || isCurrentPlan || plan.priceMonthly === 0}
                  >
                    {creating ? (
                      <CircularProgress size={24} />
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.priceMonthly === 0 ? (
                      'Free Forever'
                    ) : (
                      'Get Started'
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* FAQ Section */}
      <Paper sx={{ mt: 8, p: 4 }}>
        <Typography variant="h5" gutterBottom textAlign="center">
          Frequently Asked Questions
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Can I cancel anytime?</Typography>
            <Typography color="text.secondary">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">What payment methods do you accept?</Typography>
            <Typography color="text.secondary">
              We accept all major credit cards (Visa, MasterCard, American Express) through our secure Stripe payment system.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Can I upgrade or downgrade?</Typography>
            <Typography color="text.secondary">
              Yes, you can change your plan at any time. Changes take effect immediately, and we'll prorate the difference.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Is there a free trial?</Typography>
            <Typography color="text.secondary">
              The Basic plan is free forever. For paid plans, contact us for a trial period if you're an educational institution.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default PricingPage;
