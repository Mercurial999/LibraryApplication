import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';
import { formatPeso } from '../../utils/CurrencyUtils';

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
      
      // Get current user ID
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Fetch fines, overdue transactions, lost/damaged reports, and user profile
      const [finesResponse, overdueResponse, reportsResponse, profileResponse] = await Promise.all([
        ApiService.getFines(),
        ApiService.getOverdueTransactions(),
        ApiService.getLostDamagedReports('all'),
        ApiService.getUserProfile()
      ]);

      // Also try direct API calls to ensure we get the correct data
      let directReportsResponse = null;
      let directFinesResponse = null;
      
      try {
        // Direct call to lost/damaged reports
        const directReportsUrl = `${ApiService.API_BASE}/api/lost-damaged-reports?userId=${userId}`;
        console.log('🌐 Trying direct lost/damaged reports API:', directReportsUrl);
        
        const directReportsRes = await fetch(directReportsUrl, {
          headers: await ApiService.getAuthHeaders(),
        });
        
        if (directReportsRes.ok) {
          directReportsResponse = await directReportsRes.json();
          console.log('📋 Direct reports API response:', directReportsResponse);
        } else {
          console.log('⚠️ Direct reports API failed with status:', directReportsRes.status);
        }
      } catch (directErr) {
        console.log('⚠️ Direct reports API error:', directErr.message);
      }

      try {
        // Direct call to fines
        const directFinesUrl = `${ApiService.API_BASE}/api/fines?userId=${userId}&status=UNPAID`;
        console.log('🌐 Trying direct fines API:', directFinesUrl);
        
        const directFinesRes = await fetch(directFinesUrl, {
          headers: await ApiService.getAuthHeaders(),
        });
        
        if (directFinesRes.ok) {
          directFinesResponse = await directFinesRes.json();
          console.log('📋 Direct fines API response:', directFinesResponse);
        } else {
          console.log('⚠️ Direct fines API failed with status:', directFinesRes.status);
        }
      } catch (directErr) {
        console.log('⚠️ Direct fines API error:', directErr.message);
      }
      
      // Extract data from responses
      const fines = directFinesResponse || finesResponse.data || finesResponse || [];
      const overdueTransactions = overdueResponse.data || overdueResponse || [];
      const reports = directReportsResponse || reportsResponse.data || reportsResponse || [];
      const profileData = profileResponse.data || profileResponse || {};
      
      console.log('📊 Fines data loaded:', {
        fines: fines,
        overdueTransactions: overdueTransactions,
        reports: reports,
        profileData: profileData,
        directReportsUsed: !!directReportsResponse,
        directFinesUsed: !!directFinesResponse
      });
      
      // Get total fines from profile as fallback
      const profileTotalFines = profileData.statistics?.totalFines || 0;
      console.log('💰 Profile total fines:', profileTotalFines);
      
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
      
      // Calculate lost/damaged report fines
      console.log('📋 Processing reports for fines:', reports);
      
      const reportFines = reports
        .filter(report => {
          const fineAmount = report.fineAmount || 0;
          const status = String(report.status || 'PENDING').toUpperCase();
          const resolutionType = String(report.resolutionType || '').toUpperCase();
          
          console.log('📄 Report fine check:', {
            bookTitle: report.bookTitle,
            fineAmount,
            status,
            resolutionType,
            resolutionDate: report.resolutionDate,
            librarianName: report.librarianName
          });
          
          // Include reports with fines that are not fully resolved
          return fineAmount > 0 && (
            status === 'PENDING' || 
            status === 'ON_PROCESS' || 
            (status === 'RESOLVED' && (!report.resolutionDate || !report.librarianName))
          );
        })
        .reduce((sum, report) => {
          const fineAmount = report.fineAmount || 0;
          console.log('💰 Adding fine amount:', fineAmount, 'for book:', report.bookTitle);
          return sum + fineAmount;
        }, 0);
      
      console.log('💰 Total report fines calculated:', reportFines);
      
      // Use profile total fines as fallback if calculated fines are 0
      const finalTotalOutstanding = (totalOutstanding + overdueAmount + reportFines) || profileTotalFines;
      
      console.log('💰 Final calculation:', {
        calculatedFines: totalOutstanding + overdueAmount + reportFines,
        profileFines: profileTotalFines,
        finalTotal: finalTotalOutstanding
      });
      
      // Calculate actual unpaid count based on real unpaid items
      const actualUnpaidCount = unpaidFines.length + 
        (overdueTransactions.filter(t => {
          const daysOverdue = Math.max(0, Math.floor((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)) - 3);
          return daysOverdue > 0;
        }).length) +
        (reports.filter(r => r.status !== 'PAID' && r.status !== 'RESOLVED').length);
      
      setFinesData({
        totalOutstanding: finalTotalOutstanding,
        unpaidCount: actualUnpaidCount,
        paidCount: paidFines.length,
        totalFines: fines.length + overdueTransactions.length + reports.length,
        overdueTransactions: overdueTransactions,
        overdueAmount: overdueAmount,
        reportFines: reportFines,
        reports: reports,
        profileTotalFines: profileTotalFines
      });
    } catch (err) {
      console.error('Error loading fines data:', err);
      console.error('Full error details:', err);
      setError(err.message);
      Alert.alert('Error', `Failed to load fines data: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinesData();
  }, []);

  // Refresh data when screen comes into focus (e.g., returning from payment)
  useFocusEffect(
    useCallback(() => {
      loadFinesData();
    }, [])
  );

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
            {/* Main Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons name="currency-usd" size={24} color="#dc2626" />
                <Text style={styles.summaryTitle}>Total Outstanding</Text>
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.totalAmount}>{formatPeso(finesData.totalOutstanding)}</Text>
                <Text style={styles.summarySubtext}>
                {finesData.unpaidCount} {finesData.unpaidCount === 1 ? 'fine' : 'fines'} unpaid
              </Text>
              </View>
            </View>

            {/* Statistics Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.statNumber}>{finesData.unpaidCount}</Text>
                <Text style={styles.statLabel}>Unpaid</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
                <Text style={styles.statNumber}>{finesData.paidCount}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="file-document" size={20} color="#3b82f6" />
                <Text style={styles.statNumber}>{finesData.totalFines}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            {/* Action Cards */}
            <View style={styles.actionsSection}>
            <TouchableOpacity 
                style={styles.actionCard} 
              onPress={() => router.push('/fines/outstanding')}
            >
                <View style={styles.actionContent}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color="#3b82f6" />
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Fine Details</Text>
                    <Text style={styles.actionSubtitle}>View detailed breakdown of your fines</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.actionCard} 
              onPress={() => router.push('/fines/payment-history')}
            >
                <View style={styles.actionContent}>
                  <MaterialCommunityIcons name="chart-line" size={24} color="#3b82f6" />
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Payment History</Text>
                    <Text style={styles.actionSubtitle}>Track your payment records</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
            
              <TouchableOpacity style={styles.actionCard} onPress={handleDisputeFine}>
                <View style={styles.actionContent}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#d97706" />
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Dispute a Fine</Text>
                    <Text style={styles.actionSubtitle}>Contact library staff for disputes</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
            </View>

            {/* Overdue Transactions Section */}
            {finesData.overdueTransactions && finesData.overdueTransactions.length > 0 && (
              <View style={styles.overdueSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="book-alert" size={20} color="#dc2626" />
                  <Text style={styles.sectionTitle}>Overdue Books</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Books overdue after 3-day grace period
                </Text>
                
                {finesData.overdueTransactions.map((transaction, index) => {
                  const dueDate = new Date(transaction.dueDate);
                  const daysOverdue = Math.max(0, Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24)) - 3);
                  const fineAmount = daysOverdue * (transaction.dailyFineRate || 5);
                  
                  return (
                    <View key={transaction.id || index} style={styles.overdueCard}>
                      <View style={styles.bookHeader}>
                        <View style={styles.bookInfo}>
                          <Text style={styles.bookTitle} numberOfLines={2}>
                        {transaction.book?.title || 'Unknown Book'}
                      </Text>
                      <Text style={styles.bookAuthor}>
                        by {transaction.book?.author || 'Unknown Author'}
                      </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: '#dc2626' }]}>
                          <Text style={styles.statusText}>Overdue</Text>
                        </View>
                      </View>
                      
                      <View style={styles.overdueDetails}>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="calendar" size={16} color="#64748b" />
                          <Text style={styles.detailText}>
                          Due: {dueDate.toLocaleDateString()}
                        </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="clock-alert" size={16} color="#dc2626" />
                          <Text style={[styles.detailText, { color: '#dc2626' }]}>
                          {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Within grace period'}
                        </Text>
                        </View>
                        {daysOverdue > 0 && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="currency-usd" size={16} color="#dc2626" />
                            <Text style={[styles.detailText, { color: '#dc2626' }]}>
                            Fine: {formatPeso(fineAmount)}
                          </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Lost/Damaged Report Fines Section */}
            {finesData.reportFines > 0 && (
              <View style={styles.overdueSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="book-off" size={20} color="#dc2626" />
                  <Text style={styles.sectionTitle}>Lost/Damaged Book Fines</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Fines for books reported as lost or damaged
                </Text>
                
                {finesData.reports
                  .filter(report => {
                    const fineAmount = report.fineAmount || 0;
                    const status = String(report.status || 'PENDING').toUpperCase();
                    return fineAmount > 0 && (
                      status === 'PENDING' || 
                      status === 'ON_PROCESS' || 
                      (status === 'RESOLVED' && (!report.resolutionDate || !report.librarianName))
                    );
                  })
                  .map((report, index) => {
                    const status = String(report.status || 'PENDING').toUpperCase();
                    const resolutionType = String(report.resolutionType || '').toUpperCase();
                    
                    // Get status display info
                    const getStatusDisplay = (status, resolutionType, report) => {
                      switch (status) {
                        case 'PENDING':
                          return { text: 'Under Review', color: '#FFA500' };
                        case 'ON_PROCESS':
                          return { text: 'Processing Payment', color: '#3B82F6' };
                        case 'RESOLVED':
                          if (report.resolutionDate && report.librarianName) {
                            if (resolutionType === 'FINE_PAID_COMPLETE') {
                              return { text: 'Fine Paid Complete', color: '#28A745' };
                            } else if (resolutionType === 'FINE_PAID') {
                              return { text: 'Fine Paid', color: '#28A745' };
                            } else if (resolutionType === 'REPLACEMENT') {
                              return { text: 'Replacement Required', color: '#17A2B8' };
                            } else if (resolutionType === 'WAIVED') {
                              return { text: 'Fine Waived', color: '#17A2B8' };
                            } else if (resolutionType === 'PARTIAL_PAYMENT') {
                              return { text: 'Partial Payment', color: '#F59E0B' };
                            }
                            return { text: 'Resolved', color: '#28A745' };
                          } else {
                            return { text: 'Processing Payment', color: '#3B82F6' };
                          }
                        case 'CANCELLED':
                          return { text: 'Report Cancelled', color: '#6B7280' };
                        default:
                          return { text: 'Reported as ' + (report.reportType || 'LOST'), color: '#DC2626' };
                      }
                    };
                    
                    const statusDisplay = getStatusDisplay(status, resolutionType, report);
                    
                    return (
                      <View key={report.id || index} style={styles.overdueCard}>
                        <View style={styles.bookHeader}>
                          <View style={styles.bookInfo}>
                            <Text style={styles.bookTitle} numberOfLines={2}>
                              {report.bookTitle || 'Unknown Book'}
                            </Text>
                            <Text style={styles.bookAuthor}>
                              by {report.bookAuthor || 'Unknown Author'}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
                            <Text style={styles.statusText}>{statusDisplay.text}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.overdueDetails}>
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="book-off" size={16} color="#64748b" />
                            <Text style={styles.detailText}>
                              {report.reportType === 'LOST' ? 'Lost' : 'Damaged'} Book
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="calendar" size={16} color="#64748b" />
                            <Text style={styles.detailText}>
                              Reported: {new Date(report.reportDate).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="currency-usd" size={16} color="#dc2626" />
                            <Text style={[styles.detailText, { color: '#dc2626' }]}>
                              Fine: {formatPeso(report.fineAmount || 0)}
                            </Text>
                          </View>
                          {report.description && (
                            <View style={styles.detailItem}>
                              <MaterialCommunityIcons name="text" size={16} color="#64748b" />
                              <Text style={styles.detailText} numberOfLines={2}>
                                {report.description}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {finesData.unpaidCount > 0 && (
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#d97706" />
                  <Text style={styles.warningTitle}>Payment Reminder</Text>
                </View>
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
    padding: 20 
  },
  
  // Loading States
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
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600'
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

  // Statistics Cards
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Action Cards
  actionsSection: {
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },

  // Warning Card
  warningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },

  // Overdue Section
  overdueSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991b1b',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 16,
    fontStyle: 'italic',
  },

  // Overdue Cards
  overdueCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
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
    fontWeight: '600',
  },
  overdueDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default FinesScreen;