import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ConditionAssessment from '../../components/ConditionAssessment';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const MyBooks = () => {
  const [tab, setTab] = useState('borrowed');
  const [books, setBooks] = useState({
    borrowed: [],
    returned: [],
    overdue: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [reportData, setReportData] = useState({
    reportType: 'lost',
    description: ''
  });
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // NEW: Condition assessment state
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [conditionModalType, setConditionModalType] = useState('return'); // 'return' or 'borrow'
  const [pendingBookAction, setPendingBookAction] = useState(null);

  // Get user ID dynamically from storage
  const [userId, setUserId] = useState(null);

  // Load user ID from storage
  const loadUserId = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setUserId(userData.id);
        return userData.id;
      }
      return null;
    } catch (err) {
      console.error('Error loading user ID:', err);
      return null;
    }
  };

  // Load user's books
  const loadUserBooks = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) {
        setLoading(true);
      }

      // Ensure we have a user ID
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        throw new Error('User ID not available. Please log in again.');
      }

      const response = await ApiService.getUserBooks(currentUserId, 'all', true);

      if (response.success && response.data) {
        setBooks({
          borrowed: response.data.borrowedBooks || [],
          returned: response.data.returnedBooks || [],
          overdue: response.data.overdueBooks || []
        });
      } else {
        throw new Error('Failed to load books data');
      }
    } catch (err) {
      setError(err.message || 'Failed to load your books');
      console.error('Error loading user books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh books
  const onRefresh = () => {
    setRefreshing(true);
    loadUserBooks(true);
  };

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      await loadUserId();
      await loadUserBooks();
    };
    initializeData();
  }, []);

  // Handle book return
  const handleReturnBook = async (book) => {
    try {
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'User ID not available. Please log in again.');
        return;
      }

      // NEW: Show condition assessment modal instead of hardcoded values
      setConditionModalType('return');
      setPendingBookAction({ type: 'return', book, userId: currentUserId });
      setConditionModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process return');
    }
  };

  // NEW: Handle condition assessment submission for return
  const handleReturnConditionSubmit = async (conditionData) => {
    try {
      const { book, userId: currentUserId } = pendingBookAction;
      
      await ApiService.returnBook(currentUserId, book.id, {
        copyId: book.copyId, // Include copyId if available from backend
        condition: conditionData.condition,
        notes: conditionData.notes || 'Returned via mobile app'
      });
      
      Alert.alert('Success', 'Book returned successfully!');
      loadUserBooks(true); // Refresh the list
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to return book');
    }
  };

  // NEW: Handle condition assessment submission for borrow (placeholder for future use)
  const handleBorrowConditionSubmit = async (conditionData) => {
    try {
      const { book, userId: currentUserId } = pendingBookAction;
      
      // This would be used when implementing borrowing from the catalog
      // For now, just show a success message
      Alert.alert('Success', 'Book condition recorded successfully!');
      loadUserBooks(true); // Refresh the list
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record book condition');
    }
  };

  // Handle book renewal
  const handleRenewBook = async (book) => {
    try {
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'User ID not available. Please log in again.');
        return;
      }

      Alert.alert(
        'Renew Book',
        `Renew "${book.bookTitle}" for another period?`,
        [
          { text: 'Cancel', style: 'cancel' },
                      {
              text: 'Renew',
              onPress: async () => {
                try {
                  await ApiService.renewBook(currentUserId, book.id, {
                    copyId: book.copyId // Include copyId if available from backend
                  });
                  Alert.alert('Success', 'Book renewed successfully!');
                  loadUserBooks(true); // Refresh the list
                } catch (err) {
                  Alert.alert('Error', err.message || 'Failed to renew book');
                }
              }
            }
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process renewal');
    }
  };

  // Handle book report
  const handleReportBook = (book) => {
    setSelectedBook(book);
    setReportModalVisible(true);
  };

  // Handle view history for returned books
  const handleViewHistory = (book) => {
    Alert.alert(
      'Book History',
      `📚 ${book.bookTitle}\n\n` +
      `📅 Borrowed: ${new Date(book.borrowDate).toLocaleDateString()}\n` +
      `📚 Due: ${new Date(book.dueDate).toLocaleDateString()}\n` +
      `📖 Returned: ${book.returnDate ? new Date(book.returnDate).toLocaleDateString() : 'N/A'}\n` +
      `${book.fineAmount > 0 ? `💰 Fine: $${book.fineAmount.toFixed(2)} (${book.fineStatus})\n` : ''}` +
      `${book.copyNumber ? `📋 Copy: ${book.copyNumber}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  // Handle view fines for overdue books
  const handleViewFines = (book) => {
    const daysOverdue = Math.abs(getDaysRemaining(book.dueDate));
    Alert.alert(
      'Overdue Fine Details',
      `📚 ${book.bookTitle}\n\n` +
      `⏰ Days Overdue: ${daysOverdue}\n` +
      `💰 Current Fine: $${book.fineAmount ? book.fineAmount.toFixed(2) : '0.00'}\n` +
      `📅 Due Date: ${new Date(book.dueDate).toLocaleDateString()}\n\n` +
      `Please return this book as soon as possible to avoid additional fines.`,
      [
        { text: 'Return Now', onPress: () => handleReturnBook(book) },
        { text: 'OK' }
      ]
    );
  };

  // Submit report
  const submitReport = async () => {
    if (!reportData.description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    try {
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'User ID not available. Please log in again.');
        return;
      }

      await ApiService.reportBook(currentUserId, selectedBook.id, reportData);
      Alert.alert('Success', 'Report submitted successfully');
      setReportModalVisible(false);
      setReportData({ reportType: 'lost', description: '' });
      setSelectedBook(null);
      loadUserBooks(true); // Refresh the list
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit report');
    }
  };

  // Calculate days remaining
  const getDaysRemaining = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status color
  const getStatusColor = (book) => {
    if (book.status === 'overdue') return '#dc2626';
    if (book.status === 'returned') return '#059669';
    const daysRemaining = getDaysRemaining(book.dueDate);
    if (daysRemaining <= 0) return '#dc2626';
    if (daysRemaining <= 3) return '#d97706';
    return '#059669';
  };

  // Get status text
  const getStatusText = (book) => {
    if (book.status === 'overdue') return 'Overdue';
    if (book.status === 'returned') return 'Returned';
    const daysRemaining = getDaysRemaining(book.dueDate);
    if (daysRemaining <= 0) return 'Due today';
    if (daysRemaining === 1) return 'Due tomorrow';
    if (daysRemaining <= 3) return `${daysRemaining} days remaining`;
    return `${daysRemaining} days remaining`;
  };

  // Render book item
  const renderBookItem = ({ item }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookHeader}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.bookTitle}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
          <Text style={styles.statusText}>{getStatusText(item)}</Text>
        </View>
      </View>
      
      <Text style={styles.bookAuthor}>by {item.bookAuthor}</Text>
      
      <View style={styles.bookDetails}>
        <Text style={styles.detailText}>
          📅 Borrowed: {new Date(item.borrowDate).toLocaleDateString()}
        </Text>
        <Text style={styles.detailText}>
          📚 Due: {new Date(item.dueDate).toLocaleDateString()}
        </Text>
        
        {/* Show return date for returned books */}
        {item.status === 'returned' && item.returnDate && (
          <Text style={styles.detailText}>
            📖 Returned: {new Date(item.returnDate).toLocaleDateString()}
          </Text>
        )}
        
        {/* Show overdue information */}
        {item.status === 'overdue' && (
          <Text style={styles.overdueText}>
            ⏰ {Math.abs(getDaysRemaining(item.dueDate))} days overdue
          </Text>
        )}
        
        {/* Show fine information */}
        {item.fineAmount > 0 && (
          <Text style={styles.fineText}>
            💰 Fine: ${item.fineAmount.toFixed(2)} ({item.fineStatus})
          </Text>
        )}
        
        {/* Show copy information if available */}
        {item.copyNumber && (
          <Text style={styles.detailText}>
            📋 Copy: {item.copyNumber}
          </Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        {item.status === 'borrowed' && (
          <>
            <TouchableOpacity 
              style={styles.renewButton}
              onPress={() => handleRenewBook(item)}
            >
              <Text style={styles.renewButtonText}>🔄 Renew</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.returnButton}
              onPress={() => handleReturnBook(item)}
            >
              <Text style={styles.returnButtonText}>📖 Return</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* Show different actions for returned books */}
        {item.status === 'returned' && (
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => handleViewHistory(item)}
          >
            <Text style={styles.historyButtonText}>📋 View Details</Text>
          </TouchableOpacity>
        )}
        
        {/* Show different actions for overdue books */}
        {item.status === 'overdue' && (
          <>
            <TouchableOpacity 
              style={styles.returnButton}
              onPress={() => handleReturnBook(item)}
            >
              <Text style={styles.returnButtonText}>📖 Return Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.fineButton}
              onPress={() => handleViewFines(item)}
            >
              <Text style={styles.fineButtonText}>💰 View Fines</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => handleReportBook(item)}
        >
          <Text style={styles.reportButtonText}>⚠️ Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => {
    let icon, title, subtitle;
    
    switch (tab) {
      case 'borrowed':
        icon = '📚';
        title = 'No borrowed books';
        subtitle = 'Start borrowing books from the catalog!';
        break;
      case 'returned':
        icon = '📖';
        title = 'No returned books';
        subtitle = 'Your returned books will appear here after you return them';
        break;
      case 'overdue':
        icon = '⏰';
        title = 'No overdue books';
        subtitle = 'Great! All your books are returned on time';
        break;
      default:
        icon = '📚';
        title = 'No books found';
        subtitle = 'Check back later for updates';
    }
    
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>{icon}</Text>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your books...</Text>
    </View>
  );
}

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="My Books"
        subtitle="Manage your borrowed books"
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/borrowing/my-books"
      />

      {/* Tab Navigation */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          onPress={() => setTab('borrowed')} 
          style={[styles.tab, tab === 'borrowed' && styles.activeTab]}
        >
          <Text style={tab === 'borrowed' ? styles.activeTabText : styles.tabText}>
            Borrowed ({books.borrowed.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setTab('returned')} 
          style={[styles.tab, tab === 'returned' && styles.activeTab]}
        >
          <Text style={tab === 'returned' ? styles.activeTabText : styles.tabText}>
            Returned ({books.returned.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setTab('overdue')} 
          style={[styles.tab, tab === 'overdue' && styles.activeTab]}
        >
          <Text style={tab === 'overdue' ? styles.activeTabText : styles.tabText}>
            Overdue ({books.overdue.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => loadUserBooks(true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Books List */}
      <FlatList
        data={books[tab] || []}
        keyExtractor={item => item.id.toString()}
        renderItem={renderBookItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Book Issue</Text>
            
            <View style={styles.reportTypeSection}>
              <Text style={styles.sectionTitle}>Issue Type:</Text>
              <View style={styles.reportTypeOptions}>
                {['lost', 'damaged', 'overdue'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.reportTypeOption,
                      reportData.reportType === type && styles.selectedReportType
                    ]}
                    onPress={() => setReportData(prev => ({ ...prev, reportType: type }))}
                  >
                    <Text style={[
                      styles.reportTypeText,
                      reportData.reportType === type && styles.selectedReportTypeText
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description:</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe the issue..."
                multiline
                numberOfLines={4}
                value={reportData.description}
                onChangeText={(text) => setReportData(prev => ({ ...prev, description: text }))}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  !reportData.description.trim() && styles.submitButtonDisabled
                ]} 
                onPress={submitReport}
                disabled={!reportData.description.trim()}
              >
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Condition Assessment Modal */}
      <ConditionAssessment
        visible={conditionModalVisible}
        onClose={() => setConditionModalVisible(false)}
        onSubmit={conditionModalType === 'return' ? handleReturnConditionSubmit : handleBorrowConditionSubmit}
        title={conditionModalType === 'return' ? 'Book Return Condition' : 'Book Borrow Condition'}
        submitText={conditionModalType === 'return' ? 'Return Book' : 'Borrow Book'}
        isReturn={conditionModalType === 'return'}
      />

      {/* Note */}
      <Text style={styles.note}>
        Note: If books are lost or damaged, please report it immediately.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#1e293b',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b'
  },

  // Tab Navigation
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
    borderColor: '#3b82f6' 
  },
  tabText: { 
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  },
  activeTabText: { 
    color: '#3b82f6', 
    fontWeight: '700',
    fontSize: 14
  },

  // Error Container
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 20,
    alignItems: 'center'
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },

  // Loading Container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    color: '#64748b',
    marginTop: 16,
    fontSize: 16
  },

  // List Container
  listContainer: {
    padding: 20,
    paddingBottom: 100
  },

  // Book Card
  bookCard: { 
    backgroundColor: '#ffffff',
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  bookTitle: { 
    fontWeight: '700', 
    fontSize: 18,
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
    lineHeight: 24
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  bookAuthor: { 
    color: '#64748b',
    fontSize: 16,
    marginBottom: 16
  },
  bookDetails: {
    marginBottom: 20
  },
  detailText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 4
  },
  fineText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  renewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center'
  },
  renewButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  },
  returnButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center'
  },
  returnButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  },
  reportButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center'
  },
  reportButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  },
  
  // New styles for enhanced book history
  overdueText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  historyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center'
  },
  historyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  },
  fineButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center'
  },
  fineButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20
  },
  reportTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 4,
    alignItems: 'center'
  },
  reportTypeButtonActive: {
    backgroundColor: '#3b82f6'
  },
  reportTypeText: {
    color: '#64748b',
    fontWeight: '500'
  },
  reportTypeTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600'
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    marginLeft: 8,
    alignItems: 'center'
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.7
  },

  // Note
  note: { 
    margin: 20, 
    color: '#64748b', 
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic'
  },

  // NEW: Styles for Report Modal
  reportTypeSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8
  },
  reportTypeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  reportTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 4,
    alignItems: 'center'
  },
  selectedReportType: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  selectedReportTypeText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  descriptionSection: {
    marginBottom: 20
  }
});

export default MyBooks;