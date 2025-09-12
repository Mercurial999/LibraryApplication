import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ApiService from '../services/ApiService';
import { getFallbackRecommendations, getIntelligentRecommendations } from '../services/RecoService';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    borrowedCount: 0,
    overdueCount: 0,
    pendingBorrowRequestsCount: 0,
    pendingBookRequestsCount: 0,
    recommendationsCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [borrowingHistory, setBorrowingHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Load borrowing history
  const loadBorrowingHistory = async () => {
    try {
      setHistoryLoading(true);
      const currentUser = await ApiService.getCurrentUser();
      if (!currentUser) return;

      // Get comprehensive borrowing history
      const response = await ApiService.getUserBooks(currentUser.id, { status: 'all', includeHistory: true });
      if (response.success && response.data) {
        const allBooks = [
          ...(response.data.borrowedBooks || []),
          ...(response.data.returnedBooks || []),
          ...(response.data.overdueBooks || [])
        ];

        // Sort by borrow date (most recent first)
        const sortedHistory = allBooks.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
        setBorrowingHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Error loading borrowing history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load request counts
  const loadRequestCounts = async () => {
    try {
      // Load borrow requests count
      const borrowRequestsResponse = await ApiService.getBorrowRequests('pending');
      let pendingBorrowCount = 0;
      if (borrowRequestsResponse.success && borrowRequestsResponse.data && borrowRequestsResponse.data.requests) {
        pendingBorrowCount = borrowRequestsResponse.data.requests.length;
      }

      // Load book requests count (for teachers only)
      let pendingBookCount = 0;
      if (userData?.role === 'TEACHER') {
        try {
          const bookRequestsResponse = await ApiService.getBookRequests();
          if (bookRequestsResponse.success && bookRequestsResponse.data) {
            const bookRequests = Array.isArray(bookRequestsResponse.data) ? bookRequestsResponse.data : bookRequestsResponse.data.requests || [];
            pendingBookCount = bookRequests.filter(request => {
              const s = String(request.status || '').toUpperCase();
              return s === 'PENDING' || s === 'UNDER_REVIEW';
            }).length;
          }
        } catch (error) {
          console.log('Book requests not available for this user role');
        }
      }

      setStats(prev => ({
        ...prev,
        pendingBorrowRequestsCount: pendingBorrowCount,
        pendingBookRequestsCount: pendingBookCount
      }));
    } catch (error) {
      console.error('Error loading request counts:', error);
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load auth token
      await ApiService.loadAuthToken();

      // Get current user data
      const currentUser = await ApiService.getCurrentUser();
      setUserData(currentUser);

      // Get dashboard statistics using new mobile API
      const statsResponse = await ApiService.getDashboardStats();
      if (statsResponse.success && statsResponse.data) {
        setStats({
          borrowedCount: statsResponse.data.borrowedCount || 0,
          overdueCount: statsResponse.data.overdueCount || 0,
          pendingBorrowRequestsCount: statsResponse.data.pendingBorrowRequestsCount || 0,
          pendingBookRequestsCount: statsResponse.data.pendingBookRequestsCount || 0,
          recommendationsCount: statsResponse.data.recommendationsCount || 0
        });
      }
      // Load recommendations using intelligent API first, then fallback
      try {
        let count = 0;
        try {
          const intelligent = await getIntelligentRecommendations();
          if (Array.isArray(intelligent)) {
            count = intelligent.length;
          } else if (intelligent && Array.isArray(intelligent.recommendations)) {
            count = intelligent.recommendations.length;
          }
        } catch {
          // fallback
          const recoResult = await getFallbackRecommendations();
          const recos = Array.isArray(recoResult?.recommendations) ? recoResult.recommendations : [];
          count = recos.length;
        }
        setStats(prev => ({ ...prev, recommendationsCount: count }));
      } catch (e) {
        // ignore reco errors in dashboard
      }


      // Load additional request counts
      await loadRequestCounts();

      // Get recent activity using new mobile API
      const activityResponse = await ApiService.getRecentActivity(null, 5);
      if (activityResponse.success && activityResponse.data && activityResponse.data.activities) {
        setRecentActivity(activityResponse.data.activities);
      } else {
        // Fallback: get user books and create activity from that
        const current = currentUser || await ApiService.getCurrentUser();
        const userBooksResponse = await ApiService.getUserBooks(current?.id, { status: 'all', includeHistory: true });
        if (userBooksResponse.success && userBooksResponse.data) {
          const activities = [];
          
          // Add borrowed books as activities
          if (userBooksResponse.data.borrowedBooks) {
            userBooksResponse.data.borrowedBooks.forEach(book => {
              activities.push({
                id: book.id,
                type: 'borrowed',
                title: book.bookTitle,
                subtitle: `Due in ${book.daysRemaining} days`,
                status: 'Borrowed',
                icon: '📚',
                date: book.borrowDate
              });
            });
          }

          // Add returned books as activities
          if (userBooksResponse.data.returnedBooks) {
            userBooksResponse.data.returnedBooks.slice(0, 2).forEach(book => {
              activities.push({
                id: book.id,
                type: 'returned',
                title: book.bookTitle,
                subtitle: 'Returned successfully',
                status: 'Completed',
                icon: '✅',
                date: book.returnDate
              });
            });
          }

          // Add overdue books as activities
          if (userBooksResponse.data.overdueBooks) {
            userBooksResponse.data.overdueBooks.forEach(book => {
              activities.push({
                id: book.id,
                type: 'overdue',
                title: book.bookTitle,
                subtitle: `Overdue - Fine: $${book.fineAmount}`,
                status: 'Overdue',
                icon: '⏰',
                date: book.dueDate
              });
            });
          }

          setRecentActivity(activities.slice(0, 5));
        }
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);


  const getActivityIcon = (type) => {
    switch (type) {
      case 'borrowed': return 'book-outline';
      case 'returned': return 'check-circle-outline';
      case 'overdue': return 'bell-alert-outline';
      case 'requested': return 'clipboard-text-outline';
      case 'renewed': return 'autorenew';
      default: return 'book-open-variant';
    }
  };

  const getActivityStatusColor = (status) => {
    switch (status) {
      case 'Borrowed': return '#3b82f6';
      case 'Completed': return '#10b981';
      case 'Overdue': return '#ef4444';
      case 'Pending': return '#f59e0b';
      default: return '#3b82f6';
    }
  };


  return (
    <View style={styles.container}>
      {/* Header with Notification Button */}
      <Header 
        title="Library Dashboard"
        subtitle={`Welcome back, ${userData?.fullName || userData?.firstName || 'User'}!`}
        onMenuPress={() => setMenuVisible(true)}
      />

      {/* Sidebar Menu */}
      <Sidebar 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute="/dashboard"
      />

      {/* Enhanced Main Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDashboardData} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={loadDashboardData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick Stats Section */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Quick Overview</Text>
              <View style={styles.statsGrid}>
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/borrowing/my-books')}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="book-outline" size={22} color="#1e293b" />
                  </View>
                  <Text style={styles.statValue}>{stats.borrowedCount}</Text>
                  <Text style={styles.statLabel}>Books Borrowed</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/overdue-fines')}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#1e293b" />
                  </View>
                  <Text style={styles.statValue}>{stats.overdueCount}</Text>
                  <Text style={styles.statLabel}>Overdue</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/borrowing/my-requests')}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#1e293b" />
                  </View>
                  <Text style={styles.statValue}>{stats.pendingBorrowRequestsCount}</Text>
                  <Text style={styles.statLabel}>Borrow Requests</Text>
                </TouchableOpacity>
                
                {userData?.role === 'TEACHER' && (
                  <TouchableOpacity style={styles.statCard} onPress={() => router.push('/teacher-requests')}>
                    <View style={styles.statIconContainer}>
                      <MaterialCommunityIcons name="book-open-variant" size={22} color="#1e293b" />
                    </View>
                    <Text style={styles.statValue}>{stats.pendingBookRequestsCount}</Text>
                    <Text style={styles.statLabel}>Book Requests</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/recommendations')}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="star-outline" size={22} color="#1e293b" />
                  </View>
                  <Text style={styles.statValue}>{stats.recommendationsCount}</Text>
                  <Text style={styles.statLabel}>Recommendations</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions Section */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => router.push('/book-catalog')}
                >
                  <MaterialCommunityIcons name="magnify" size={24} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Browse Books</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity Section */}
            <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => router.push('/borrowing/my-books')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <View key={activity.id || index} style={styles.activityCard}>
                    <View style={styles.activityIconContainer}>
                      <MaterialCommunityIcons name={getActivityIcon(activity.type)} size={20} color="#1e293b" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                      <Text style={[
                        styles.activityStatus,
                        { 
                          color: getActivityStatusColor(activity.status),
                          backgroundColor: `${getActivityStatusColor(activity.status)}20`
                        }
                      ]}>
                        {activity.status}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyActivityContainer}>
                  <Text style={styles.emptyActivityText}>No recent activity</Text>
                  <Text style={styles.emptyActivitySubtext}>Your library activity will appear here</Text>
                </View>
              )}
            </View>

            {/* Borrowing History Section */}
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Borrowing History</Text>
                <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
                  <Text style={styles.viewAllText}>
                    {showHistory ? 'Hide' : 'View All'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {showHistory ? (
                <View style={styles.historyContainer}>
                  {historyLoading ? (
                    <View style={styles.historyLoadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.historyLoadingText}>Loading history...</Text>
                    </View>
                  ) : borrowingHistory.length > 0 ? (
                    borrowingHistory.slice(0, 10).map((book, index) => (
                      <View key={book.id || index} style={styles.historyCard}>
                        <View style={styles.historyIconContainer}>
                          <MaterialCommunityIcons 
                            name={book.status === 'returned' ? 'check-circle' : book.status === 'overdue' ? 'alert-circle' : 'book'} 
                            size={20} 
                            color={book.status === 'returned' ? '#10b981' : book.status === 'overdue' ? '#ef4444' : '#3b82f6'} 
                          />
                        </View>
                        <View style={styles.historyContent}>
                          <Text style={styles.historyTitle} numberOfLines={1}>
                            {book.bookTitle || book.title}
                          </Text>
                          <Text style={styles.historyAuthor} numberOfLines={1}>
                            by {book.bookAuthor || book.author}
                          </Text>
                          <View style={styles.historyDetails}>
                            <Text style={styles.historyDate}>
                              Borrowed: {new Date(book.borrowDate).toLocaleDateString()}
                            </Text>
                            {book.returnDate && (
                              <Text style={styles.historyDate}>
                                Returned: {new Date(book.returnDate).toLocaleDateString()}
                              </Text>
                            )}
                            <Text style={styles.historyDate}>
                              Due: {new Date(book.dueDate).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={[
                            styles.historyStatus,
                            { 
                              backgroundColor: book.status === 'returned' ? '#10b981' : book.status === 'overdue' ? '#ef4444' : '#3b82f6'
                            }
                          ]}>
                            <Text style={styles.historyStatusText}>
                              {book.status === 'returned' ? 'Returned' : book.status === 'overdue' ? 'Overdue' : 'Borrowed'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyHistoryContainer}>
                      <Text style={styles.emptyHistoryText}>No borrowing history</Text>
                      <Text style={styles.emptyHistorySubtext}>Your borrowing history will appear here</Text>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.historyToggleButton}
                  onPress={() => {
                    if (!showHistory) {
                      loadBorrowingHistory();
                    }
                    setShowHistory(!showHistory);
                  }}
                >
                  <MaterialCommunityIcons name="history" size={20} color="#3b82f6" />
                  <Text style={styles.historyToggleText}>View Complete Borrowing History</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
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
  



  // Enhanced Main Content
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20
  },
  
  // Stats Section
  statsSection: {
    marginTop: 24,
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500'
  },

  // Actions Section
  actionsSection: {
    marginBottom: 32
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },

  // Activity Section
  activitySection: {
    marginBottom: 32
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  viewAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600'
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  activityIcon: {
    fontSize: 20
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyActivityContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyActivityText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8,
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // Borrowing History Section
  historySection: {
    marginBottom: 32
  },
  historyContainer: {
    marginTop: 16
  },
  historyLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20
  },
  historyLoadingText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 14
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  historyContent: {
    flex: 1
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2
  },
  historyAuthor: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8
  },
  historyDetails: {
    marginBottom: 8
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  historyStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  historyToggleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  historyToggleText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b'
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#94a3b8'
  }
});

export default DashboardScreen;