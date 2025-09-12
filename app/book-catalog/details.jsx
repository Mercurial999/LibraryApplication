import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import BookConditionsView from '../../components/BookConditionsView';
import BorrowRequestModal from '../../components/BorrowRequestModal';
import Header from '../../components/Header';
import ApiService from '../../services/ApiService';
import { logAction as logReco } from '../../services/RecoService';

const BookDetailsScreen = () => {
  const { id, fromReservation } = useLocalSearchParams();
  const router = useRouter();
  
  const [book, setBook] = useState(null);
  const [availableCopies, setAvailableCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiesError, setCopiesError] = useState(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [pendingCopyIds, setPendingCopyIds] = useState(new Set());
  const [reservedCopyIds, setReservedCopyIds] = useState(new Set());
  const [hasBookReservation, setHasBookReservation] = useState(false);

  // Load pending copy IDs from storage and server
  const loadPendingCopyIds = async () => {
    try {
      const storageKey = `pending_copy_ids_${id}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const copyIds = JSON.parse(stored);
        console.log('📋 Loaded pending copy IDs from storage:', copyIds);
        setPendingCopyIds(new Set(copyIds));
      }

      console.log('🔍 Loading pending requests from server for book:', id);
      try {
        const response = await ApiService.getBorrowRequests('pending');
        if (response.success && response.data && response.data.requests) {
          const bookRequests = response.data.requests.filter(request => String(request.bookId) === String(id) && String(request.status).toUpperCase() === 'PENDING');
          console.log('📋 Pending borrow requests for this book:', bookRequests);
          const serverCopyIds = new Set(bookRequests.map(r => r.copyId).filter(Boolean));
          if (serverCopyIds.size >= 0) {
            setPendingCopyIds(serverCopyIds);
            await savePendingCopyIds(serverCopyIds);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not load pending requests from server:', error.message);
        console.log('⚠️ Relying on client state only');
      }
    } catch (error) {
      console.error('❌ Error loading pending copy IDs:', error);
    }
  };

  // Load reserved copy IDs for current user (status pending/active)
  const loadReservedCopyIds = async () => {
    try {
      // Load local UI memory first
      const stored = await AsyncStorage.getItem(`reserved_copy_ids_${id}`);
      const localIds = stored ? new Set(JSON.parse(stored)) : new Set();
      const res = await ApiService.getUserReservations('all');
      const rows = Array.isArray(res)
        ? res
        : (Array.isArray(res?.data) ? res.data : (res?.data?.reservations || res?.reservations || []));
      const mine = (rows || []).filter(r => {
        const status = String(r.status || '').toUpperCase();
        const isActive = status === 'ACTIVE' || status === 'READY' || status === 'PENDING';
        return isActive && String(r.bookId || r.book_id) === String(id);
      });
      const serverIds = new Set(mine.map(r => r.copyId || r.copy_id || (r.copy && r.copy.id)).filter(Boolean));
      const merged = new Set([...Array.from(localIds), ...Array.from(serverIds)]);
      setReservedCopyIds(merged);
      setHasBookReservation(mine.length > 0);
    } catch (error) {
      console.log('⚠️ Could not load reserved copy IDs:', error?.message);
      setReservedCopyIds(new Set());
      setHasBookReservation(false);
    }
  };

  // Save pending copy IDs to storage
  const savePendingCopyIds = async (copyIds) => {
    try {
      const storageKey = `pending_copy_ids_${id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(copyIds)));
      console.log('📋 Saved pending copy IDs:', Array.from(copyIds));
    } catch (error) {
      console.error('❌ Error saving pending copy IDs:', error);
    }
  };

  // Load book details and available copies
  const loadBookDetails = async (isRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading book details for ID:', id);
      const bookResponse = await ApiService.getBookById(id);
      if (bookResponse.success && bookResponse.data) {
        setBook(bookResponse.data);
        await Promise.all([
          loadAvailableCopies(bookResponse.data),
          loadPendingCopyIds(),
          loadReservedCopyIds()
        ]);
      } else {
        setError('Book not found');
      }
    } catch (err) {
      console.error('Error loading book details:', err);
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  // Load available copies for the book
  const loadAvailableCopies = async (bookData) => {
    setLoadingCopies(true);
    setCopiesError(null);
    try {
      console.log(`🔍 Loading available copies for book: ${bookData.id}`);
      if (bookData.copies && bookData.copies.length > 0) {
        const availableCopies = bookData.copies.filter(copy => 
          copy.status === 'AVAILABLE' || copy.status === 'available'
        );
        setAvailableCopies(availableCopies);
        setCopiesError(null);
      } else {
        setAvailableCopies([]);
        setCopiesError('No copies available for this book');
      }
    } catch (error) {
      console.error('❌ Error processing copy data:', error);
      setAvailableCopies([]);
      setCopiesError('Unable to load book copies. Please try again.');
    } finally {
      setLoadingCopies(false);
    }
  };

  // Handle copy selection for borrowing
  const handleCopySelection = (copy) => {
    const isCopyPending = pendingCopyIds.has(copy.id);
    if (isCopyPending) {
      Alert.alert(
        'Request Already Submitted',
        'You have already submitted a borrow request for this copy. Please wait for approval or check your requests.',
        [
          { text: 'OK' },
          { text: 'View My Requests', onPress: () => router.push('/borrowing/my-requests') }
        ]
      );
      return;
    }
    setSelectedCopy(copy);
    setShowBorrowModal(true);
  };

  const handleBorrowRequestSuccess = (requestData) => {
    const copyIdToAdd = selectedCopy?.id || requestData.copyId;
    if (copyIdToAdd) {
      setPendingCopyIds(prev => {
        const newSet = new Set(prev);
        newSet.add(copyIdToAdd);
        savePendingCopyIds(newSet);
        return newSet;
      });
    }
    Alert.alert(
      'Success!',
      'Your borrow request has been submitted. You will be notified when it\'s approved.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowBorrowModal(false);
            setSelectedCopy(null);
            loadBookDetails(true);
            try { logReco({ type: 'borrow', bookId: book?.id, category: book?.subject || book?.category, author: book?.author, shelfPrefix: book?.shelfLocationPrefix || book?.shelfPrefix, shelfLocation: book?.shelfLocation }); } catch {}
          }
        }
      ]
    );
  };

  // Remove a pending copy when borrow request is cancelled elsewhere
  const removePendingCopyId = (copyId) => {
    setPendingCopyIds(prev => {
      if (!prev.has(copyId)) return prev;
      const next = new Set(prev);
      next.delete(copyId);
      savePendingCopyIds(next);
      return next;
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookDetails(true);
  };

  useEffect(() => {
    if (id) {
      loadBookDetails();
    }
  }, [id]);

  // Refresh reserved state when screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      loadReservedCopyIds();
      // If we have a selectedCopy and no server copyIds yet, ensure the UI reflects pending for that copy
      (async () => {
        try {
          const getCopyKey = (x) => String(x?.id || x?.copyId || x?.copy_id || x?.barcode || x?.copyNumber || x?.copy_number || '');
          const keyVal = getCopyKey(selectedCopy);
          if (keyVal) {
            const key = `reserved_copy_ids_${id}`;
            const stored = await AsyncStorage.getItem(key);
            const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
            if (!prev.has(keyVal)) {
              prev.add(keyVal);
              await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
            }
            setReservedCopyIds(new Set(prev));
          }
        } catch {}
      })();
      return () => {};
    }, [id])
  );

  const renderCopyItem = ({ item }) => {
    const getCopyKey = (c) => String(c?.id || c?.copyId || c?.copy_id || c?.qrCode || c?.qr_code || c?.qrcode || c?.qr || c?.code || c?.uid || c?.uuid || c?.copyNumber || c?.copy_number || c?.number || '');
    const isCopyPending = pendingCopyIds.has(getCopyKey(item));
    return (
      <TouchableOpacity
        style={[styles.copyItem, isCopyPending && styles.pendingCopyItem]}
        onPress={() => handleCopySelection(item)}
      >
        <View style={styles.copyIconContainer}>
          <Text style={styles.copyIcon}>📚</Text>
        </View>
        <View style={styles.copyInfo}>
          <Text style={styles.copyNumber}>{item.copyNumber}</Text>
          <Text style={styles.copyLocation}>📍 {item.location}</Text>
          <Text style={styles.copyShelf}>📋 Shelf: {item.shelfLocation}</Text>
          <Text style={styles.copyCondition}>✨ Condition: {item.condition}</Text>
        </View>
        <View style={styles.copyAction}>
          {isCopyPending ? (
            <>
              <Text style={styles.pendingText}>⏳ Request Pending</Text>
              <Text style={styles.pendingArrow}>⏳</Text>
            </>
          ) : (
            <>
              <Text style={styles.borrowText}>Request to Borrow</Text>
              <Text style={styles.borrowArrow}>→</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Available Copies</Text>
      <Text style={styles.emptySubtitle}>
        All copies of this book are currently borrowed or reserved.
      </Text>
      <TouchableOpacity
        style={styles.reserveButton}
        onPress={() => {
          if (fromReservation === 'true') {
            // Coming from reservation page - go back to main reservation page
            router.back();
          } else {
            // Coming from book catalog - show confirmation dialog
            Alert.alert(
              'Reservation',
              'This book is not available for immediate borrowing. Would you like to reserve it?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reserve', onPress: () => {
                  setShowReserveModal(true);
                }}
              ]
            );
          }
        }}
      >
        <Text style={styles.reserveButtonText}>
          {fromReservation === 'true' ? '← Back to Reservations' : '🔖 Reserve This Book'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.mainErrorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadBookDetails(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📚</Text>
        <Text style={styles.errorTitle}>Book Not Found</Text>
        <Text style={styles.errorText}>The requested book could not be found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back to Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Book Details"
        showMenuButton={false}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>by {book.author}</Text>
          <Text style={styles.bookSubject}>Subject: {book.subject}</Text>
          {book.isbn && <Text style={styles.bookIsbn}>ISBN: {book.isbn}</Text>}
          {book.publisher && <Text style={styles.bookPublisher}>Publisher: {book.publisher}</Text>}
          {book.publicationYear && <Text style={styles.bookYear}>Year: {book.publicationYear}</Text>}
          <View style={styles.bookStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{book.availableCopies || 0}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{book.totalCopies || 0}</Text>
              <Text style={styles.statLabel}>Total Copies</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {book.totalCopies - book.availableCopies || 0}
              </Text>
              <Text style={styles.statLabel}>Borrowed</Text>
            </View>
          </View>
        </View>
        <View style={styles.copiesSection}>
          <Text style={styles.sectionTitle}>Available Copies</Text>
          {loadingCopies && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.loadingText}>Loading available copies...</Text>
            </View>
          )}
          {copiesError && !loadingCopies && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{copiesError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => loadAvailableCopies(book)}
              >
                <Text style={styles.retryButtonText}>🔄 Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {!loadingCopies && !copiesError && availableCopies.length > 0 && (
            <FlatList
              data={availableCopies}
              keyExtractor={(item) => item.id}
              renderItem={renderCopyItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
          {!loadingCopies && !copiesError && availableCopies.length === 0 && (
            renderEmptyState()
          )}
        </View>
        {/* Borrowed Copies (Reservable) */}
        {Array.isArray(book.copies) && book.copies.filter(c => c.status === 'BORROWED' || c.status === 'borrowed').length > 0 && (
          <View style={styles.copiesSection}>
            <Text style={styles.sectionTitle}>Borrowed Copies (Reservable)</Text>
            {book.copies.filter(c => c.status === 'BORROWED' || c.status === 'borrowed').map(c => {
              const getCopyKey = (x) => String(x.id || x.copyId || x.copy_id || x.qrCode || x.qr_code || x.qrcode || x.qr || x.code || x.uid || x.uuid || x.copyNumber || x.copy_number || x.number || '');
              const copyKey = getCopyKey(c);
              const isReservedPending = reservedCopyIds.has(copyKey);
              return (
              <TouchableOpacity key={c.id} style={[styles.copyItem, isReservedPending && styles.pendingCopyItem]} onPress={() => {
                if (isReservedPending) return;
                setSelectedCopy(c);
                setShowReserveModal(true);
              }} disabled={isReservedPending}>
                <View style={styles.copyIconContainer}>
                  <Text style={styles.copyIcon}>📚</Text>
                </View>
                <View style={styles.copyInfo}>
                  <Text style={styles.copyNumber}>Copy #{c.copyNumber}</Text>
                  <Text style={styles.copyLocation}>📍 {c.location || c.shelfLocation || 'Unknown location'}</Text>
                  <Text style={styles.copyCondition}>🔒 Borrowed • Due: {(c.dueDate || c.due_date || c.expectedReturnDate || c.expected_return_date || c.borrowDueDate || (c.borrowtransaction && c.borrowtransaction.dueDate)) ? new Date(c.dueDate || c.due_date || c.expectedReturnDate || c.expected_return_date || c.borrowDueDate || (c.borrowtransaction && c.borrowtransaction.dueDate)).toLocaleDateString() : new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</Text>
                </View>
                <View style={styles.copyAction}>
                  {isReservedPending ? (
                    <>
                      <Text style={styles.pendingText}>⏳ Reservation Pending</Text>
                      <Text style={styles.pendingArrow}>⏳</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.borrowText}>Select to Reserve</Text>
                      <Text style={styles.borrowArrow}>→</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )})}
          </View>
        )}
      </ScrollView>
      <BorrowRequestModal
        visible={showBorrowModal}
        onClose={() => {
          setShowBorrowModal(false);
          setSelectedCopy(null);
        }}
        book={book}
        selectedCopy={selectedCopy}
        onSuccess={handleBorrowRequestSuccess}
      />

      {/* Reserve Modal: borrowed copies only */}
      <BookConditionsView
        visible={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        onSubmit={() => {
          setShowReserveModal(false);
          const getCopyKey = (x) => String(x?.id || x?.copyId || x?.copy_id || x?.barcode || x?.copyNumber || x?.copy_number || '');
          router.push({ pathname: '/reservation/details', params: { id: book.id, copyId: getCopyKey(selectedCopy) } });
          // Persist selected copy for local pending UI immediately
          (async () => {
            try {
              const keyVal = getCopyKey(selectedCopy);
              if (keyVal) {
                const key = `reserved_copy_ids_${book.id}`;
                const stored = await AsyncStorage.getItem(key);
                const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
                prev.add(String(keyVal));
                await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
                setReservedCopyIds(new Set(prev));
                setHasBookReservation(true);
              }
            } catch {}
          })();
        }}
        title="Reservation Details"
        submitText="Continue to Reservation"
        book={book}
        loading={false}
        filterBorrowedOnly={true}
        onSelectCopy={(copy) => setSelectedCopy(copy)}
        selectedCopyId={selectedCopy?.id}
        selectedCopyOnly={true}
      />
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
  bookInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 32
  },
  bookAuthor: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8
  },
  bookSubject: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 4
  },
  bookIsbn: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4
  },
  bookPublisher: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4
  },
  bookYear: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16
  },
  bookStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6'
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  copiesSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16
  },
  copyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  copyIconContainer: {
    marginRight: 16
  },
  copyIcon: {
    fontSize: 24
  },
  copyInfo: {
    flex: 1
  },
  copyNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4
  },
  copyLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2
  },
  copyShelf: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2
  },
  copyCondition: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500'
  },
  copyAction: {
    alignItems: 'center'
  },
  borrowText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 4
  },
  borrowArrow: {
    fontSize: 16,
    color: '#3b82f6'
  },
  pendingCopyItem: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b'
  },
  pendingArrow: {
    fontSize: 16,
    color: '#f59e0b'
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24
  },
  reserveButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  reserveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center'
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  mainErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default BookDetailsScreen;