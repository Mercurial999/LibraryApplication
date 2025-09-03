import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

export default function FineDetailsScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fineDetails, setFineDetails] = useState(null);
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const loadFineDetails = async () => {
    try {
      setError(null);
      const fine = await ApiService.getFineById(id);
      setFineDetails(fine);
    } catch (err) {
      console.error('Error loading fine details:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load fine details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadFineDetails();
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return '#10b981';
      case 'UNPAID':
        return '#ef4444';
      case 'PARTIAL':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return '✅ Paid';
      case 'UNPAID':
        return '❌ Unpaid';
      case 'PARTIAL':
        return '⚠️ Partial Payment';
      default:
        return '❓ Unknown';
    }
  };

  const getFineTypeIcon = (fineType) => {
    switch (fineType?.toLowerCase()) {
      case 'overdue fine':
        return '⏰';
      case 'damage fine':
        return '📚';
      case 'lost book fine':
        return '❌';
      default:
        return '💰';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header 
          title="Fine Details"
          subtitle="Loading fine information..."
          onMenuPress={() => setSidebarVisible(true)}
        />
        <Sidebar 
          visible={sidebarVisible} 
          onClose={() => setSidebarVisible(false)}
          currentRoute="/fines"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading fine details...</Text>
        </View>
      </View>
    );
  }

  if (error || !fineDetails) {
    return (
      <View style={styles.container}>
        <Header 
          title="Fine Details"
          subtitle="Error loading fine"
          onMenuPress={() => setSidebarVisible(true)}
        />
        <Sidebar 
          visible={sidebarVisible} 
          onClose={() => setSidebarVisible(false)}
          currentRoute="/fines"
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error || 'Fine not found'}</Text>
          <TouchableOpacity onPress={loadFineDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Fine Details"
        subtitle={`Fine #${fineDetails.id.substring(0, 8)}`}
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/fines"
      />
      
      <ScrollView style={styles.content}>
        {/* Fine Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.fineHeader}>
            <Text style={styles.fineIcon}>
              {getFineTypeIcon(fineDetails.fineType)}
            </Text>
            <View style={styles.fineInfo}>
              <Text style={styles.fineType}>{fineDetails.fineType || 'Overdue Fine'}</Text>
              <Text style={[styles.statusText, { color: getStatusColor(fineDetails.status) }]}>
                {getStatusText(fineDetails.status)}
              </Text>
            </View>
            <Text style={styles.fineAmount}>₱{fineDetails.amountDue.toFixed(2)}</Text>
          </View>
        </View>

        {/* Book Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Book Information</Text>
          <View style={styles.card}>
            <Text style={styles.bookTitle}>
              {fineDetails.borrowtransaction?.book?.title || 'Unknown Book'}
            </Text>
            <Text style={styles.bookAuthor}>
              by {fineDetails.borrowtransaction?.book?.author || 'Unknown Author'}
            </Text>
            <Text style={styles.bookId}>
              Book ID: {fineDetails.borrowtransaction?.book?.id || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Transaction Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Transaction Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID:</Text>
              <Text style={styles.detailValue}>
                {fineDetails.transactionId?.substring(0, 8) || 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Borrow Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(fineDetails.borrowtransaction?.borrowDate)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(fineDetails.borrowtransaction?.dueDate)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(fineDetails.borrowtransaction?.returnDate) || 'Not returned'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fine Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Fine Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Original Amount:</Text>
              <Text style={styles.detailValue}>₱{fineDetails.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Paid:</Text>
              <Text style={styles.detailValue}>₱{fineDetails.amountPaid.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Due:</Text>
              <Text style={[styles.detailValue, { color: '#ef4444', fontWeight: 'bold' }]}>
                ₱{fineDetails.amountDue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date Issued:</Text>
              <Text style={styles.detailValue}>{formatDate(fineDetails.dateIssued)}</Text>
            </View>
            {fineDetails.datePaid && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date Paid:</Text>
                <Text style={styles.detailValue}>{formatDate(fineDetails.datePaid)}</Text>
              </View>
            )}
            {fineDetails.paymentMethod && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{fineDetails.paymentMethod}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {fineDetails.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Notes</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{fineDetails.notes}</Text>
            </View>
          </View>
        )}

        {/* Payment Instructions */}
        {fineDetails.status === 'UNPAID' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Payment Instructions</Text>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>How to Pay This Fine</Text>
              <Text style={styles.paymentText}>
                1. Visit the library during operating hours{'\n'}
                2. Bring your student ID{'\n'}
                3. Show this screen to the librarian{'\n'}
                4. Pay the amount of ₱{fineDetails.amountDue.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Fines</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  content: { 
    flex: 1, 
    padding: 24 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  fineHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  fineIcon: {
    fontSize: 32,
    marginRight: 16
  },
  fineInfo: {
    flex: 1
  },
  fineType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  fineAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8
  },
  bookId: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16
  },
  notesText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20
  },
  paymentCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    padding: 20,
    borderRadius: 12
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 12
  },
  paymentText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20
  },
  backButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  }
});