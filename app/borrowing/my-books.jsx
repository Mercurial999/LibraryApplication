import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const MyBooks = () => {
  const router = useRouter();
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
  // Track local pending renewals by bookId -> previousDueDate (ISO)
  const [pendingRenewals, setPendingRenewals] = useState({});
  // Track reported books to show proper status
  const [reportedBooks, setReportedBooks] = useState({});
  // Detail dialog state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBookDetail, setSelectedBookDetail] = useState(null);
  // Borrowing history state
  const [borrowingHistory, setBorrowingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Get user ID dynamically from storage
  const [userId, setUserId] = useState(null);

  const PENDING_RENEWALS_KEY = 'pending_renewals_by_book';

  const loadPendingRenewals = async () => {
    try {
      const v = await AsyncStorage.getItem(PENDING_RENEWALS_KEY);
      if (v) setPendingRenewals(JSON.parse(v));
    } catch {}
  };
  const savePendingRenewals = async (obj) => {
    try { await AsyncStorage.setItem(PENDING_RENEWALS_KEY, JSON.stringify(obj)); } catch {}
  };

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

  const loadReportedBooks = async (currentUserId) => {
    try {
      const reportsRes = await ApiService.listLostDamagedReports({ 
        userId: String(currentUserId || ''), 
        status: 'all' 
      }).catch(() => ({ data: [] }));
      
      const reports = Array.isArray(reportsRes)
        ? reportsRes
        : (Array.isArray(reportsRes?.data) ? reportsRes.data : (reportsRes?.data?.reports || reportsRes?.reports || []));
      
      const reportedIndex = {};
      (reports || []).forEach(r => {
        const txn = String(r.transactionId || r.borrowTransactionId || r.transaction_id || '');
        const copy = String(r.bookCopyId || r.copyId || r.copy_id || '');
        const bookId = String(r.bookId || r.book_id || '');
        
        // Create a normalized report object with all possible fields
        const normalizedReport = {
          ...r,
          status: String(r.status || 'PENDING').toUpperCase(),
          reportType: String(r.reportType || 'LOST').toUpperCase(),
          resolutionType: String(r.resolutionType || '').toUpperCase(),
          transactionId: txn,
          bookCopyId: copy,
          bookId: bookId
        };
        
        // Index by multiple identifiers for better matching
        if (txn) reportedIndex[`txn:${txn}`] = normalizedReport;
        if (copy) reportedIndex[`copy:${copy}`] = normalizedReport;
        if (bookId) reportedIndex[`book:${bookId}`] = normalizedReport;
      });
      
      console.log('Loaded reported books:', reportedIndex);
      setReportedBooks(reportedIndex);
    } catch (e) {
      console.error('Error loading reported books:', e);
      setReportedBooks({});
    }
  };

  const loadBorrowingHistory = async () => {
    try {
      setHistoryLoading(true);
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        throw new Error('User ID not available. Please log in again.');
      }
      
      const response = await ApiService.getUserBooks(currentUserId, { status: 'all', includeHistory: true });
      
      if (response.success && response.data) {
        // Combine all books from different statuses and sort by borrow date
        const allBooks = [
          ...(response.data.borrowedBooks || []),
          ...(response.data.returnedBooks || []),
          ...(response.data.overdueBooks || [])
        ].sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
        
        setBorrowingHistory(allBooks);
      } else {
        throw new Error('Failed to load borrowing history');
      }
    } catch (err) {
      console.error('Error loading borrowing history:', err);
      Alert.alert('Error', err.message || 'Failed to load borrowing history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadUserBooks = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) {
        setLoading(true);
      }
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        throw new Error('User ID not available. Please log in again.');
      }
      
      // Load both books and reported books in parallel
      const [response] = await Promise.all([
        ApiService.getUserBooks(currentUserId, { status: 'all', includeHistory: true }),
        loadReportedBooks(currentUserId)
      ]);
      
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

  // Enhanced refresh that also updates report statuses
  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      const currentUserId = userId || await loadUserId();
      if (currentUserId) {
        // Refresh both books and reports data
        await Promise.all([
          loadUserBooks(true),
          loadReportedBooks(currentUserId)
        ]);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    refreshAllData();
  };

  useEffect(() => {
    let intervalId;
    let renewCheckId;
    const initializeData = async () => {
      await loadUserId();
      await loadPendingRenewals();
      await loadUserBooks();
      // Initial sync to reflect server-approved/rejected renewals
      await syncRenewalStatuses();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      intervalId = setInterval(() => {
        loadUserBooks(true);
      }, sevenDaysMs);
      // Check renewal statuses frequently to clear local pending when approved/rejected/cancelled
      renewCheckId = setInterval(() => {
        syncRenewalStatuses();
      }, 20000);
    };
    initializeData();
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (renewCheckId) clearInterval(renewCheckId);
    };
  }, []);

  const handleReturnBook = async () => {
    Alert.alert('In-Person Return', 'Please return books at the library circulation desk.');
  };

  const handleRenewBook = async (book) => {
    try {
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'User ID not available. Please log in again.');
        return;
      }
      const resolvedCopyId = book.copyId || (book.copy && book.copy.id);
      const resolvedBookId = book.bookId || (book.book && book.book.id);
      if (!resolvedBookId) {
        Alert.alert('Error', 'Cannot renew this item because copy details are missing.');
        return;
      }
      if (!resolvedCopyId) {
        Alert.alert(
          'Select Copy Required',
          'We need the specific copy to request a renewal. Please pick a copy on the book details screen.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Details', onPress: () => router.push({ pathname: '/book-catalog/details', params: { id: resolvedBookId } }) }
          ]
        );
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
                await ApiService.createMobileRenewal(currentUserId, resolvedBookId, {
                  copyId: resolvedCopyId,
                  reason: 'Extension requested',
                  notes: `Requested via mobile on ${new Date().toLocaleDateString()}`
                });
                // Store previous due date locally to avoid showing extended days
                setPendingRenewals(prev => {
                  const next = { ...prev, [resolvedBookId]: book.dueDate };
                  savePendingRenewals(next);
                  return next;
                });
                Alert.alert(
                  'Request Submitted',
                  'Renewal request submitted for librarian approval.',
                  [
                    { text: 'OK' },
                    { text: 'View Renewal Requests', onPress: () => router.push('/borrowing/my-requests?tab=renewal') }
                  ]
                );
                // Do NOT refresh from server to prevent immediate UI extension
              } catch (err) {
                if (err.errorCode) {
                  const code = String(err.errorCode).toUpperCase();
                  switch (code) {
                    case 'MISSING_COPY_ID':
                      Alert.alert('Renewal Failed', 'Please select a specific copy to renew.');
                      break;
                    case 'BORROW_NOT_FOUND':
                      Alert.alert('Renewal Failed', 'No active borrow found for this copy.');
                      break;
                    case 'OVERDUE_BOOK':
                      Alert.alert('Cannot Renew', 'This book is overdue. Please return it first.');
                      break;
                    case 'RESERVATION_CONFLICT':
                      Alert.alert('Cannot Renew', 'This copy is reserved by another borrower.');
                      break;
                    case 'REQUEST_EXISTS':
                      Alert.alert('Already Requested', 'A renewal request is already pending.');
                      break;
                    default:
                      Alert.alert('Error', err.message || 'Failed to renew book');
                  }
                } else {
                  console.error('Renewal error (internal):', err);
                }
              }
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process renewal');
    }
  };

  const handleReportBook = (book) => {
    const resolvedBookId = book.bookId || (book.book && book.book.id) || book.id;
    const resolvedTitle = book.bookTitle || (book.book && book.book.title) || book.title || 'Book';
    const resolvedAuthor = book.bookAuthor || (book.book && book.book.author) || book.author || 'Unknown Author';
    const resolvedDue = book.dueDate || (book.borrowTransaction && book.borrowTransaction.dueDate) || '';
    const resolvedCopyId = book.copyId || (book.copy && book.copy.id) || book.qrCode || book.qr_code || '';
    const resolvedCopyNumber = book.copyNumber || (book.copy && book.copy.copyNumber) || book.copy_number || book.number || '';
    const resolvedShelf = book.shelfLocation || (book.copy && book.copy.shelfLocation) || book.location || '';
    const resolvedTxnId = book.transactionId || book.borrowTransactionId || (book.borrowTransaction && book.borrowTransaction.id) || '';

    // Navigate to the dedicated Report module with copy-specific identifiers
    router.push({
      pathname: '/reports/report',
      params: {
        bookId: resolvedBookId,
        title: resolvedTitle,
        author: resolvedAuthor,
        dueDate: resolvedDue,
        copyId: String(resolvedCopyId || ''),
        copyNumber: String(resolvedCopyNumber || ''),
        shelfLocation: resolvedShelf,
        transactionId: String(resolvedTxnId || ''),
      }
    });
  };

  // Sync local pendingRenewals with server statuses; if approved, refresh books
  const syncRenewalStatuses = async () => {
    try {
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) return;
      const res = await ApiService.getUserRenewalRequests(currentUserId);
      const rows = Array.isArray(res) ? res : (res?.data?.renewals || res?.renewals || res?.data || []);
      if (!Array.isArray(rows)) return;
      const byBook = {};
      rows.forEach(r => {
        const bId = r.bookId || (r.book && r.book.id);
        if (!bId) return;
        if (!byBook[bId]) byBook[bId] = [];
        byBook[bId].push(r);
      });
      let changed = false;
      const next = { ...pendingRenewals };
      Object.keys(next).forEach(bookId => {
        const reqs = byBook[bookId] || [];
        const anyPending = reqs.some(r => (String(r.status).toUpperCase() === 'PENDING'));
        if (!anyPending) {
          delete next[bookId];
          changed = true;
        }
      });
      if (changed) {
        setPendingRenewals(next);
        savePendingRenewals(next);
        // If something transitioned out of PENDING (e.g., APPROVED), refresh books to show updated due date
        loadUserBooks(true);
      }
    } catch (e) {
      // silent fail; background sync only
    }
  };

  const getDaysRemaining = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (book) => {
    const effectiveDue = pendingRenewals[book.bookId || (book.book && book.book.id)] || book.dueDate;
    const daysRemaining = getDaysRemaining(effectiveDue);
    if (book.status === 'overdue' || daysRemaining <= 0) return '#dc2626';
    if (daysRemaining <= 3) return '#d97706';
    return '#059669';
  };

  const getStatusText = (book) => {
    if (pendingRenewals[book.bookId || (book.book && book.book.id)]) return 'Renewal pending';
    const effectiveDue = book.dueDate;
    const daysRemaining = getDaysRemaining(effectiveDue);
    if (book.status === 'overdue' || daysRemaining <= 0) return 'Due today';
    if (daysRemaining === 1) return 'Due tomorrow';
    if (daysRemaining <= 3) return `${daysRemaining} days remaining`;
    return `${daysRemaining} days remaining`;
  };

  const isBookReported = (book) => {
    const bookId = book.bookId || (book.book && book.book.id);
    const copyId = book.copyId || (book.copy && book.copy.id);
    const transactionId = book.transactionId || book.borrowTransactionId;
    
    return reportedBooks[`txn:${String(transactionId)}`] || 
           reportedBooks[`copy:${String(copyId)}`] || 
           reportedBooks[`book:${String(bookId)}`];
  };

  const getReportStatus = (book) => {
    const report = isBookReported(book);
    if (!report) return null;
    
    const status = String(report.status || 'PENDING').toUpperCase();
    const reportType = String(report.reportType || 'LOST').toUpperCase();
    const resolutionType = String(report.resolutionType || '').toUpperCase();
    
    // Enhanced status mapping with better synchronization
    // Check for resolved status first, as it takes priority
    if (status === 'RESOLVED') {
      if (resolutionType === 'FINE_PAID') {
        return { text: 'Fine Paid', color: '#28A745', icon: 'check-circle' };
      } else if (resolutionType === 'WAIVED') {
        return { text: 'Fine Waived', color: '#17A2B8', icon: 'information' };
      }
      return { text: 'Resolved', color: '#28A745', icon: 'check-circle' };
    } else if (status === 'PENDING') {
      return { text: 'Under Review', color: '#FFA500', icon: 'clock-outline' };
    } else if (status === 'PROCESSED') {
      return { text: 'Processed', color: '#6B7280', icon: 'cog-outline' };
    } else if (status === 'RETURNED_LOST') {
      return { text: 'Returned (Marked as Lost)', color: '#DC2626', icon: 'book-off' };
    } else if (status === 'RETURNED_DAMAGED') {
      return { text: 'Returned (Marked as Damaged)', color: '#F59E0B', icon: 'wrench' };
    } else if (status === 'COMPLETED') {
      return { text: 'Report Completed', color: '#10B981', icon: 'check-circle' };
    } else if (status === 'CANCELLED') {
      return { text: 'Report Cancelled', color: '#6B7280', icon: 'close-circle' };
    }
    
    return { text: 'Reported as ' + reportType, color: '#DC2626', icon: 'alert-circle' };
  };

  const renderBookItem = ({ item }) => {
    const reportStatus = getReportStatus(item);
    const isReported = isBookReported(item);
    
    return (
      <View style={styles.bookCard}>
        <View style={styles.bookHeader}>
          <View style={styles.bookTitleContainer}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.bookTitle}
            </Text>
            <Text style={styles.bookAuthor}>by {item.bookAuthor}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
            <Text style={styles.statusText}>{getStatusText(item)}</Text>
          </View>
        </View>

        <View style={styles.bookMeta}>
          <View style={styles.bookDetailItem}>
            <MaterialCommunityIcons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.bookDetailText}>
              Borrowed: {new Date(item.borrowDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.bookDetailItem}>
            <MaterialCommunityIcons name="book-open-variant" size={16} color="#6b7280" />
            <Text style={styles.bookDetailText}>
              Due: {new Date((pendingRenewals[item.bookId] || (item.book && item.book.id && pendingRenewals[item.book.id]) || item.dueDate)).toLocaleDateString()}
            </Text>
          </View>
          {item.copyNumber && (
            <View style={styles.bookDetailItem}>
              <MaterialCommunityIcons name="file-document" size={16} color="#6b7280" />
              <Text style={styles.bookDetailText}>Copy: {item.copyNumber}</Text>
            </View>
          )}
        </View>

        {/* Enhanced Status Indicators */}
        {pendingRenewals[item.bookId || (item.book && item.book.id)] && (
          <View style={styles.pendingRenewalBanner}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#8b5cf6" />
            <Text style={styles.pendingRenewalText}>Renewal request pending approval</Text>
          </View>
        )}

        {item.status === 'overdue' && (
          <View style={styles.overdueBanner}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.overdueText}>
              {Math.abs(getDaysRemaining(item.dueDate))} days overdue
            </Text>
          </View>
        )}

        {item.fineAmount > 0 && (
          <View style={styles.fineBanner}>
            <MaterialCommunityIcons name="currency-usd" size={16} color="#dc2626" />
            <Text style={styles.fineText}>
              Fine: ${item.fineAmount.toFixed(2)} ({item.fineStatus})
            </Text>
          </View>
        )}
        
        {/* Enhanced Report Status Banner */}
        {isReported && reportStatus && (
          <View style={[styles.reportedBanner, { backgroundColor: reportStatus.color + '15', borderColor: reportStatus.color + '30' }]}>
            <View style={styles.reportedBannerContent}>
              <MaterialCommunityIcons 
                name={reportStatus.icon} 
                size={18} 
                color={reportStatus.color} 
                style={{ marginRight: 8 }} 
              />
              <Text style={[styles.reportedText, { color: reportStatus.color }]}>
                {reportStatus.text}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.actionButtons}>
          {item.status === 'borrowed' && !isReported && (
            <TouchableOpacity 
              style={[styles.renewButton, pendingRenewals[item.bookId || (item.book && item.book.id)] && { backgroundColor: '#94a3b8' }]}
              onPress={() => handleRenewBook(item)}
              disabled={!!pendingRenewals[item.bookId || (item.book && item.book.id)]}
            >
              <MaterialCommunityIcons name="autorenew" size={16} color="#ffffff" />
              <Text style={styles.renewButtonText}>
                {pendingRenewals[item.bookId || (item.book && item.book.id)] ? 'Pending Approval' : 'Renew'}
              </Text>
            </TouchableOpacity>
          )}
          {item.status === 'returned' && (
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={() => handleViewHistory(item)}
            >
              <MaterialCommunityIcons name="file-document-outline" size={16} color="#ffffff" />
              <Text style={styles.historyButtonText}>View Details</Text>
            </TouchableOpacity>
          )}
          {item.status === 'overdue' && (
            <TouchableOpacity 
              style={styles.fineButton}
              onPress={() => handleViewFines(item)}
            >
              <MaterialCommunityIcons name="currency-usd" size={16} color="#ffffff" />
              <Text style={styles.fineButtonText}>View Fines</Text>
            </TouchableOpacity>
          )}
          {!isReported && item.status === 'borrowed' && (
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={() => handleReportBook(item)}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.reportButtonText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const handleViewHistory = (book) => {
    setSelectedBookDetail(book);
    setDetailModalVisible(true);
  };

  const handleViewBorrowingHistory = () => {
    loadBorrowingHistory();
    setDetailModalVisible(true);
  };

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
        { text: 'Return Info', onPress: () => handleReturnBook(book) },
        { text: 'OK' }
      ]
    );
  };

  const submitReport = async () => {
    try {
      const currentUserId = userId || await loadUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'User ID not available. Please log in again.');
        return;
      }
      if (!selectedBook) {
        Alert.alert('Error', 'No book selected for reporting.');
        return;
      }
      const resolvedBookId = selectedBook.bookId || (selectedBook.book && selectedBook.book.id);
      if (!resolvedBookId) {
        Alert.alert('Error', 'Book details are missing.');
        return;
      }
      const typeUpper = String(reportData.reportType || '').toUpperCase();
      await ApiService.reportMobileIncident(currentUserId, resolvedBookId, {
        type: typeUpper,
        description: reportData.description
      });
      setReportModalVisible(false);
      setReportData({ reportType: 'lost', description: '' });
      Alert.alert('Report Submitted', 'Your report has been submitted and will be reviewed by the librarian.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit report');
    }
  };

  const renderEmptyState = () => {
    let icon, title, subtitle;
    switch (tab) {
      case 'borrowed':
        icon = '📚'; title = 'No borrowed books'; subtitle = 'Start borrowing books from the catalog!'; break;
      case 'returned':
        icon = '📖'; title = 'No returned books'; subtitle = 'Your returned books will appear here after you return them'; break;
      case 'overdue':
        icon = '⏰'; title = 'No overdue books'; subtitle = 'Great! All your books are returned on time'; break;
      default:
        icon = '📚'; title = 'No books found'; subtitle = 'Check back later for updates';
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
      <Header 
        title="My Books"
        subtitle="Manage your borrowed books"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={handleViewBorrowingHistory}
        >
          <MaterialCommunityIcons name="history" size={16} color="#ffffff" />
          <Text style={styles.historyButtonText}>View History</Text>
        </TouchableOpacity>
      </View>
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/borrowing/my-books"
      />
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

      {/* Detail/History Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>
                {selectedBookDetail ? 'Book Details' : 'Borrowing History'}
              </Text>
              <TouchableOpacity 
                style={styles.detailModalClose}
                onPress={() => {
                  setDetailModalVisible(false);
                  setSelectedBookDetail(null);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {selectedBookDetail ? (
              // Single book detail view
              <View style={styles.bookDetailContainer}>
                <View style={styles.bookDetailHeader}>
                  <Text style={styles.bookDetailTitle}>{selectedBookDetail.bookTitle}</Text>
                  <Text style={styles.bookDetailAuthor}>by {selectedBookDetail.bookAuthor}</Text>
                </View>
                
                <View style={styles.bookDetailInfo}>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="calendar" size={20} color="#3b82f6" />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Borrowed Date</Text>
                      <Text style={styles.detailItemValue}>
                        {new Date(selectedBookDetail.borrowDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="book-open-variant" size={20} color="#3b82f6" />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Due Date</Text>
                      <Text style={styles.detailItemValue}>
                        {new Date(selectedBookDetail.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  {selectedBookDetail.returnDate && (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Returned Date</Text>
                        <Text style={styles.detailItemValue}>
                          {new Date(selectedBookDetail.returnDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedBookDetail.copyNumber && (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="file-document" size={20} color="#3b82f6" />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Copy Number</Text>
                        <Text style={styles.detailItemValue}>{selectedBookDetail.copyNumber}</Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedBookDetail.fineAmount > 0 && (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="currency-usd" size={20} color="#dc2626" />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Fine Amount</Text>
                        <Text style={[styles.detailItemValue, { color: '#dc2626' }]}>
                          ${selectedBookDetail.fineAmount.toFixed(2)} ({selectedBookDetail.fineStatus})
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="tag" size={20} color="#3b82f6" />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Status</Text>
                      <Text style={[styles.detailItemValue, { color: getStatusColor(selectedBookDetail) }]}>
                        {getStatusText(selectedBookDetail)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              // Borrowing history view
              <View style={styles.historyContainer}>
                {historyLoading ? (
                  <View style={styles.historyLoading}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.historyLoadingText}>Loading history...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={borrowingHistory}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={({ item }) => (
                      <View style={styles.historyItem}>
                        <View style={styles.historyItemHeader}>
                          <Text style={styles.historyItemTitle} numberOfLines={2}>
                            {item.bookTitle}
                          </Text>
                          <View style={[styles.historyStatusBadge, { backgroundColor: getStatusColor(item) }]}>
                            <Text style={styles.historyStatusText}>
                              {item.status === 'borrowed' ? 'Borrowed' : 
                               item.status === 'returned' ? 'Returned' : 'Overdue'}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.historyItemAuthor}>by {item.bookAuthor}</Text>
                        
                        <View style={styles.historyItemDetails}>
                          <View style={styles.historyDetailItem}>
                            <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
                            <Text style={styles.historyDetailText}>
                              {new Date(item.borrowDate).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.historyDetailItem}>
                            <MaterialCommunityIcons name="book-open-variant" size={14} color="#6b7280" />
                            <Text style={styles.historyDetailText}>
                              Due: {new Date(item.dueDate).toLocaleDateString()}
                            </Text>
                          </View>
                          {item.returnDate && (
                            <View style={styles.historyDetailItem}>
                              <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                              <Text style={styles.historyDetailText}>
                                Returned: {new Date(item.returnDate).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={() => (
                      <View style={styles.historyEmpty}>
                        <MaterialCommunityIcons name="history" size={48} color="#9ca3af" />
                        <Text style={styles.historyEmptyTitle}>No History Found</Text>
                        <Text style={styles.historyEmptySubtitle}>
                          Your borrowing history will appear here
                        </Text>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.historyListContainer}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.modalContent}>
                {/* Top-right close */}
                <TouchableOpacity style={styles.modalCloseX} onPress={() => setReportModalVisible(false)}>
                  <Text style={styles.modalCloseXText}>✕</Text>
                </TouchableOpacity>
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
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Online return disabled: no condition assessment modal */}

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
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  bookTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  bookTitle: { 
    fontWeight: '700', 
    fontSize: 18,
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  bookAuthor: { 
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  },
  bookMeta: {
    marginBottom: 16
  },
  bookDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  bookDetailText: {
    color: '#64748b',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  renewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  renewButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6
  },
  returnButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  returnButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6
  },
  reportButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  reportButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6
  },
  
  // Enhanced Status Banners
  pendingRenewalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6'
  },
  pendingRenewalText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626'
  },
  overdueText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  fineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626'
  },
  fineText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  historyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'flex-end'
  },
  historyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6
  },
  fineButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  fineButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400
  },
  modalCloseX: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalCloseXText: {
    color: '#64748b',
    fontWeight: '700'
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

  // Header Actions
  headerActions: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'flex-end'
  },

  // Detail Modal Styles
  detailModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    margin: 0,
    maxHeight: '92%',
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b'
  },
  detailModalClose: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },

  // Book Detail Styles
  bookDetailContainer: {
    flex: 1,
    padding: 20
  },
  bookDetailHeader: {
    marginBottom: 24
  },
  bookDetailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 32
  },
  bookDetailAuthor: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500'
  },
  bookDetailInfo: {
    gap: 16
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  detailItemContent: {
    marginLeft: 16,
    flex: 1
  },
  detailItemLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4
  },
  detailItemValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600'
  },

  // History Styles
  historyContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc'
  },
  historyLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  historyLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  historyListContainer: {
    paddingBottom: 20
  },
  historyItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12
  },
  historyStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  historyStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  historyItemAuthor: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12
  },
  historyItemDetails: {
    gap: 8
  },
  historyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  historyDetailText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500'
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  historyEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8
  },
  historyEmptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center'
  },

  // Reported Banner
  reportedBanner: {
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  reportedBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportedText: {
    fontWeight: '600',
    fontSize: 12,
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