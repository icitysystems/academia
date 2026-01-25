import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Verified as VerifiedIcon,
  ContentCopy as CopyIcon,
  Print as PrintIcon,
  LinkedIn as LinkedInIcon,
  EmojiEvents as CertificateIcon,
  School as SchoolIcon,
  CalendarMonth as DateIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_MY_CERTIFICATES,
  GET_CERTIFICATE,
  VERIFY_CERTIFICATE,
  DOWNLOAD_CERTIFICATE,
} from '../../graphql/operations';

interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  studentName: string;
  issueDate: string;
  certificateNumber: string;
  grade?: string;
  credentialUrl: string;
  thumbnailUrl?: string;
  status: 'ISSUED' | 'REVOKED' | 'EXPIRED';
}

interface CertificateListProps {
  studentId?: string;
}

export const CertificateList: React.FC<CertificateListProps> = ({ studentId }) => {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const { data, loading, error } = useQuery(GET_MY_CERTIFICATES, {
    variables: { studentId },
  });

  const [downloadCertificate, { loading: downloading }] = useMutation(DOWNLOAD_CERTIFICATE);
  const [verifyCertificate, { loading: verifying }] = useMutation(VERIFY_CERTIFICATE);

  const certificates: Certificate[] = data?.myCertificates || [];

  const handleDownload = async (certificate: Certificate, format: 'pdf' | 'png') => {
    try {
      const result = await downloadCertificate({
        variables: { certificateId: certificate.id, format },
      });
      if (result.data?.downloadCertificate?.url) {
        window.open(result.data.downloadCertificate.url, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleShare = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShareDialogOpen(true);
  };

  const handleVerify = async () => {
    try {
      const result = await verifyCertificate({
        variables: { certificateNumber: verifyInput },
      });
      setVerifyResult(result.data?.verifyCertificate);
    } catch (err) {
      setVerifyResult({ valid: false, error: 'Certificate not found' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const shareToLinkedIn = (certificate: Certificate) => {
    const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certificate.courseName)}&organizationId=0&issueYear=${new Date(certificate.issueDate).getFullYear()}&issueMonth=${new Date(certificate.issueDate).getMonth() + 1}&certUrl=${encodeURIComponent(certificate.credentialUrl)}&certId=${encodeURIComponent(certificate.certificateNumber)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load certificates. Please try again.</Alert>
    );
  }

  return (
    <Box>
      {/* Header with Verify Option */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CertificateIcon color="primary" /> My Certificates
        </Typography>
        <Button
          variant="outlined"
          startIcon={<VerifiedIcon />}
          onClick={() => setVerifyDialogOpen(true)}
        >
          Verify a Certificate
        </Button>
      </Box>

      {certificates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SchoolIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Certificates Yet
          </Typography>
          <Typography color="text.secondary">
            Complete courses to earn certificates that you can share with employers and on social media.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {certificates.map((certificate) => (
            <Grid item xs={12} md={6} lg={4} key={certificate.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {certificate.status === 'ISSUED' && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Verified"
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 16,
                    }}
                  />
                )}

                {/* Certificate Preview */}
                <Box
                  sx={{
                    height: 160,
                    bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    background: 'linear-gradient(135deg, #1a237e 0%, #4a148c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {certificate.thumbnailUrl ? (
                    <img
                      src={certificate.thumbnailUrl}
                      alt={certificate.courseName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', color: 'white', p: 2 }}>
                      <CertificateIcon sx={{ fontSize: 48, mb: 1 }} />
                      <Typography variant="subtitle1">Certificate of Completion</Typography>
                    </Box>
                  )}
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom noWrap>
                    {certificate.courseName}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DateIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Issued: {new Date(certificate.issueDate).toLocaleDateString()}
                    </Typography>
                  </Box>

                  {certificate.grade && (
                    <Chip
                      label={`Grade: ${certificate.grade}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    Certificate ID: {certificate.certificateNumber}
                  </Typography>
                </CardContent>

                <Divider />

                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Box>
                    <Tooltip title="Download PDF">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(certificate, 'pdf')}
                        disabled={downloading}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(certificate, 'pdf')}
                      >
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<ShareIcon />}
                    onClick={() => handleShare(certificate)}
                  >
                    Share
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Certificate</DialogTitle>
        <DialogContent>
          {selectedCertificate && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedCertificate.courseName}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Credential URL
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={selectedCertificate.credentialUrl}
                    InputProps={{ readOnly: true }}
                  />
                  <IconButton
                    onClick={() => copyToClipboard(selectedCertificate.credentialUrl)}
                  >
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Share on
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<LinkedInIcon />}
                  onClick={() => shareToLinkedIn(selectedCertificate)}
                  sx={{ textTransform: 'none' }}
                >
                  Add to LinkedIn
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<QrCodeIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  Show QR Code
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog
        open={verifyDialogOpen}
        onClose={() => {
          setVerifyDialogOpen(false);
          setVerifyInput('');
          setVerifyResult(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Verify Certificate</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Enter a certificate number to verify its authenticity.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              label="Certificate Number"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="e.g., CERT-2024-ABC123"
            />
            <Button
              variant="contained"
              onClick={handleVerify}
              disabled={!verifyInput || verifying}
            >
              {verifying ? <CircularProgress size={24} /> : 'Verify'}
            </Button>
          </Box>

          {verifyResult && (
            <Alert severity={verifyResult.valid ? 'success' : 'error'}>
              {verifyResult.valid ? (
                <Box>
                  <Typography variant="subtitle2">✓ Certificate Verified</Typography>
                  <Typography variant="body2">
                    Course: {verifyResult.courseName}
                  </Typography>
                  <Typography variant="body2">
                    Issued to: {verifyResult.studentName}
                  </Typography>
                  <Typography variant="body2">
                    Date: {new Date(verifyResult.issueDate).toLocaleDateString()}
                  </Typography>
                </Box>
              ) : (
                <Typography>
                  Certificate not found or invalid. Please check the certificate number.
                </Typography>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setVerifyDialogOpen(false);
            setVerifyInput('');
            setVerifyResult(null);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Individual Certificate Viewer Component
interface CertificateViewerProps {
  certificateId: string;
}

export const CertificateViewer: React.FC<CertificateViewerProps> = ({ certificateId }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const { data, loading, error } = useQuery(GET_CERTIFICATE, {
    variables: { certificateId },
  });

  const [downloadCertificate, { loading: downloading }] = useMutation(DOWNLOAD_CERTIFICATE);

  const certificate: Certificate | null = data?.certificate || null;

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Certificate - ${certificate?.courseName}</title>
              <style>
                body { font-family: Georgia, serif; margin: 0; padding: 40px; }
                .certificate { border: 20px solid #1a237e; padding: 40px; text-align: center; }
                h1 { color: #1a237e; font-size: 36px; margin-bottom: 20px; }
                h2 { color: #333; font-size: 24px; margin-bottom: 30px; }
                .name { font-size: 32px; color: #4a148c; margin: 20px 0; }
                .details { margin: 20px 0; color: #666; }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !certificate) {
    return (
      <Alert severity="error">Certificate not found or unavailable.</Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Certificate Display */}
      <Paper
        ref={printRef}
        sx={{
          p: 6,
          textAlign: 'center',
          border: '20px solid',
          borderColor: 'primary.dark',
          backgroundImage: 'linear-gradient(135deg, rgba(26,35,126,0.05) 0%, rgba(74,20,140,0.05) 100%)',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: 'Georgia, serif',
            color: 'primary.dark',
            mb: 2,
          }}
        >
          Certificate of Completion
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          This is to certify that
        </Typography>

        <Typography
          variant="h2"
          sx={{
            fontFamily: 'Georgia, serif',
            color: 'secondary.dark',
            fontWeight: 'bold',
            mb: 4,
          }}
        >
          {certificate.studentName}
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          has successfully completed the course
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Georgia, serif',
            color: 'primary.dark',
            mb: 4,
          }}
        >
          {certificate.courseName}
        </Typography>

        {certificate.grade && (
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            with a grade of <strong>{certificate.grade}</strong>
          </Typography>
        )}

        <Box sx={{ mt: 6, pt: 4, borderTop: '2px solid', borderColor: 'grey.300' }}>
          <Grid container spacing={4} justifyContent="center">
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Issue Date
              </Typography>
              <Typography variant="h6">
                {new Date(certificate.issueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Certificate Number
              </Typography>
              <Typography variant="h6">{certificate.certificateNumber}</Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon color="success" />
          <Typography variant="body2" color="success.main">
            Verified Credential
          </Typography>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => downloadCertificate({ variables: { certificateId, format: 'pdf' } })}
          disabled={downloading}
        >
          Download PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
        <Button variant="outlined" startIcon={<ShareIcon />}>
          Share
        </Button>
      </Box>
    </Box>
  );
};

export default CertificateList;
