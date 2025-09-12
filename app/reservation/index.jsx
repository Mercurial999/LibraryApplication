import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const ReservationScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('AVAILABLE'); // AVAILABLE | MY_RESERVATIONS
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const router = useRouter();

  // Filter books when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBooks(borrowedBooks);
    } else {
      const filtered = borrowedBooks.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBooks(filtered);
    }
  }, [searchQuery, borrowedBooks]);

  const loadBorrowedBooks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('🔍 Loading borrowed books for reservation...');
      
      // Get books that have borrowed copies (unavailable for direct borrowing)
      const response = await ApiService.getBorrowedBooks({ 
        limit: 1000
      });

      if (response.success && response.data && response.data.books) {
        console.log(`📚 Found ${response.data.books.length} books with borrowed copies`);
        console.log('📋 Sample borrowed book:', response.data.books[0]);
        setBorrowedBooks(response.data.books);
        setFilteredBooks(response.data.books);
      } else {
        console.log('⚠️ No borrowed books found or API error');
        console.log('📋 Response data:', response);
        setBorrowedBooks([]);
        setFilteredBooks([]);
      }
    } catch (error) {
      console.error('❌ Error loading borrowed books:', error);
      Alert.alert(
        'Error',
        'Failed to load borrowed books. Please try again.',
        [{ text: 'OK' }]
      );
      setBorrowedBooks([]);
      setFilteredBooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMyReservations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('🔍 Loading user reservations...');
      
      const response = await ApiService.getUserReservations();

      if (response.success && response.data && response.data.reservations) {
        console.log(`📚 Found ${response.data.reservations.length} user reservations`);
        const reservations = response.data.reservations;
        
        // Check for important status changes and show notifications
        if (!isRefresh) {
          checkForStatusNotifications(reservations);
        }
        
        setMyReservations(reservations);
      } else {
        console.log('⚠️ No reservations found or API error');
        setMyReservations([]);
      }
    } catch (error) {
      console.error('❌ Error loading reservations:', error);
      Alert.alert(
        'Error',
        'Failed to load reservations. Please try again.',
        [{ text: 'OK' }]
      );
      setMyReservations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkForStatusNotifications = (reservations) => {
    // Check for reservations that need immediate attention
    const readyForPickup = reservations.filter(r => r.status === 'READY_FOR_PICKUP');
    const approved = reservations.filter(r => r.status === 'APPROVED');
    const rejected = reservations.filter(r => r.status === 'REJECTED');

    // Show notification for ready for pickup (highest priority)
    if (readyForPickup.length > 0) {
      const count = readyForPickup.length;
      Alert.alert(
        '📚 Books Ready for Pickup!',
        `You have ${count} book${count > 1 ? 's' : ''} ready for pickup. Please visit the library to collect ${count > 1 ? 'them' : 'it'}.`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'View Reservations', style: 'default', onPress: () => {
            setActiveTab('MY_RESERVATIONS');
          }}
        ]
      );
    }
    // Show notification for approved reservations
    else if (approved.length > 0) {
      const count = approved.length;
      Alert.alert(
        '✅ Reservations Approved!',
        `Great news! ${count} of your reservation${count > 1 ? 's have' : ' has'} been approved by the librarian. You'll be notified when ${count > 1 ? 'they are' : 'it is'} ready for pickup.`,
        [{ text: 'Great!', style: 'default' }]
      );
    }
    // Show notification for rejected reservations
    else if (rejected.length > 0) {
      const count = rejected.length;
      Alert.alert(
        '❌ Reservation Updates',
        `${count} of your reservation${count > 1 ? 's were' : ' was'} rejected. Please check your reservations for more details.`,
        [
          { text: 'OK', style: 'default' },
          { text: 'View Reservations', style: 'default', onPress: () => {
            setActiveTab('MY_RESERVATIONS');
          }}
        ]
      );
    }
  };

  const handleReserveBook = () => {};

  const handleCancelReservation = async (reservationId) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await ApiService.cancelReservation(reservationId);
              Alert.alert('Success', 'Reservation cancelled successfully');
              loadMyReservations(true);
            } catch (error) {
              console.error('Error cancelling reservation:', error);
              Alert.alert('Error', 'Failed to cancel reservation. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    if (activeTab === 'AVAILABLE') {
    loadBorrowedBooks(true);
    } else {
      loadMyReservations(true);
    }
  };

  const renderBookItem = ({ item }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookHeader}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookAuthor}>by {item.author}</Text>
      </View>

      <View style={styles.bookDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#64748b" />
          <Text style={styles.detailText}>Subject: {item.subject || 'Not specified'}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#64748b" />
          <Text style={styles.detailText}>DDC: {item.ddc || 'Not specified'}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="card-account-details" size={16} color="#64748b" />
          <Text style={styles.detailText}>ISBN: {item.isbn || 'Not specified'}</Text>
        </View>
      </View>

      {/* Availability Status */}
      <View style={styles.availabilitySection}>
        <View style={styles.availabilityBadge}>
          <Text style={styles.availabilityText}>
            📖 {item.availableCopies} of {item.totalCopies} copies available
          </Text>
        </View>
        <Text style={styles.borrowedInfo}>
          🔒 {(item.totalCopies - item.availableCopies)} copies currently borrowed
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity 
        style={[
          styles.reserveButton,
          item.availableCopies >= item.totalCopies && styles.reserveButtonDisabled
        ]}
        onPress={() => handleReserveBook(item)}
        disabled={item.availableCopies >= item.totalCopies}
      >
        <View style={styles.buttonContent}>
          <MaterialCommunityIcons 
            name={item.availableCopies >= item.totalCopies ? "book-open" : "bookmark"} 
            size={18} 
            color="white" 
          />
          <Text style={[
            styles.reserveButtonText,
            item.availableCopies >= item.totalCopies && styles.reserveButtonTextDisabled
          ]}>
            {item.availableCopies >= item.totalCopies ? 'All Copies Available - Go to Borrow' : 'Reserve This Book'}
        </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderReservationItem = ({ item }) => {
    const statusMessage = getStatusMessage(item.status);
    const isReadyForPickup = item.status === 'READY_FOR_PICKUP';
    const isApproved = item.status === 'APPROVED';
    const isPending = item.status === 'PENDING';
    
    return (
      <View style={[styles.bookCard, isReadyForPickup && styles.readyForPickupCard]}>
        {/* Notification Badge for Important Statuses */}
        {(isReadyForPickup || isApproved) && (
          <View style={styles.notificationBadge}>
            <MaterialCommunityIcons 
              name={isReadyForPickup ? "bell-ring" : "check-circle"} 
              size={16} 
              color="#ffffff" 
            />
            <Text style={styles.notificationText}>
              {isReadyForPickup ? 'Action Required' : 'Status Update'}
            </Text>
          </View>
        )}

        <View style={styles.bookHeader}>
          <Text style={styles.bookTitle}>{item.bookTitle || 'Reservation'}</Text>
          {item.bookAuthor && (
            <Text style={styles.bookAuthor}>by {item.bookAuthor}</Text>
          )}
        </View>

        <View style={styles.bookDetails}>
          {item.bookIsbn && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="card-account-details" size={16} color="#64748b" />
              <Text style={styles.detailText}>ISBN: {item.bookIsbn}</Text>
            </View>
          )}
          {item.bookSubject && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#64748b" />
              <Text style={styles.detailText}>Subject: {item.bookSubject}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color="#64748b" />
            <Text style={styles.detailText}>Reserved: {new Date(item.requestDate).toLocaleDateString()}</Text>
          </View>
          {item.expectedReturnDate && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
              <Text style={styles.detailText}>Expected Available: {new Date(item.expectedReturnDate).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {/* Status Message */}
        <View style={[styles.statusMessageContainer, getStatusStyle(item.status)]}>
          <Text style={styles.statusMessageText}>{statusMessage}</Text>
        </View>

        {/* Reservation Info */}
        <View style={styles.reservationInfo}>
          <Text style={styles.reservationNote}>
            📚 This reservation is for the book in general. When any copy becomes available, you'll be notified.
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Show notification button for important statuses */}
          {(isReadyForPickup || isApproved) && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => showStatusNotification(item)}
            >
              <MaterialCommunityIcons 
                name={isReadyForPickup ? "information" : "bell"} 
                size={16} 
                color="#ffffff" 
              />
              <Text style={styles.notificationButtonText}>
                {isReadyForPickup ? 'Pickup Info' : 'View Notification'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Cancel Button for Pending Reservations */}
          {isPending && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelReservation(item.id)}
            >
              <Text style={styles.cancelText}>Cancel Reservation</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      'PENDING': { backgroundColor: '#f59e0b', borderColor: '#d97706' },
      'APPROVED': { backgroundColor: '#10b981', borderColor: '#059669' },
      'READY_FOR_PICKUP': { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
      'PICKED_UP': { backgroundColor: '#10b981', borderColor: '#059669' },
      'REJECTED': { backgroundColor: '#ef4444', borderColor: '#dc2626' },
      'CANCELLED': { backgroundColor: '#6b7280', borderColor: '#4b5563' },
      'COMPLETED': { backgroundColor: '#10b981', borderColor: '#059669' },
      'ACTIVE': { backgroundColor: '#3b82f6', borderColor: '#2563eb' }
    };
    return statusStyles[status] || { backgroundColor: '#6b7280', borderColor: '#4b5563' };
  };

  const getStatusMessage = (status) => {
    const messages = {
      'PENDING': '⏳ Waiting for librarian approval',
      'APPROVED': '✅ Approved! Waiting for book to become available',
      'READY_FOR_PICKUP': '📚 Ready for pickup! Please collect your book',
      'PICKED_UP': '📖 Book collected successfully',
      'REJECTED': '❌ Reservation was rejected',
      'CANCELLED': '🚫 Reservation was cancelled',
      'COMPLETED': '✅ Reservation completed',
      'ACTIVE': '📚 Reservation is active'
    };
    return messages[status] || '📋 Status unknown';
  };

  const showStatusNotification = (reservation) => {
    const status = reservation.status;
    const bookTitle = reservation.bookTitle || 'Unknown Book';
    
    if (status === 'APPROVED') {
      Alert.alert(
        '🎉 Reservation Approved!',
        `Your reservation for "${bookTitle}" has been approved by the librarian. You'll be notified when the book is ready for pickup.`,
        [{ text: 'Great!', style: 'default' }]
      );
    } else if (status === 'READY_FOR_PICKUP') {
      Alert.alert(
        '📚 Book Ready for Pickup!',
        `"${bookTitle}" is now ready for pickup! Please visit the library to collect your book.`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'View Details', style: 'default', onPress: () => {
            // Could navigate to book details or pickup instructions
            console.log('Navigate to pickup details');
          }}
        ]
      );
    } else if (status === 'REJECTED') {
      Alert.alert(
        '❌ Reservation Rejected',
        `Your reservation for "${bookTitle}" was rejected. Please contact the library for more information.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {activeTab === 'AVAILABLE' ? '📚' : '📖'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'AVAILABLE' ? 'No Borrowed Books Found' : 'No Reservations Found'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'AVAILABLE' 
          ? (searchQuery.trim() !== '' 
          ? 'No books match your search criteria.'
          : 'All books are currently available for direct borrowing. No reservations needed!'
            )
          : 'You haven\'t made any reservations yet.'
        }
      </Text>
      {activeTab === 'AVAILABLE' && searchQuery.trim() !== '' && (
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearButtonText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Update notification count
  const updateNotificationCount = () => {
    const importantReservations = myReservations.filter(r => 
      r.status === 'READY_FOR_PICKUP' || r.status === 'APPROVED' || r.status === 'REJECTED'
    );
    setNotificationCount(importantReservations.length);
  };

  // Load data when activeTab changes
  useEffect(() => {
    if (activeTab === 'AVAILABLE') {
      loadBorrowedBooks();
    } else {
      loadMyReservations();
    }
  }, [activeTab]);

  // Update notification count when reservations change
  useEffect(() => {
    updateNotificationCount();
  }, [myReservations]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>
          {activeTab === 'AVAILABLE' ? 'Loading borrowed books...' : 'Loading reservations...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="Book Reservations"
        subtitle={notificationCount > 0 ? `You have ${notificationCount} notification${notificationCount > 1 ? 's' : ''}` : "Reserve books that are currently borrowed"}
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/reservation"
      />

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          onPress={() => setActiveTab('AVAILABLE')} 
          style={[styles.tab, activeTab === 'AVAILABLE' && styles.activeTab]}
        >
          <Text style={activeTab === 'AVAILABLE' ? styles.activeTabText : styles.tabText}>
            Books to Reserve
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('MY_RESERVATIONS')} 
          style={[styles.tab, activeTab === 'MY_RESERVATIONS' && styles.activeTab]}
        >
          <Text style={activeTab === 'MY_RESERVATIONS' ? styles.activeTabText : styles.tabText}>
            My Reservations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - Only show for Available tab */}
      {activeTab === 'AVAILABLE' && (
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search borrowed books..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>
      )}

      {/* Content */}
      <FlatList
        data={activeTab === 'AVAILABLE' ? filteredBooks : myReservations}
        renderItem={activeTab === 'AVAILABLE' ? renderBookItem : renderReservationItem}
        keyExtractor={(item, index) => 
          activeTab === 'AVAILABLE' 
            ? `borrowed_book_${item.id || index}` 
            : `reservation_${item.id || index}`
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
        ListHeaderComponent={
          activeTab === 'AVAILABLE' ? (
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Available for Reservation</Text>
            <Text style={styles.headerSubtitle}>
              These books are currently borrowed but can be reserved for when they become available
            </Text>
            <Text style={styles.countText}>
              {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found
            </Text>
          </View>
          ) : (
            <View style={styles.headerSection}>
              <Text style={styles.headerTitle}>My Reservations</Text>
              <Text style={styles.headerSubtitle}>
                Track the status of your book reservations
              </Text>
              <Text style={styles.countText}>
                {myReservations.length} reservation{myReservations.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          )
        }
        ListEmptyComponent={renderEmptyState}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabRow: { 
    flexDirection: 'row', 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0' 
  },
  tab: { 
    flex: 1, 
    padding: 16, 
    alignItems: 'center', 
    borderBottomWidth: 3, 
    borderColor: 'transparent' 
  },
  activeTab: { 
    borderColor: '#8b5cf6' 
  },
  tabText: { 
    color: '#64748b', 
    fontSize: 14, 
    fontWeight: '500' 
  },
  activeTabText: { 
    color: '#8b5cf6', 
    fontWeight: '700', 
    fontSize: 14 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  debugButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listContainer: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  countText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  bookCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bookHeader: {
    marginBottom: 16,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
  },
  bookDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
  },
  availabilitySection: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  availabilityBadge: {
    marginBottom: 8,
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
  borrowedInfo: {
    fontSize: 14,
    color: '#b45309',
    fontWeight: '500',
  },
  reserveButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reserveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reserveButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  reserveButtonTextDisabled: {
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reservation-specific styles
  reservationInfo: { 
    backgroundColor: '#f0f9ff', 
    borderColor: '#0ea5e9', 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12 
  },
  reservationNote: { 
    fontSize: 12, 
    color: '#0369a1', 
    fontStyle: 'italic', 
    lineHeight: 16 
  },
  statusBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    borderWidth: 1, 
    alignSelf: 'flex-start', 
    marginBottom: 12 
  },
  statusText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: '600', 
    textTransform: 'uppercase' 
  },
  cancelButton: { 
    backgroundColor: '#ef4444', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  cancelText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
  // Notification styles
  readyForPickupCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationBadge: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  notificationText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusMessageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusMessageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  notificationButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  notificationButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default ReservationScreen;
