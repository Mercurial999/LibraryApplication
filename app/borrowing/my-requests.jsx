import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const params = useLocalSearchParams();
  const initialTab = String(params?.tab || '').toLowerCase() === 'renewal' ? 'RENEWAL' : 'BORROW';
  const [activeTab, setActiveTab] = useState(initialTab); // BORROW | RENEWAL
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [renewalRequests, setRenewalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchBorrowRequests = async () => {
    try {
      const response = await ApiService.getBorrowRequests('all');
      if (response.success && response.data && response.data.requests) {
        setBorrowRequests(response.data.requests);
      } else {
        setBorrowRequests([]);
      }
    } catch (error) {
      console.error('Error fetching borrow requests:', error);
      setBorrowRequests([]);
    }
  };

  const fetchRenewalRequests = async () => {
    try {
      const res = await ApiService.getUserRenewalRequests();
      const list = Array.isArray(res)
        ? res
        : (res?.data?.renewals || res?.renewals || []);
      setRenewalRequests(list);
    } catch (error) {
      console.error('Error fetching renewal requests:', error);
      setRenewalRequests([]);
    }
  };


  const loadRequests = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchBorrowRequests(), fetchRenewalRequests()]);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBorrowRequest = async (requestId) => {
    Alert.alert(
      'Cancel Borrow Request',
      'Are you sure you want to cancel this borrow request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await ApiService.cancelBorrowRequest(requestId);
              Alert.alert('Success', 'Borrow request cancelled successfully');
              fetchBorrowRequests();
            } catch (error) {
              console.error('Error cancelling borrow request:', error);
              Alert.alert('Error', 'Failed to cancel borrow request. Please try again.');
            }
          },
        },
      ]
    );
  };


  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // React to tab query changes (when navigating from Renew success)
  useEffect(() => {
    if (String(params?.tab || '').toLowerCase() === 'renewal') setActiveTab('RENEWAL');
  }, [params?.tab]);

  // Load data when activeTab changes, so switching to RENEWAL fetches latest
  useEffect(() => {
    if (activeTab === 'RENEWAL') {
      fetchRenewalRequests();
    } else if (activeTab === 'BORROW') {
      fetchBorrowRequests();
    }
  }, [activeTab]);

  const getStatusStyle = (status) => {
    const statusStyles = {
      'PENDING': { backgroundColor: '#f59e0b', borderColor: '#d97706' },
      'APPROVED': { backgroundColor: '#10b981', borderColor: '#059669' },
      'REJECTED': { backgroundColor: '#ef4444', borderColor: '#dc2626' },
      'CANCELLED': { backgroundColor: '#6b7280', borderColor: '#4b5563' },
      'COMPLETED': { backgroundColor: '#10b981', borderColor: '#059669' },
      'ACTIVE': { backgroundColor: '#3b82f6', borderColor: '#2563eb' }
    };
    return statusStyles[status] || { backgroundColor: '#6b7280', borderColor: '#4b5563' };
  };

  const renderBorrowRequest = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.book?.title || item.bookTitle || 'Unknown Book'}</Text>
      <Text style={styles.author}>by {item.book?.author || item.bookAuthor || 'Unknown Author'}</Text>
      {item.copyId && (
        <Text style={styles.copyInfo}>Copy ID: {item.copyId}</Text>
      )}
      <Text style={styles.date}>
        Requested: {new Date(item.requestDate || item.dateRequested).toLocaleDateString()}
      </Text>
      {item.expectedReturnDate && (
        <Text style={styles.expectedReturn}>
          Expected Return: {new Date(item.expectedReturnDate).toLocaleDateString()}
        </Text>
      )}
      <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
      {item.status === 'PENDING' && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => handleCancelBorrowRequest(item.id)}
        >
          <Text style={styles.cancelText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRenewalRequest = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.bookTitle || 'Renewal Request'}</Text>
      {item.bookAuthor && (
        <Text style={styles.author}>by {item.bookAuthor}</Text>
      )}
      {item.copyNumber && (
        <Text style={styles.copyInfo}>Copy #{item.copyNumber}</Text>
      )}
      <Text style={styles.date}>Requested: {new Date(item.requestDate).toLocaleDateString()}</Text>
      {item.currentDueDate && (
        <Text style={styles.date}>Current due: {new Date(item.currentDueDate).toLocaleDateString()}</Text>
      )}
      {item.requestedDueDate && (
        <Text style={styles.date}>Requested due: {new Date(item.requestedDueDate).toLocaleDateString()}</Text>
      )}
      <View style={[styles.statusBadge, getStatusStyle(item.status || 'PENDING')] }>
        <Text style={styles.statusText}>{(item.status || 'PENDING')}</Text>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <Header 
        title="My Requests"
        subtitle="Track your requests"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/borrowing/my-requests"
      />

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setActiveTab('BORROW')} style={[styles.tab, activeTab === 'BORROW' && styles.activeTab]}>
          <Text style={activeTab === 'BORROW' ? styles.activeTabText : styles.tabText}>Borrow Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('RENEWAL')} style={[styles.tab, activeTab === 'RENEWAL' && styles.activeTab]}>
          <Text style={activeTab === 'RENEWAL' ? styles.activeTabText : styles.tabText}>Renewal Requests</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your requests...</Text>
          </View>
        ) : activeTab === 'BORROW' ? (
          <FlatList
            data={borrowRequests}
            renderItem={renderBorrowRequest}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No Borrow Requests</Text>
                <Text style={styles.emptySubtitle}>You haven't made any borrow requests yet.</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={renewalRequests}
            renderItem={renderRenewalRequest}
            keyExtractor={(item, idx) => String(item.id || idx)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔄</Text>
                <Text style={styles.emptyTitle}>No Renewal Requests</Text>
                <Text style={styles.emptySubtitle}>Your renewal requests will appear here once submitted.</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 20 },
  tabRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, padding: 16, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  activeTab: { borderColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  activeTabText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#64748b', marginTop: 16, fontSize: 16 },
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 4, color: '#1e293b' },
  author: { fontSize: 14, color: '#64748b', marginBottom: 8, fontStyle: 'italic' },
  copyInfo: { fontSize: 12, color: '#6b7280', marginBottom: 8, fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: 4, borderRadius: 4, alignSelf: 'flex-start' },
  date: { fontSize: 14, color: '#374151', marginBottom: 4 },
  expectedReturn: { fontSize: 14, color: '#374151', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 12 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  cancelButton: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 20 }
});

export default MyRequestsScreen;