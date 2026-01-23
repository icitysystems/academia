import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import {
  GET_ALL_SUBSCRIPTION_PLANS,
  CREATE_SUBSCRIPTION_PLAN,
  UPDATE_SUBSCRIPTION_PLAN,
  DELETE_SUBSCRIPTION_PLAN,
  GET_SUBSCRIPTION_STATS,
} from '../../graphql/queries';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  tier: number;
  priceMonthly: number;
  priceYearly?: number;
  stripeProductId?: string;
  features?: string[];
  maxTemplates?: number;
  maxSheetsPerMonth?: number;
  maxModelsPerTemplate?: number;
  maxStorageMB?: number;
  hasAdvancedAnalytics: boolean;
  hasAPIAccess: boolean;
  hasPrioritySupport: boolean;
  hasCustomBranding: boolean;
  hasTeamFeatures: boolean;
  discountPercentYearly: number;
  trialDays: number;
  priority: number;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  name: string;
  description: string;
  tier: number;
  priceMonthly: number;
  priceYearly: number;
  stripeProductId: string;
  features: string;
  maxTemplates: number;
  maxSheetsPerMonth: number;
  maxModelsPerTemplate: number;
  maxStorageMB: number;
  hasAdvancedAnalytics: boolean;
  hasAPIAccess: boolean;
  hasPrioritySupport: boolean;
  hasCustomBranding: boolean;
  hasTeamFeatures: boolean;
  discountPercentYearly: number;
  trialDays: number;
  priority: number;
  isActive: boolean;
  isPublic: boolean;
}

const defaultFormData: PlanFormData = {
  name: '',
  description: '',
  tier: 0,
  priceMonthly: 0,
  priceYearly: 0,
  stripeProductId: '',
  features: '',
  maxTemplates: 5,
  maxSheetsPerMonth: 100,
  maxModelsPerTemplate: 1,
  maxStorageMB: 500,
  hasAdvancedAnalytics: false,
  hasAPIAccess: false,
  hasPrioritySupport: false,
  hasCustomBranding: false,
  hasTeamFeatures: false,
  discountPercentYearly: 20,
  trialDays: 0,
  priority: 0,
  isActive: true,
  isPublic: true,
};

