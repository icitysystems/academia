import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Brush as BrushIcon,
  TextFields as TextIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Remove as PartialIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { fabric } from 'fabric';
import {
  GET_SHEET,
  GET_TEMPLATE,
  CREATE_ANNOTATION,
  GET_SHEETS,
} from '../graphql/queries';

type CorrectnessType = 'CORRECT' | 'PARTIAL' | 'INCORRECT' | 'SKIPPED';

interface QuestionLabel {
  regionId: string;
  correctness: CorrectnessType;
  score: number;
  comment?: string;
}

const AnnotatePage: React.FC = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // State
  const [tool, setTool] = useState<'brush' | 'text'>('brush');
  const [brushColor, setBrushColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(3);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [questionLabels, setQuestionLabels] = useState<Record<string, QuestionLabel>>({});
  const [isTrainingData, setIsTrainingData] = useState(true);
  const [comments, setComments] = useState('');
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Queries
  const { data: sheetData, loading: sheetLoading } = useQuery(GET_SHEET, {
    variables: { id: sheetId },
    skip: !sheetId,
  });

  const sheet = sheetData?.sheet;
  const template = sheet?.template;
  const regions = template?.regions || [];

  // Mutations
  const [createAnnotation, { loading: saving }] = useMutation(CREATE_ANNOTATION, {
    onCompleted: () => {
      navigate(`/templates/${template?.id}`);
    },
  });

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !sheet?.processedUrl) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: 800,
      height: 1100,
    });

    fabricCanvasRef.current = canvas;

    // Load sheet image as background
    fabric.Image.fromURL(
      sheet.processedUrl || sheet.originalUrl,
      (img) => {
        const scale = Math.min(800 / (img.width || 800), 1100 / (img.height || 1100));
        img.scale(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          originX: 'left',
          originY: 'top',
        });
      },
      { crossOrigin: 'anonymous' }
    );

    // Set brush properties
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;

    // Save history on changes
    canvas.on('path:created', () => {
      saveToHistory(canvas);
    });

    return () => {
      canvas.dispose();
    };
  }, [sheet]);

  // Update brush settings
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.color = brushColor;
      fabricCanvasRef.current.freeDrawingBrush.width = brushSize;
      fabricCanvasRef.current.isDrawingMode = tool === 'brush';
    }
  }, [brushColor, brushSize, tool]);

  const saveToHistory = (canvas: fabric.Canvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setCanvasHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, json];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0 && fabricCanvasRef.current) {
      const newIndex = historyIndex - 1;
      fabricCanvasRef.current.loadFromJSON(canvasHistory[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
      });
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < canvasHistory.length - 1 && fabricCanvasRef.current) {
      const newIndex = historyIndex + 1;
      fabricCanvasRef.current.loadFromJSON(canvasHistory[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
      });
      setHistoryIndex(newIndex);
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Comment', {
      left: 100,
      top: 100,
      fill: brushColor,
      fontSize: 16,
      fontFamily: 'Arial',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const setQuestionLabel = (regionId: string, correctness: CorrectnessType, score?: number) => {
    const region = regions.find((r: any) => r.id === regionId);
    const maxScore = region?.points || 1;

    let defaultScore = 0;
    if (correctness === 'CORRECT') defaultScore = maxScore;
    else if (correctness === 'PARTIAL') defaultScore = maxScore * 0.5;

    setQuestionLabels((prev) => ({
      ...prev,
      [regionId]: {
        regionId,
        correctness,
        score: score ?? defaultScore,
        comment: prev[regionId]?.comment,
      },
    }));
  };

  const handleSave = async () => {
    if (!sheetId || !template?.id) return;

    // Get canvas strokes
    const strokes = fabricCanvasRef.current?.toJSON().objects || [];

    // Prepare question labels
    const labels = Object.values(questionLabels).filter(
      (label) => label.correctness !== undefined
    );

    await createAnnotation({
      variables: {
        input: {
          sheetId,
          templateId: template.id,
          strokes: JSON.stringify(strokes),
          comments,
          isTrainingData,
          questionLabels: labels,
        },
      },
    });
  };

  if (sheetLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sheet) {
    return (
      <Container>
        <Alert severity="error">Sheet not found</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Left Panel - Questions */}
      <Drawer
        variant="permanent"
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 300,
            position: 'relative',
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Questions
          </Typography>
          <List>
            {regions.map((region: any, index: number) => {
              const label = questionLabels[region.id];
              return (
                <ListItem key={region.id} disablePadding>
                  <ListItemButton
                    selected={selectedRegion === region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    sx={{
                      borderLeft: 4,
                      borderColor: label?.correctness === 'CORRECT'
                        ? 'success.main'
                        : label?.correctness === 'PARTIAL'
                        ? 'warning.main'
                        : label?.correctness === 'INCORRECT'
                        ? 'error.main'
                        : 'transparent',
                    }}
                  >
                    <ListItemText
                      primary={`${index + 1}. ${region.label}`}
                      secondary={
                        label
                          ? `${label.correctness} - ${label.score}/${region.points}`
                          : `${region.points} pts`
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 2 }} />

          {selectedRegion && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Grade Question
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <IconButton
                  color={questionLabels[selectedRegion]?.correctness === 'CORRECT' ? 'success' : 'default'}
                  onClick={() => setQuestionLabel(selectedRegion, 'CORRECT')}
                >
                  <CheckIcon />
                </IconButton>
                <IconButton
                  color={questionLabels[selectedRegion]?.correctness === 'PARTIAL' ? 'warning' : 'default'}
                  onClick={() => setQuestionLabel(selectedRegion, 'PARTIAL')}
                >
                  <PartialIcon />
                </IconButton>
                <IconButton
                  color={questionLabels[selectedRegion]?.correctness === 'INCORRECT' ? 'error' : 'default'}
                  onClick={() => setQuestionLabel(selectedRegion, 'INCORRECT')}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {questionLabels[selectedRegion] && (
                <TextField
                  size="small"
                  type="number"
                  label="Score"
                  value={questionLabels[selectedRegion].score}
                  onChange={(e) =>
                    setQuestionLabel(
                      selectedRegion,
                      questionLabels[selectedRegion].correctness,
                      parseFloat(e.target.value)
                    )
                  }
                  inputProps={{
                    min: 0,
                    max: regions.find((r: any) => r.id === selectedRegion)?.points || 1,
                    step: 0.5,
                  }}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Use as Training Data</InputLabel>
            <Select
              value={isTrainingData ? 'yes' : 'no'}
              onChange={(e) => setIsTrainingData(e.target.value === 'yes')}
              label="Use as Training Data"
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="General Comments"
            multiline
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            fullWidth
          />
        </Box>
      </Drawer>

      {/* Main Canvas Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={tool}
            exclusive
            onChange={(_, value) => value && setTool(value)}
            size="small"
          >
            <ToggleButton value="brush">
              <BrushIcon />
            </ToggleButton>
            <ToggleButton value="text" onClick={addText}>
              <TextIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem />

          <Box sx={{ width: 100 }}>
            <Typography variant="caption">Brush Size</Typography>
            <Slider
              value={brushSize}
              onChange={(_, value) => setBrushSize(value as number)}
              min={1}
              max={20}
              size="small"
            />
          </Box>

          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            style={{ width: 40, height: 30 }}
          />

          <Divider orientation="vertical" flexItem />

          <IconButton onClick={undo} disabled={historyIndex <= 0}>
            <UndoIcon />
          </IconButton>
          <IconButton onClick={redo} disabled={historyIndex >= canvasHistory.length - 1}>
            <RedoIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <Chip
            label={`${Object.keys(questionLabels).length}/${regions.length} graded`}
            color={Object.keys(questionLabels).length === regions.length ? 'success' : 'default'}
          />

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || Object.keys(questionLabels).length === 0}
          >
            {saving ? 'Saving...' : 'Save Annotation'}
          </Button>

          <Button variant="outlined" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </Paper>

        {/* Canvas */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            p: 2,
            bgcolor: 'grey.200',
          }}
        >
          <Paper elevation={3}>
            <canvas ref={canvasRef} />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default AnnotatePage;
