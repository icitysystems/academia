import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Share } from 'react-native';
import { Text, Card, Button, Chip, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useQuery, gql } from '@apollo/client';

const GET_CERTIFICATES = gql`
  query GetMyCertificates {
    myCertificates {
      id
      title
      courseTitle
      issuedAt
      certificateNumber
      downloadUrl
      verifyUrl
    }
  }
`;

interface Certificate {
  id: string;
  title: string;
  courseTitle: string;
  issuedAt: string;
  certificateNumber: string;
  downloadUrl: string;
  verifyUrl: string;
}

const CertificatesScreen: React.FC = () => {
  const theme = useTheme();
  const { data, loading, refetch } = useQuery(GET_CERTIFICATES);

  const certificates: Certificate[] = data?.myCertificates || [];

  const handleShare = async (certificate: Certificate) => {
    try {
      await Share.share({
        message: `I earned a certificate in "${certificate.courseTitle}" from Academia! Verify at: ${certificate.verifyUrl}`,
        title: certificate.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownload = (certificate: Certificate) => {
    // In a real app, use expo-file-system to download
    console.log('Download:', certificate.downloadUrl);
  };

  const renderCertificate = ({ item }: { item: Certificate }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.certificateHeader}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🏆</Text>
          </View>
          <View style={styles.certificateInfo}>
            <Text variant="titleMedium" style={styles.title}>
              {item.title}
            </Text>
            <Text variant="bodySmall" style={styles.course}>
              {item.courseTitle}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <Chip mode="outlined" compact>
            Issued: {new Date(item.issuedAt).toLocaleDateString()}
          </Chip>
          <Text variant="labelSmall" style={styles.certNumber}>
            #{item.certificateNumber}
          </Text>
        </View>
      </Card.Content>

      <Card.Actions>
        <Button
          mode="text"
          icon="download"
          onPress={() => handleDownload(item)}
        >
          Download
        </Button>
        <Button
          mode="text"
          icon="share-variant"
          onPress={() => handleShare(item)}
        >
          Share
        </Button>
      </Card.Actions>
    </Card>
  );

  if (loading && certificates.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={certificates}
      renderItem={renderCertificate}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎓</Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No Certificates Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Complete courses to earn certificates
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  certificateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 28,
  },
  certificateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  course: {
    color: '#666',
    marginTop: 2,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certNumber: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default CertificatesScreen;