const SubscriptionPlansAdmin: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [error, setError] = useState<string | null>(null);

  const { data: plansData, loading: plansLoading, refetch: refetchPlans } = useQuery(GET_ALL_SUBSCRIPTION_PLANS);
  const { data: statsData, loading: statsLoading } = useQuery(GET_SUBSCRIPTION_STATS);

  const [createPlan, { loading: creating }] = useMutation(CREATE_SUBSCRIPTION_PLAN, {
    onCompleted: () => {
      setDialogOpen(false);
      refetchPlans();
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const [updatePlan, { loading: updating }] = useMutation(UPDATE_SUBSCRIPTION_PLAN, {
    onCompleted: () => {
      setDialogOpen(false);
      refetchPlans();
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const [deletePlan, { loading: deleting }] = useMutation(DELETE_SUBSCRIPTION_PLAN, {
    onCompleted: () => {
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
      refetchPlans();
    },
    onError: (err) => setError(err.message),
  });

  const plans: SubscriptionPlan[] = plansData?.allSubscriptionPlans || [];
  const stats = statsData?.subscriptionStats;

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
    setError(null);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      tier: plan.tier,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly || 0,
      stripeProductId: plan.stripeProductId || '',
      features: plan.features?.join('\n') || '',
      maxTemplates: plan.maxTemplates || 5,
      maxSheetsPerMonth: plan.maxSheetsPerMonth || 100,
      maxModelsPerTemplate: plan.maxModelsPerTemplate || 1,
      maxStorageMB: plan.maxStorageMB || 500,
      hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
      hasAPIAccess: plan.hasAPIAccess,
      hasPrioritySupport: plan.hasPrioritySupport,
      hasCustomBranding: plan.hasCustomBranding,
      hasTeamFeatures: plan.hasTeamFeatures,
      discountPercentYearly: plan.discountPercentYearly,
      trialDays: plan.trialDays,
      priority: plan.priority,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
    });
    setDialogOpen(true);
    setError(null);
  };

  const handleOpenDelete = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    const input = {
      name: formData.name,
      description: formData.description || undefined,
      tier: formData.tier,
      priceMonthly: Math.round(formData.priceMonthly),
      priceYearly: formData.priceYearly > 0 ? Math.round(formData.priceYearly) : undefined,
      stripeProductId: formData.stripeProductId || undefined,
      features: formData.features ? formData.features.split('\n').filter((f) => f.trim()) : undefined,
      maxTemplates: formData.maxTemplates,
      maxSheetsPerMonth: formData.maxSheetsPerMonth,
      maxModelsPerTemplate: formData.maxModelsPerTemplate,
      maxStorageMB: formData.maxStorageMB,
      hasAdvancedAnalytics: formData.hasAdvancedAnalytics,
      hasAPIAccess: formData.hasAPIAccess,
      hasPrioritySupport: formData.hasPrioritySupport,
      hasCustomBranding: formData.hasCustomBranding,
      hasTeamFeatures: formData.hasTeamFeatures,
      discountPercentYearly: formData.discountPercentYearly,
      trialDays: formData.trialDays,
      priority: formData.priority,
      isActive: formData.isActive,
      isPublic: formData.isPublic,
    };

    if (selectedPlan) {
      await updatePlan({ variables: { id: selectedPlan.id, input } });
    } else {
      await createPlan({ variables: { input } });
    }
  };

  const handleDelete = async () => {
    if (selectedPlan) {
      await deletePlan({ variables: { id: selectedPlan.id } });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getTierName = (tier: number) => {
    const names = ['Free', 'Starter', 'Professional', 'Enterprise'];
    return names[tier] || `Tier ${tier}`;
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Subscription Plans Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Create Plan
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <PeopleIcon color="primary" />
                  <Typography color="text.secondary">Total Subscriptions</Typography>
                </Box>
                <Typography variant="h4">{stats.totalSubscriptions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon color="success" />
                  <Typography color="text.secondary">Active</Typography>
                </Box>
                <Typography variant="h4">{stats.activeSubscriptions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <PeopleIcon color="info" />
                  <Typography color="text.secondary">Trialing</Typography>
                </Box>
                <Typography variant="h4">{stats.trialingSubscriptions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <MoneyIcon color="warning" />
                  <Typography color="text.secondary">MRR</Typography>
                </Box>
                <Typography variant="h4">{formatCurrency(stats.monthlyRecurringRevenue)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Plans Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell align="right">Monthly</TableCell>
              <TableCell align="right">Yearly</TableCell>
              <TableCell align="center">Trial Days</TableCell>
              <TableCell align="center">Features</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Box>
                    <Typography fontWeight="bold">{plan.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {plan.description?.substring(0, 50)}
                      {plan.description && plan.description.length > 50 ? '...' : ''}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={getTierName(plan.tier)} size="small" color={plan.tier === 0 ? 'default' : 'primary'} />
                </TableCell>
                <TableCell align="right">{formatCurrency(plan.priceMonthly)}</TableCell>
                <TableCell align="right">
                  {plan.priceYearly ? formatCurrency(plan.priceYearly) : '-'}
                  {plan.discountPercentYearly > 0 && (
                    <Typography variant="caption" color="success.main" display="block">
                      {plan.discountPercentYearly}% off
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">{plan.trialDays || '-'}</TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={0.5} justifyContent="center" flexWrap="wrap">
                    {plan.hasAdvancedAnalytics && (
                      <Tooltip title="Advanced Analytics">
                        <Chip label="A" size="small" color="info" />
                      </Tooltip>
                    )}
                    {plan.hasAPIAccess && (
                      <Tooltip title="API Access">
                        <Chip label="API" size="small" color="secondary" />
                      </Tooltip>
                    )}
                    {plan.hasPrioritySupport && (
                      <Tooltip title="Priority Support">
                        <Chip label="P" size="small" color="warning" />
                      </Tooltip>
                    )}
                    {plan.hasTeamFeatures && (
                      <Tooltip title="Team Features">
                        <Chip label="T" size="small" color="success" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={0.5} justifyContent="center">
                    <Chip
                      label={plan.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={plan.isActive ? 'success' : 'error'}
                    />
                    {plan.isPublic ? (
                      <Tooltip title="Public">
                        <VisibilityIcon fontSize="small" color="action" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Hidden">
                        <VisibilityOffIcon fontSize="small" color="disabled" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenEdit(plan)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpenDelete(plan)} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plan Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select
                  value={formData.tier}
                  label="Tier"
                  onChange={(e) => setFormData({ ...formData, tier: Number(e.target.value) })}
                >
                  <MenuItem value={0}>Tier 0 - Free</MenuItem>
                  <MenuItem value={1}>Tier 1 - Starter</MenuItem>
                  <MenuItem value={2}>Tier 2 - Professional</MenuItem>
                  <MenuItem value={3}>Tier 3 - Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monthly Price (cents)"
                type="number"
                value={formData.priceMonthly}
                onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                helperText={`= ${formatCurrency(formData.priceMonthly)}`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Yearly Price (cents)"
                type="number"
                value={formData.priceYearly}
                onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                helperText={`= ${formatCurrency(formData.priceYearly)}`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Yearly Discount %"
                type="number"
                value={formData.discountPercentYearly}
                onChange={(e) => setFormData({ ...formData, discountPercentYearly: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Trial Days"
                type="number"
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Usage Limits
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Max Templates"
                type="number"
                value={formData.maxTemplates}
                onChange={(e) => setFormData({ ...formData, maxTemplates: Number(e.target.value) })}
                helperText="-1 for unlimited"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Sheets/Month"
                type="number"
                value={formData.maxSheetsPerMonth}
                onChange={(e) => setFormData({ ...formData, maxSheetsPerMonth: Number(e.target.value) })}
                helperText="-1 for unlimited"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Models/Template"
                type="number"
                value={formData.maxModelsPerTemplate}
                onChange={(e) => setFormData({ ...formData, maxModelsPerTemplate: Number(e.target.value) })}
                helperText="-1 for unlimited"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Storage (MB)"
                type="number"
                value={formData.maxStorageMB}
                onChange={(e) => setFormData({ ...formData, maxStorageMB: Number(e.target.value) })}
                helperText="-1 for unlimited"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Premium Features
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasAdvancedAnalytics}
                    onChange={(e) => setFormData({ ...formData, hasAdvancedAnalytics: e.target.checked })}
                  />
                }
                label="Advanced Analytics"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasAPIAccess}
                    onChange={(e) => setFormData({ ...formData, hasAPIAccess: e.target.checked })}
                  />
                }
                label="API Access"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasPrioritySupport}
                    onChange={(e) => setFormData({ ...formData, hasPrioritySupport: e.target.checked })}
                  />
                }
                label="Priority Support"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasCustomBranding}
                    onChange={(e) => setFormData({ ...formData, hasCustomBranding: e.target.checked })}
                  />
                }
                label="Custom Branding"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasTeamFeatures}
                    onChange={(e) => setFormData({ ...formData, hasTeamFeatures: e.target.checked })}
                  />
                }
                label="Team Features"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Additional Settings
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom Features (one per line)"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                multiline
                rows={3}
                helperText="Add custom feature descriptions, one per line"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Display Priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stripe Product ID (optional)"
                value={formData.stripeProductId}
                onChange={(e) => setFormData({ ...formData, stripeProductId: e.target.value })}
                helperText="Leave empty to auto-create"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active (available for purchase)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  />
                }
                label="Public (visible on pricing page)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={creating || updating || !formData.name}
          >
            {creating || updating ? <CircularProgress size={24} /> : selectedPlan ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Subscription Plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the "{selectedPlan?.name}" plan? This action cannot be undone.
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            Note: Plans with active subscriptions cannot be deleted. Deactivate them instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionPlansAdmin;
