import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';
import { formatPeso } from '../../utils/CurrencyUtils';

export default function PaymentHistoryScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [paidFines, setPaidFines] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const router = useRouter();

  const loadPaymentHistory = async () => {
    try {
      setError(null);
      const allFines = await ApiService.getFines();
      
      // Filter for paid fines only
      const paid = allFines.filter(fine => fine.status === 'PAID');
      
      setPaidFines(paid);
      setTotalPaid(paid.reduce((sum, fine) => sum + fine.amountPaid, 0));
    } catch (err) {
      console.error('Error loading payment history:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load payment history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPaymentHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <View style={styles.container}>
      <Header 
        title="Payment History"
        subtitle="Your paid fines and transactions"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/fines"
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading payment history...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={loadPaymentHistory} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Paid</Text>
              <Text style={styles.summaryAmount}>{formatPeso(totalPaid)}</Text>
              <Text style={styles.summarySubtext}>
                {paidFines.length} {paidFines.length === 1 ? 'payment' : 'payments'} completed
              </Text>
            </View>

            {paidFines.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Payment History</Text>
                <Text style={styles.emptyText}>
                  You haven't made any fine payments yet. Your payment history will appear here once you settle any fines.
                </Text>
              </View>
            ) : (
              paidFines.map(fine => (
                <View key={fine.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentIcon}>
                      {getFineTypeIcon(fine.fineType)}
                    </Text>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.bookTitle}>
                        {fine.borrowtransaction?.book?.title || 'Unknown Book'}
                      </Text>
                      <Text style={styles.fineType}>
                        {fine.fineType || 'Overdue Fine'}
                      </Text>
                    </View>
                    <Text style={styles.paymentAmount}>
                      {formatPeso(fine.amountPaid)}
                    </Text>
                  </View>
                  
                  <View style={styles.paymentDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Date:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(fine.datePaid)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Original Amount:</Text>
                      <Text style={styles.detailValue}>
                        {formatPeso(fine.amount)}
                      </Text>
                    </View>
                    {fine.paymentMethod && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Method:</Text>
                        <Text style={styles.detailValue}>
                          {fine.paymentMethod}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fine Issued:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(fine.dateIssued)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>✅ Paid</Text>
                  </View>
                </View>
              ))
            )}

            {paidFines.length > 0 && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>💡 Payment Records</Text>
                <Text style={styles.infoText}>
                  All your fine payments are recorded here. Keep this information for your records. 
                  If you need a receipt, please contact the library staff.
                </Text>
              </View>
            )}
          </>
        )}
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
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryTitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4
  },
  summarySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 12
  },
  paymentInfo: {
    flex: 1
  },
  bookTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 4
  },
  fineType: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981'
  },
  paymentDetails: {
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600'
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    marginTop: 16
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20
  }
});