import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const MyRequestsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Fetch user reservations from backend
  const fetchUserReservations = async () => {
    try {
      setLoading(true);
      
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to view reservations');
        return;
      }

      const response = await fetch(
        `${ApiService.API_BASE}/api/mobile/users/${userId}/reservations`,
        {
          headers: await ApiService.getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReservations(data.data || data || []);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to fetch reservations');
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('Error', 'Failed to fetch reservations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel reservation
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
              const userId = await ApiService.getCurrentUserId();
              if (!userId) {
                Alert.alert('Error', 'You must be logged in to cancel reservations');
                return;
              }

              const response = await fetch(
                `${ApiService.API_BASE}/api/mobile/users/${userId}/reservations/${reservationId}`,
                {
                  method: 'DELETE',
                  headers: await ApiService.getAuthHeaders(),
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Reservation cancelled successfully');
                fetchUserReservations(); // Refresh list
              } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to cancel reservation');
              }
            } catch (error) {
              console.error('Error cancelling reservation:', error);
              Alert.alert('Error', 'Failed to cancel reservation. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Refresh reservations
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserReservations();
  };

  // Load reservations on component mount
  useEffect(() => {
    fetchUserReservations();
  }, []);

  // Get status styling based on reservation status
  const getStatusStyle = (status) => {
    const statusStyles = {
      'ACTIVE': { backgroundColor: '#2196F3', borderColor: '#1976D2' },
      'PENDING': { backgroundColor: '#FF9800', borderColor: '#F57C00' },
      'APPROVED': { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
      'REJECTED': { backgroundColor: '#F44336', borderColor: '#D32F2F' },
      'CANCELLED': { backgroundColor: '#9E9E9E', borderColor: '#757575' },
      'COMPLETED': { backgroundColor: '#4CAF50', borderColor: '#388E3C' }
    };
    return statusStyles[status] || { backgroundColor: '#757575', borderColor: '#616161' };
  };

  return (
    <View style={styles.container}>
      <Header 
        title="My Requests"
        subtitle="Track your book requests"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/borrowing/my-requests"
      />
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your reservations...</Text>
          </View>
        ) : (
          <FlatList
            data={reservations}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.book?.title || item.bookTitle || 'Unknown Book'}</Text>
                <Text style={styles.author}>by {item.book?.author || item.bookAuthor || 'Unknown Author'}</Text>
                <Text style={styles.date}>
                  Reserved: {new Date(item.reservationDate || item.requestDate).toLocaleDateString()}
                </Text>
                <Text style={styles.expectedReturn}>
                  Expected Return: {new Date(item.expectedReturnDate).toLocaleDateString()}
                </Text>
                
                {/* Status Badge */}
                <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>

                {/* Cancel Button - Only show for active reservations */}
                {item.status === 'ACTIVE' || item.status === 'PENDING' ? (
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => handleCancelReservation(item.id)}
                  >
                    <Text style={styles.cancelText}>Cancel Reservation</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No Reservations</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't made any book reservations yet. Browse the catalog to find books you'd like to reserve.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    color: '#64748b',
    marginTop: 16,
    fontSize: 16
  },

  // Card Styles
  card: { 
    backgroundColor: '#ffffff', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  title: { 
    fontWeight: 'bold', 
    fontSize: 18, 
    marginBottom: 4,
    color: '#1e293b'
  },
  author: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic'
  },
  date: { 
    fontSize: 14, 
    color: '#374151', 
    marginBottom: 4 
  },
  expectedReturn: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12
  },
  
  // Status Badge
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
  
  // Cancel Button
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

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24
  }
});

export default MyRequestsScreen;