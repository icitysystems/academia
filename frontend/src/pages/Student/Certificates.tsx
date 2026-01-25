import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import {
  WorkspacePremium as CertificateIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import { gql } from '@apollo/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// GraphQL queries
const GET_MY_CERTIFICATES = gql`
  query GetMyCertificates {
    myCertificates {
      id
      certificateNumber
      title
      courseTitle
      completionDate
      issuedAt
      grade
      instructorName
      verificationUrl
      course {
        id
        title
        description
        thumbnailUrl
      }
    }
  }
`;

const GET_CERTIFICATE = gql`
  query GetCertificate($id: ID!) {
    certificate(id: $id) {
      id
      certificateNumber
      title
      courseTitle
      completionDate
      issuedAt
      grade
      instructorName
      verificationUrl
      studentName
      course {
        id
        title
        description
      }
    }
  }
`;

interface Certificate {
  id: string;
  certificateNumber: string;
  title: string;
  courseTitle: string;
  completionDate: string;
  issuedAt: string;
  grade?: string;
  instructorName: string;
  verificationUrl: string;
  studentName?: string;
  course: {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
  };
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Certificate Preview Component
const CertificatePreview: React.FC<{ certificate: Certificate }> = ({ certificate }) => {
  return (
    <Box
      id={`certificate-${certificate.id}`}
      sx={{
        width: '100%',
        maxWidth: 800,
        aspectRatio: '1.414 / 1',
        mx: 'auto',
        p: 6,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        border: '12px solid #2c3e50',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          border: '3px solid #34495e',
          borderRadius: 1,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Decorative corners */}
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderTop: '4px solid #e74c3c',
          borderLeft: '4px solid #e74c3c',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 60,
          height: 60,
          borderTop: '4px solid #e74c3c',
          borderRight: '4px solid #e74c3c',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          width: 60,
          height: 60,
          borderBottom: '4px solid #e74c3c',
          borderLeft: '4px solid #e74c3c',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 60,
          height: 60,
          borderBottom: '4px solid #e74c3c',
          borderRight: '4px solid #e74c3c',
        }}
      />

      <Box textAlign="center" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <CertificateIcon sx={{ fontSize: 64, color: '#e74c3c', mb: 2 }} />
        
        <Typography
          variant="overline"
          sx={{
            fontSize: '1rem',
            letterSpacing: 6,
            color: '#7f8c8d',
            display: 'block',
            mb: 1,
          }}
        >
          Certificate of Completion
        </Typography>

        <Typography
          variant="h3"
          sx={{
            fontFamily: 'serif',
            fontWeight: 'bold',
            color: '#2c3e50',
            mb: 4,
          }}
        >
          {certificate.title || 'Certificate of Achievement'}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          This is to certify that
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontFamily: 'cursive',
            color: '#2980b9',
            borderBottom: '2px solid #2980b9',
            display: 'inline-block',
            px: 4,
            py: 1,
            mb: 3,
          }}
        >
          {certificate.studentName || 'Student Name'}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          has successfully completed
        </Typography>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: '#2c3e50',
            mb: 3,
          }}
        >
          {certificate.courseTitle}
        </Typography>

        {certificate.grade && (
          <Chip
            label={`Grade: ${certificate.grade}`}
            color="primary"
            sx={{ mb: 3, fontSize: '1rem', py: 2 }}
          />
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-around' }}>
          <Box textAlign="center">
            <Typography
              variant="body2"
              sx={{ borderTop: '2px solid #34495e', pt: 1, minWidth: 150 }}
            >
              {formatDate(certificate.completionDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Completion Date
            </Typography>
          </Box>

          <Box textAlign="center">
            <Typography
              variant="body2"
              sx={{ borderTop: '2px solid #34495e', pt: 1, minWidth: 150 }}
            >
              {certificate.instructorName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Instructor
            </Typography>
          </Box>
        </Box>

        {/* Certificate number */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 40,
            color: '#95a5a6',
          }}
        >
          Certificate #: {certificate.certificateNumber}
        </Typography>

        {/* Verification badge */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#27ae60',
          }}
        >
          <VerifiedIcon fontSize="small" />
          <Typography variant="caption">Verified</Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Student Certificates Page
const StudentCertificates: React.FC = () => {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const { data, loading, error } = useQuery(GET_MY_CERTIFICATES);
  const certificates: Certificate[] = data?.myCertificates || [];

  const handleDownloadPDF = async () => {
    if (!selectedCertificate) return;
    setDownloading(true);

    try {
      const element = document.getElementById(`certificate-${selectedCertificate.id}`);
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificate-${selectedCertificate.certificateNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById(`certificate-${selectedCertificate?.id}`);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${selectedCertificate?.courseTitle}</title>
          <style>
            body { margin: 0; padding: 20px; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${printContent.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShareLinkedIn = () => {
    if (!selectedCertificate) return;
    
    const url = encodeURIComponent(selectedCertificate.verificationUrl || window.location.href);
    const title = encodeURIComponent(`I completed ${selectedCertificate.courseTitle}!`);
    
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading certificates...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load certificates. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <CertificateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          My Certificates
        </Typography>
        <Typography color="text.secondary">
          View and download your course completion certificates
        </Typography>
      </Box>

      {certificates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CertificateIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No certificates yet
          </Typography>
          <Typography color="text.secondary">
            Complete courses to earn certificates that you can share and download.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {certificates.map((certificate) => (
            <Grid item xs={12} sm={6} md={4} key={certificate.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  sx={{
                    height: 140,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CertificateIcon sx={{ fontSize: 64, color: 'white' }} />
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom noWrap>
                    {certificate.courseTitle}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<VerifiedIcon />}
                      label="Verified"
                      size="small"
                      color="success"
                    />
                    {certificate.grade && (
                      <Chip label={certificate.grade} size="small" color="primary" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Completed: {formatDate(certificate.completionDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Certificate #: {certificate.certificateNumber}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => setSelectedCertificate(certificate)}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Certificate Preview Dialog */}
      <Dialog
        open={!!selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Certificate Preview</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
              >
                Print
              </Button>
              <Button
                size="small"
                startIcon={<LinkedInIcon />}
                onClick={handleShareLinkedIn}
              >
                Share
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCertificate && (
            <Box ref={certificateRef}>
              <CertificatePreview certificate={selectedCertificate} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCertificate(null)}>Close</Button>
          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={20} /> : <DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentCertificates;
