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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import { GET_TEMPLATES, CREATE_TEMPLATE } from '../graphql/queries';

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data, loading, refetch } = useQuery(GET_TEMPLATES);

  const [createTemplate, { loading: creating }] = useMutation(CREATE_TEMPLATE, {
    onCompleted: (data) => {
      setOpen(false);
      setName('');
      setDescription('');
      refetch();
      navigate(`/templates/${data.createTemplate.id}`);
    },
  });

  const handleCreate = () => {
    createTemplate({
      variables: {
        input: { name, description },
      },
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          New Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {data?.templates?.map((template: any) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': { boxShadow: 6 }
              }}
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    {template.name}
                  </Typography>
                </Box>
                <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                  {template.description || 'No description'}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip 
                    size="small" 
                    label={`${template.regions?.length || 0} questions`} 
                  />
                  <Chip 
                    size="small" 
                    label={`${template._count?.sheets || 0} sheets`} 
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={`${template._count?.annotations || 0} annotations`}
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/templates/${template.id}`);
                }}>
                  View
                </Button>
                <Button size="small" onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/templates/${template.id}/annotate`);
                }}>
                  Annotate
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {(!data?.templates || data.templates.length === 0) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No templates yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Create your first template to start grading
              </Typography>
              <Button variant="contained" onClick={() => setOpen(true)}>
                Create Template
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Create Template Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreate} 
            variant="contained"
            disabled={!name || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TemplatesPage;
