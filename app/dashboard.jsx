import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../components/Header';
import ApiService from '../services/ApiService';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    borrowedCount: 0,
    overdueCount: 0,
    pendingRequestsCount: 0,
    recommendationsCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-280)).current;

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
          pendingRequestsCount: statsResponse.data.pendingRequestsCount || 0,
          recommendationsCount: statsResponse.data.recommendationsCount || 0
        });
      }

      // Get recent activity using new mobile API
      const activityResponse = await ApiService.getRecentActivity(null, 5);
      if (activityResponse.success && activityResponse.data && activityResponse.data.activities) {
        setRecentActivity(activityResponse.data.activities);
      } else {
        // Fallback: get user books and create activity from that
        const userBooksResponse = await ApiService.getUserBooks(null, 'all', true);
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

  useEffect(() => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible, slideAnim]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'borrowed': return '📚';
      case 'returned': return '✅';
      case 'overdue': return '⏰';
      case 'requested': return '📋';
      case 'renewed': return '🔄';
      default: return '📖';
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

const menuItems = [
  { label: 'Dashboard', route: '/dashboard', icon: '🏠' },
  { label: 'Book Catalog', route: '/book-catalog', icon: '📚' },
  { label: 'My Books', route: '/borrowing/my-books', icon: '📖' },
  { label: 'Book Reservation', route: '/borrowing/reserve', icon: '🔖' },
  { label: 'Overdue Fines', route: '/fines', icon: '💰' },
  { label: 'Recommendations', route: '/recommendations', icon: '⭐' },
  { label: 'Reports', route: '/reports', icon: '📊' },
  { label: 'Teacher Requests', route: '/teacher-requests', icon: '👨‍🏫' },
  { label: 'Notifications', route: '/notifications', icon: '🔔' },
  { label: 'Account', route: '/account', icon: '👤' },
  { label: 'Logout', route: '/login', icon: '🚪' },
];

  return (
    <View style={styles.container}>
      {/* Header with Notification Button */}
      <Header 
        title="Library Dashboard"
        subtitle={`Welcome back, ${userData?.fullName || userData?.firstName || 'User'}!`}
        onMenuPress={() => setMenuVisible(true)}
      />

      {/* Enhanced Sidebar Menu */}
      <Modal
        visible={menuVisible}
        animationType="none"
        transparent
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.overlay}>
          <Animated.View style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.menuHeader}>
              <Image 
                source={require('../assets/profile-placeholder.png')} 
                style={styles.menuProfileImage} 
              />
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName}>
                  {userData?.fullName || userData?.firstName || 'User Name'}
                </Text>
                <Text style={styles.menuUserId}>
                  ID: {userData?.id || '000000'}
                </Text>
                <Text style={styles.menuUserRole}>
                  {userData?.role || 'Student'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.menuCloseButton}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.menuCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.menuHint}>
              <Text style={styles.menuHintText}>💡 Tap menu items to navigate</Text>
            </View>
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => {
                  // Don't close the sidebar - keep it open for faster navigation
                  router.push(item.route);
                }}
              >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </Animated.View>
          <Pressable style={styles.overlayPressable} onPress={() => setMenuVisible(false)} />
          </View>
      </Modal>

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
                    <Text style={styles.statIcon}>📚</Text>
                  </View>
                  <Text style={styles.statValue}>{stats.borrowedCount}</Text>
                  <Text style={styles.statLabel}>Books Borrowed</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/fines')}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>⚠️</Text>
                  </View>
                  <Text style={styles.statValue}>{stats.overdueCount}</Text>
                  <Text style={styles.statLabel}>Overdue</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/borrowing/my-requests')}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>📋</Text>
                  </View>
                  <Text style={styles.statValue}>{stats.pendingRequestsCount}</Text>
                  <Text style={styles.statLabel}>Pending Requests</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/recommendations')}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>⭐</Text>
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
                  <Text style={styles.actionButtonIcon}>🔍</Text>
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
                   <Text style={styles.activityIcon}>
                     {activity.icon || getActivityIcon(activity.type)}
                   </Text>
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
  


  // Enhanced Sidebar
  overlay: { 
    flex: 1, 
    flexDirection: 'row' 
  },
  overlayPressable: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  menu: { 
    width: 280, 
    backgroundColor: '#1e293b', 
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  menuHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center'
  },
  menuProfileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16
  },
  menuUserInfo: {
    alignItems: 'center'
  },
  menuUserName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  menuUserId: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 2
  },
  menuUserRole: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  menuCloseButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155'
  },
  menuCloseIcon: {
    fontSize: 20,
    color: '#ffffff'
  },
  menuHint: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#262626',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  menuHintText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic'
  },
  menuScroll: {
    flex: 1,
    paddingTop: 16
  },
  menuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: 'transparent'
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center'
  },
  menuItemText: { 
    color: '#e2e8f0', 
    fontSize: 16,
    fontWeight: '500'
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
  statIcon: {
    fontSize: 24
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
});

export default DashboardScreen;