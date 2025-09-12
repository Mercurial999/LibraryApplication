import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const TeacherRequestsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  // Load book requests
  const loadBookRequests = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBookRequests(filter);
      console.log('Book requests response:', response);
      
      if (response.success) {
        // Handle different response formats
        let bookRequests = [];
        if (Array.isArray(response.data)) {
          bookRequests = response.data;
        } else if (response.data && Array.isArray(response.data.requests)) {
          bookRequests = response.data.requests;
        } else if (Array.isArray(response)) {
          bookRequests = response;
        }
        setRequests(bookRequests);
        console.log('Loaded book requests:', bookRequests);
      } else {
        console.log('No success response, setting empty array');
        setRequests([]);
      }
    } catch (error) {
      console.error('Error loading book requests:', error);
      Alert.alert('Error', 'Failed to load book requests. Please try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Cancel book request
  const handleCancelRequest = async (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this book request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await ApiService.cancelBookRequest(requestId);
              Alert.alert('Success', 'Book request cancelled successfully');
              loadBookRequests(); // Refresh list
            } catch (error) {
              console.error('Error cancelling book request:', error);
              Alert.alert('Error', 'Failed to cancel book request. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Refresh requests
  const onRefresh = () => {
    setRefreshing(true);
    loadBookRequests();
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    const checkRole = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        const role = String(userData?.role || '').toUpperCase();
        if (role === 'TEACHER') {
          setAuthorized(true);
          loadBookRequests();
        } else {
          setAuthorized(false);
          router.replace('/dashboard');
        }
      } catch {
        setAuthorized(false);
        router.replace('/dashboard');
      }
    };
    checkRole();
  }, [router]);

  // Reload requests when filter changes
  useEffect(() => {
    if (authorized) {
      loadBookRequests();
    }
  }, [filter]);

  // Refresh requests when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (authorized) {
        loadBookRequests();
      }
    }, [authorized])
  );

  // Get status display info
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDING':
        return { text: 'Under Review', color: '#FFA500', icon: 'clock-outline' };
      case 'APPROVED':
        return { text: 'Approved', color: '#28A745', icon: 'check-circle' };
      case 'REJECTED':
        return { text: 'Rejected', color: '#DC2626', icon: 'close-circle' };
      default:
        return { text: 'Unknown', color: '#6B7280', icon: 'help-circle' };
    }
  };

  const getPriorityDisplay = (priority) => {
    switch (priority) {
      case 'HIGH':
        return { text: 'High', color: '#DC2626', icon: 'alert-circle' };
      case 'MEDIUM':
        return { text: 'Medium', color: '#F59E0B', icon: 'minus-circle' };
      case 'LOW':
        return { text: 'Low', color: '#10B981', icon: 'check-circle-outline' };
      default:
        return { text: 'Medium', color: '#F59E0B', icon: 'minus-circle' };
    }
  };

  if (!authorized) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Teacher Requests"
        subtitle="Manage your book requests for the library"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/teacher-requests"
      />
      <View style={styles.content}>
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterBtn, filter === 'all' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('PENDING')} style={[styles.filterBtn, filter === 'PENDING' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'PENDING' && styles.filterTextActive]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('APPROVED')} style={[styles.filterBtn, filter === 'APPROVED' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'APPROVED' && styles.filterTextActive]}>Approved</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your book requests...</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            renderItem={({ item }) => {
              const statusDisplay = getStatusDisplay(item.status);
              const priorityDisplay = getPriorityDisplay(item.priority);
              
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.title} numberOfLines={2}>{item.bookTitle || item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
                      <MaterialCommunityIcons name={statusDisplay.icon} size={16} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.statusText}>{statusDisplay.text}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.author}>by {item.author || 'Unknown Author'}</Text>
                  
                  <View style={styles.bookDetails}>
                    {item.publisher && (
                      <Text style={styles.detailText}>Publisher: {item.publisher}</Text>
                    )}
                    {item.isbn && (
                      <Text style={styles.detailText}>ISBN: {item.isbn}</Text>
                    )}
                    {item.edition && (
                      <Text style={styles.detailText}>Edition: {item.edition}</Text>
                    )}
                    {item.estimatedPrice > 0 && (
                      <Text style={styles.priceText}>Estimated Price: ₱{item.estimatedPrice}</Text>
                    )}
                  </View>
                  
                  <View style={styles.priorityContainer}>
                    <MaterialCommunityIcons name={priorityDisplay.icon} size={16} color={priorityDisplay.color} style={{ marginRight: 6 }} />
                    <Text style={[styles.priorityText, { color: priorityDisplay.color }]}>
                      Priority: {priorityDisplay.text}
                    </Text>
                  </View>
                  
                  <Text style={styles.justification}>
                    <Text style={styles.justificationLabel}>Justification: </Text>
                    {item.justification || item.reason}
                  </Text>
                  
                  <Text style={styles.date}>
                    Requested: {new Date(item.dateRequested || item.requestDate).toLocaleDateString()}
                  </Text>
                  
                  {item.dateReviewed && (
                    <Text style={styles.reviewDate}>
                      Reviewed: {new Date(item.dateReviewed).toLocaleDateString()}
                    </Text>
                  )}
                  
                  {item.reviewedBy && (
                    <Text style={styles.reviewedBy}>Reviewed by: {item.reviewedBy}</Text>
                  )}
                  
                  {item.adminStatus && (
                    <Text style={styles.adminStatus}>Admin Status: {item.adminStatus}</Text>
                  )}
                  
                  {item.notes && (
                    <Text style={styles.notes}>Notes: {item.notes}</Text>
                  )}
                  
                  {/* Cancel Button - Only show for pending requests */}
                  {item.status === 'PENDING' && (
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => handleCancelRequest(item.id)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.cancelText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
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
                <Text style={styles.emptyIcon}>📖</Text>
                <Text style={styles.emptyTitle}>No Book Requests</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't made any book requests yet. Request new books to be added to the library.
                </Text>
              </View>
            }
          />
        )}
        
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/teacher-requests/new')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 20 },
  filterRow: { flexDirection: 'row', marginBottom: 20 },
  filterBtn: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#eee' },
  filterActive: { borderBottomColor: '#3498db' },
  filterText: { color: '#666' },
  filterTextActive: { color: '#3498db', fontWeight: 'bold' },
  
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
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    minHeight: 40
  },
  title: { 
    fontWeight: '700', 
    fontSize: 16, 
    marginBottom: 2,
    color: '#111827',
    flex: 1,
    marginRight: 12,
    lineHeight: 20
  },
  author: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginBottom: 12
  },
  bookDetails: {
    marginBottom: 12
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  priceText: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 4,
    fontWeight: '600'
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600'
  },
  justification: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20
  },
  justificationLabel: {
    fontWeight: '600',
    color: '#1f2937'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  date: { 
    fontSize: 14, 
    color: '#374151',
    marginBottom: 4
  },
  reviewDate: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4
  },
  reviewedBy: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4
  },
  adminStatus: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 4,
    fontWeight: '600'
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    fontStyle: 'italic'
  },
  
  // Cancel Button
  cancelButton: { 
    backgroundColor: '#ef4444', 
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8
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
  },
  
  // FAB
  fab: { 
    position: 'absolute', 
    right: 24, 
    bottom: 24, 
    backgroundColor: '#3498db', 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 4 
  },
  fabText: { 
    color: '#fff', 
    fontSize: 32, 
    fontWeight: 'bold' 
  },
});

export default TeacherRequestsScreen;