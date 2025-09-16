import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import StatusSync from '../../utils/StatusSync';

const MyRequestsScreen = () => {
  // DEBUG: Verify this is the correct file
  console.log('🔍 DEBUG: MyRequestsScreen loaded - THIS IS THE CORRECT FILE!');
  
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
      console.log('🔍 DEBUG: MyRequestsScreen - Fetching borrow requests');
      
      // Fetch both borrow requests and borrow transactions
      const [requestsResponse, transactionsResponse] = await Promise.all([
        ApiService.getBorrowRequests('all'),
        fetch(`${ApiService.API_BASE}/api/borrow-transactions?userId=${await ApiService.getCurrentUserId()}&status=all`, {
          headers: await ApiService.getAuthHeaders(),
        }).then(res => res.json())
      ]);
      
      console.log('📋 Borrow requests response:', requestsResponse);
      console.log('📋 Borrow transactions response:', transactionsResponse);
      
      const allRequests = [];
      
      // Process borrow requests (pending requests)
      if (requestsResponse.success && requestsResponse.data && requestsResponse.data.requests) {
        const requestData = requestsResponse.data.requests.map(request => ({
          ...request,
          type: 'request',
          dateRequested: request.requestDate,
          bookTitle: request.book?.title,
          bookAuthor: request.book?.author,
        }));
        allRequests.push(...requestData);
      }
      
      // Process borrow transactions (active borrows)
      if (transactionsResponse.transactions && Array.isArray(transactionsResponse.transactions)) {
        const transactionData = transactionsResponse.transactions.map(transaction => ({
          id: transaction.id,
          bookId: transaction.bookId,
          copyId: transaction.bookCopyId,
          userId: transaction.userId,
          status: transaction.status === 'ACTIVE' ? 'APPROVED' : transaction.status,
          dateRequested: transaction.borrowDate,
          expectedReturnDate: transaction.dueDate,
          book: transaction.book,
          bookTitle: transaction.book?.title,
          bookAuthor: transaction.book?.author,
          copyNumber: transaction.bookcopy?.copyNumber,
          type: 'transaction'
        }));
        allRequests.push(...transactionData);
      }
      
      // Sort by date (newest first)
      allRequests.sort((a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime());
      
      console.log(`📚 Found ${allRequests.length} total requests (${allRequests.filter(r => r.type === 'request').length} requests + ${allRequests.filter(r => r.type === 'transaction').length} transactions)`);
      console.log('🔍 DEBUG: MyRequestsScreen - Successfully loaded borrow requests');
      setBorrowRequests(allRequests);
      
    } catch (error) {
      console.error('❌ Error fetching borrow requests:', error);
      console.log('🔍 DEBUG: MyRequestsScreen - Error loading borrow requests');
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
    // Find the request to determine its type
    const request = borrowRequests.find(req => String(req.id) === String(requestId));
    const isTransaction = request?.type === 'transaction';
    
    // If it's a transaction (from borrow-transactions API), show return message
    if (isTransaction) {
      // For active borrows, show a message that they need to be returned at the library
      Alert.alert(
        'Return Book', 
        'To return this book, please visit the library or contact the librarian. Active borrows cannot be returned through the mobile app.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // If it's not a transaction, it's a borrow request from the borrow-requests API
    
    // For pending requests, allow cancellation
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this borrow request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              console.log('🔄 Cancelling borrow request:', requestId);
              
              const userId = await ApiService.getCurrentUserId();
              const cancelResponse = await fetch(`${ApiService.API_BASE}/api/borrow-requests?requestId=${requestId}&userId=${userId}`, {
                method: 'DELETE',
                headers: await ApiService.getAuthHeaders(),
              });
              
              if (cancelResponse.ok) {
                console.log('✅ Borrow request cancelled successfully');
                
                // Remove from local state immediately
                setBorrowRequests(prev => prev.filter(req => String(req.id) !== String(requestId)));
                
                // Clear pending copy IDs from storage
                try {
                  if (request?.copyId) {
                    const storageKey = `pendingCopyIds_${userId}`;
                    const stored = await AsyncStorage.getItem(storageKey);
                    if (stored) {
                      const copyIds = new Set(JSON.parse(stored));
                      copyIds.delete(String(request.copyId));
                      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(copyIds)));
                    }
                  }
                } catch (storageError) {
                  console.error('❌ Error clearing storage:', storageError);
                }
                
                Alert.alert('Success', 'Borrow request cancelled successfully');
                
                // Refresh the data
                await fetchBorrowRequests();
              } else {
                console.error('❌ Cancel request failed with status:', cancelResponse.status);
                const errorText = await cancelResponse.text();
                let errorMessage = 'Failed to cancel borrow request. Please try again.';
                
                try {
                  if (errorText && errorText.trim()) {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                  }
                } catch (parseError) {
                  console.log('⚠️ Could not parse error response:', parseError.message);
                }
                
                Alert.alert('Error', errorMessage);
              }
            } catch (error) {
              console.error('❌ Error cancelling borrow request:', error);
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
    
    // Set up real-time status synchronization
    const statusSyncCallback = (syncData) => {
      console.log('📡 MyRequests: Received real-time status update');
      if (syncData.pendingRequests && syncData.pendingRequests.success) {
        // Update requests data with fresh status
        setBorrowRequests(syncData.pendingRequests.data?.requests || []);
      }
      if (syncData.reservations && syncData.reservations.success) {
        // Update reservations data with fresh status
        setRenewalRequests(syncData.reservations.data?.reservations || []);
      }
    };
    
    StatusSync.addListener(statusSyncCallback);
    StatusSync.startSync();
    
    return () => {
      StatusSync.removeListener(statusSyncCallback);
    };
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

  // Refresh data when screen regains focus (e.g., after cancelling a request)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 DEBUG: MyRequestsScreen - Screen focused, refreshing requests with real-time status updates');
      loadRequests();
    }, [])
  );

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
      {item.copyNumber && (
        <Text style={styles.copyInfo}>Copy #: {item.copyNumber}</Text>
      )}
      <Text style={styles.date}>
        {item.type === 'transaction' ? 'Borrowed' : 'Requested'}: {new Date(item.requestDate || item.dateRequested).toLocaleDateString()}
      </Text>
      {item.expectedReturnDate && (
        <Text style={styles.expectedReturn}>
          {item.type === 'transaction' ? 'Due Date' : 'Expected Return'}: {new Date(item.expectedReturnDate).toLocaleDateString()}
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
      {item.status === 'APPROVED' && item.type === 'transaction' && (
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: '#6b7280' }]}
          onPress={() => handleCancelBorrowRequest(item.id)}
        >
          <Text style={styles.cancelText}>Return at Library</Text>
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
        <TouchableOpacity 
          onPress={() => {
            console.log('🔄 Manual refresh triggered');
            loadRequests();
          }} 
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>🔄 Refresh</Text>
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
  refreshButton: { backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
  refreshText: { color: '#fff', fontWeight: '600', fontSize: 12 },
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