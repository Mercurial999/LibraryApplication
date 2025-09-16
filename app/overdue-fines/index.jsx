import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';
import { formatPeso } from '../../utils/CurrencyUtils';

// Lazy import components to avoid circular deps during creation

export default function OverdueFinesScreen() {
  const router = useRouter();
  const [overdueData, setOverdueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchOverdueData = useCallback(async () => {
    try {
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Try the overdue-fines API first
      try {
        const res = await fetch(`${ApiService.API_BASE}/api/mobile/users/${userId}/overdue-fines`, {
          headers: await ApiService.getAuthHeaders()
        });
        const data = await ApiService.handleApiResponse(res, 'overdue-fines');
        console.log('🔍 Overdue-fines API response:', data);
        setOverdueData(data.data);
      } catch (overdueErr) {
        console.log('⚠️ Overdue-fines API failed, trying alternative approach:', overdueErr.message);
        
        // Fallback: Use the same approach as the fines page
        const [finesResponse, overdueResponse, lostReportsResponse] = await Promise.all([
          ApiService.getFines(),
          ApiService.getOverdueTransactions(),
          ApiService.getLostDamagedReports('all').catch(() => ({ data: [] }))
        ]);

        console.log('🔍 Fines response:', finesResponse);
        console.log('🔍 Overdue response:', overdueResponse);
        console.log('🔍 Lost reports response:', lostReportsResponse);

        // Get current user to filter lost reports
        const currentUser = await ApiService.getCurrentUser();
        const userId = currentUser?.id;

        // Filter lost reports for current user and create overdue book entries
        const lostReports = Array.isArray(lostReportsResponse) 
          ? lostReportsResponse 
          : (lostReportsResponse?.data || []);
        
        const userLostReports = lostReports.filter(report => 
          String(report.userId || report.user_id) === String(userId) &&
          report.reportType === 'LOST' &&
          report.status === 'PROCESSED'
        );

        // Convert lost reports to overdue book format for consistency
        const lostBooksAsOverdue = userLostReports.map(report => ({
          id: report.id,
          title: report.bookTitle || 'Unknown Book',
          author: report.bookAuthor || 'Unknown Author',
          dueDate: report.dueDate || new Date().toISOString(),
          fine: {
            id: `lost_fine_${report.id}`,
            amount: report.fineAmount || report.replacementCost || 0
          },
          isLost: true,
          reportDate: report.reportDate
        }));

        // Combine overdue books with lost books
        const allOverdueBooks = [
          ...(overdueResponse?.data || []),
          ...lostBooksAsOverdue
        ];

        // Create a mock overdue data structure
        const mockOverdueData = {
          overdueBooks: allOverdueBooks,
          finesSummary: {
            totalAmount: 0,
            unpaidCount: 0
          }
        };

        setOverdueData(mockOverdueData);
      }
    } catch (err) {
      console.error('Error fetching overdue data:', err);
      Alert.alert('Error', err.message || 'Failed to load overdue & fines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdueData();
  }, [fetchOverdueData]);

  // Refresh data when screen comes into focus (e.g., returning from payment)
  useFocusEffect(
    useCallback(() => {
      fetchOverdueData();
    }, [fetchOverdueData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOverdueData();
    setRefreshing(false);
  }, [fetchOverdueData]);

  const handlePayFine = (fineId) => {
    // Navigate to payment screen once available
    Alert.alert('Pay Fine', 'Payment screen coming soon.');
  };

  const handleViewDetails = (bookId) => {
    router.push(`/overdue-fines/details?id=${encodeURIComponent(bookId)}`);
  };

  // Calculate total fines from overdue books
  const calculateTotalFines = () => {
    if (!overdueData?.overdueBooks) {
      console.log('🔍 No overdue books data available');
      return 0;
    }
    
    console.log('🔍 Overdue books data:', overdueData.overdueBooks);
    
    const total = overdueData.overdueBooks.reduce((total, book) => {
      const fineAmount = book.fine?.amount || 0;
      console.log(`🔍 Book "${book.title}" fine amount:`, fineAmount);
      return total + fineAmount;
    }, 0);
    
    console.log('🔍 Total calculated fines:', total);
    return total;
  };

  // Calculate unpaid fines count
  const calculateUnpaidCount = () => {
    if (!overdueData?.overdueBooks) {
      console.log('🔍 No overdue books data for count calculation');
      return 0;
    }
    
    const unpaidCount = overdueData.overdueBooks.filter(book => {
      const fineAmount = book.fine?.amount || 0;
      return fineAmount > 0;
    }).length;
    
    console.log('🔍 Unpaid fines count:', unpaidCount);
    return unpaidCount;
  };

  if (loading) {
    return (
      <View style={styles.centered}> 
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading overdue & fines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Overdue & Fines"
        subtitle="Your fines summary and overdue books"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} currentRoute={'/overdue-fines'} />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Fines Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="currency-usd" size={24} color="#dc2626" />
            <Text style={styles.summaryTitle}>Fines Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.totalAmount}>
              {formatPeso(calculateTotalFines())}
            </Text>
            <Text style={styles.summarySubtext}>
              {calculateUnpaidCount()} unpaid fines
            </Text>
            <TouchableOpacity 
              style={styles.paymentHistoryButton}
              onPress={() => router.push('/fines/payment-history')}
            >
              <MaterialCommunityIcons name="history" size={16} color="#3b82f6" />
              <Text style={styles.paymentHistoryText}>View Payment History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overdue Books Section */}
        <View style={styles.overdueSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="book-alert" size={20} color="#dc2626" />
          <Text style={styles.sectionTitle}>Overdue Books</Text>
          </View>
          
          {overdueData?.overdueBooks?.length ? (
            overdueData.overdueBooks.map((book) => (
              <View key={book.id} style={styles.overdueCard}>
                <View style={styles.bookHeader}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {book.title || 'Unknown Book'}
                    </Text>
                    <Text style={styles.bookAuthor}>
                      by {book.author || 'Unknown Author'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: book.isLost ? '#7c2d12' : '#dc2626' 
                  }]}>
                    <Text style={styles.statusText}>
                      {book.isLost ? 'Lost' : 'Overdue'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookDetails}>
                  {book.isLost ? (
                    <>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="book-off" size={16} color="#7c2d12" />
                        <Text style={[styles.detailText, { color: '#7c2d12' }]}>
                          Book reported as lost
                        </Text>
                      </View>
                      {book.reportDate && (
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="calendar" size={16} color="#64748b" />
                          <Text style={styles.detailText}>
                            Reported: {new Date(book.reportDate).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#64748b" />
                        <Text style={styles.detailText}>
                          Due: {new Date(book.dueDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="clock-alert" size={16} color="#dc2626" />
                        <Text style={[styles.detailText, { color: '#dc2626' }]}>
                          {book.daysOverdue || 0} days overdue
                        </Text>
                      </View>
                    </>
                  )}
                  {book.fine && (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="currency-usd" size={16} color="#dc2626" />
                      <Text style={[styles.detailText, { color: '#dc2626' }]}>
                        Fine: {formatPeso(book.fine.amount || 0)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => handleViewDetails(book.id)}
                  >
                    <MaterialCommunityIcons name="eye" size={16} color="#ffffff" />
                    <Text style={styles.actionButtonText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.payButton]}
                    onPress={() => handlePayFine(book.fine?.id)}
                  >
                    <MaterialCommunityIcons name="credit-card" size={16} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Pay Fine</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle" size={48} color="#059669" />
              <Text style={styles.emptyTitle}>No Overdue Books</Text>
              <Text style={styles.emptySubtitle}>Great job! All your books are returned on time.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#f8fafc', 
    flex: 1 
  },
  scroll: { 
    padding: 20 
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  summaryContent: {
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  paymentHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentHistoryText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 6,
  },

  // Overdue Section
  overdueSection: { 
    marginTop: 24 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { 
    color: '#1e293b', 
    fontSize: 20, 
    fontWeight: '700', 
    marginLeft: 8,
  },

  // Overdue Cards
  overdueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Book Details
  bookDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewButton: {
    backgroundColor: '#3b82f6',
  },
  payButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Loading States
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 64, 
    backgroundColor: '#f8fafc' 
  },
  loadingText: { 
    marginTop: 16, 
    color: '#64748b',
    fontSize: 16,
  },
});


