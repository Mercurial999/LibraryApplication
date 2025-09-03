import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const FinesScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [finesData, setFinesData] = useState({
    totalOutstanding: 0,
    unpaidCount: 0,
    paidCount: 0,
    totalFines: 0
  });
  const router = useRouter();

  const loadFinesData = async () => {
    try {
      setError(null);
      
      // Fetch both fines and overdue transactions
      const [finesResponse, overdueResponse] = await Promise.all([
        ApiService.getFines(),
        ApiService.getOverdueTransactions()
      ]);
      
      // Extract data from responses
      const fines = finesResponse.data || finesResponse || [];
      const overdueTransactions = overdueResponse.data || overdueResponse || [];
      
      // Calculate totals
      const unpaidFines = fines.filter(fine => fine.status === 'UNPAID');
      const paidFines = fines.filter(fine => fine.status === 'PAID');
      
      const totalOutstanding = unpaidFines.reduce((sum, fine) => sum + (fine.amountDue || 0), 0);
      const totalPaid = paidFines.reduce((sum, fine) => sum + (fine.amountPaid || 0), 0);
      
      // Calculate overdue amounts (if not already included in fines)
      const overdueAmount = overdueTransactions.reduce((sum, transaction) => {
        const daysOverdue = Math.max(0, Math.floor((new Date() - new Date(transaction.dueDate)) / (1000 * 60 * 60 * 24)) - 3);
        return sum + (daysOverdue * (transaction.dailyFineRate || 5)); // Default ₱5 per day after 3-day grace
      }, 0);
      
      setFinesData({
        totalOutstanding: totalOutstanding + overdueAmount,
        unpaidCount: unpaidFines.length + (overdueAmount > 0 ? 1 : 0),
        paidCount: paidFines.length,
        totalFines: fines.length + (overdueAmount > 0 ? 1 : 0),
        overdueTransactions: overdueTransactions,
        overdueAmount: overdueAmount
      });
    } catch (err) {
      console.error('Error loading fines data:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load fines data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinesData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFinesData();
  };

  const handleDisputeFine = () => {
    Alert.alert(
      'Dispute Fine',
      'To dispute a fine, please contact the library staff directly or visit the library during operating hours.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Overdue Fines"
        subtitle="Manage your library fines"
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
            <Text style={styles.loadingText}>Loading fines data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={loadFinesData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Total Outstanding</Text>
              <Text style={styles.amount}>₱{finesData.totalOutstanding.toFixed(2)}</Text>
              <Text style={styles.subLabel}>
                {finesData.unpaidCount} {finesData.unpaidCount === 1 ? 'fine' : 'fines'} unpaid
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{finesData.unpaidCount}</Text>
                <Text style={styles.statLabel}>Unpaid</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{finesData.paidCount}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{finesData.totalFines}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.row} 
              onPress={() => router.push('/fines/outstanding')}
            >
              <Text style={styles.link}>📋 Fine Details</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.row} 
              onPress={() => router.push('/fines/payment-history')}
            >
              <Text style={styles.link}>📊 Payment History</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.row} onPress={handleDisputeFine}>
              <Text style={styles.link}>⚠️ Dispute a Fine</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            {/* Overdue Transactions Section */}
            {finesData.overdueTransactions && finesData.overdueTransactions.length > 0 && (
              <View style={styles.overdueSection}>
                <Text style={styles.sectionTitle}>📚 Overdue Books</Text>
                <Text style={styles.sectionSubtitle}>
                  Books overdue after 3-day grace period
                </Text>
                
                {finesData.overdueTransactions.map((transaction, index) => {
                  const dueDate = new Date(transaction.dueDate);
                  const daysOverdue = Math.max(0, Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24)) - 3);
                  const fineAmount = daysOverdue * (transaction.dailyFineRate || 5);
                  
                  return (
                    <View key={transaction.id || index} style={styles.overdueCard}>
                      <Text style={styles.bookTitle}>
                        {transaction.book?.title || 'Unknown Book'}
                      </Text>
                      <Text style={styles.bookAuthor}>
                        by {transaction.book?.author || 'Unknown Author'}
                      </Text>
                      <View style={styles.overdueDetails}>
                        <Text style={styles.dueDate}>
                          Due: {dueDate.toLocaleDateString()}
                        </Text>
                        <Text style={styles.daysOverdue}>
                          {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Within grace period'}
                        </Text>
                        {daysOverdue > 0 && (
                          <Text style={styles.fineAmount}>
                            Fine: ₱{fineAmount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {finesData.unpaidCount > 0 && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>⚠️ Payment Reminder</Text>
                <Text style={styles.warningText}>
                  You have {finesData.unpaidCount} unpaid fine{finesData.unpaidCount > 1 ? 's' : ''}. 
                  Please settle your fines to avoid restrictions on borrowing privileges.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

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
  card: { 
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
  label: { 
    fontSize: 16, 
    color: '#64748b', 
    marginBottom: 8,
    fontWeight: '500'
  },
  amount: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    color: '#ef4444', 
    marginBottom: 4 
  },
  subLabel: { 
    fontSize: 14, 
    color: '#94a3b8',
    fontWeight: '500'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  row: { 
    backgroundColor: '#ffffff',
    padding: 20, 
    borderBottomWidth: 1, 
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  link: { 
    color: '#3b82f6', 
    fontWeight: '600',
    fontSize: 16
  },
  arrow: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold'
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    marginTop: 16
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20
  },

  // Overdue Section Styles
  overdueSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 16,
    fontStyle: 'italic'
  },
  overdueCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic'
  },
  overdueDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  dueDate: {
    fontSize: 12,
    color: '#6b7280'
  },
  daysOverdue: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500'
  },
  fineAmount: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600'
  }
});

export default FinesScreen;