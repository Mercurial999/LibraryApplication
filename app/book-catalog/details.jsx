import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import BorrowErrorDialog from '../../components/BorrowErrorDialog';
import BorrowRequestModal from '../../components/BorrowRequestModal';
import Header from '../../components/Header';
import ApiService from '../../services/ApiService';
import { logAction as logReco } from '../../services/RecoService';
import StatusSync from '../../utils/StatusSync';

const BookDetailsScreen = () => {
  const { id, fromReservation } = useLocalSearchParams();
  const router = useRouter();
  
  // DEBUG: Verify this is the correct file
  console.log('🔍 DEBUG: BookDetailsScreen loaded - THIS IS THE CORRECT FILE!');
  
  // Define getCopyKey function globally for this component
  const getCopyKey = (c) => String(c?.id || c?.copyId || c?.copy_id || c?.qrCode || c?.qr_code || c?.qrcode || c?.qr || c?.code || c?.uid || c?.uuid || c?.copyNumber || c?.copy_number || c?.number || '');
  
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
  const [isAlreadyBorrowed, setIsAlreadyBorrowed] = useState(false);
  const [hasBookReservation, setHasBookReservation] = useState(false);
  const [currentBorrowedCopyId, setCurrentBorrowedCopyId] = useState(null);
  const [copyStatuses, setCopyStatuses] = useState({
    borrowed: new Set(),
    pending: new Set(),
    reserved: new Set(),
    available: new Set()
  });
  const [loadingCopyId, setLoadingCopyId] = useState(null);
  const [borrowersIndex, setBorrowersIndex] = useState({}); // copyId -> borrower name
  const [errorDialog, setErrorDialog] = useState({ visible: false, type: null });

  // Load pending copy IDs from server (always fetch fresh data)
  const loadPendingCopyIds = async () => {
    try {
      console.log('🔍 Loading pending requests from server for book:', id);
      
      // Clear any stale local storage data first
      const storageKey = `pending_copy_ids_${id}`;
      await AsyncStorage.removeItem(storageKey);
      console.log('🗑️ Cleared stale pending copy IDs from storage');
      
      // Always fetch fresh data from server - don't rely on local storage for status
      const response = await ApiService.getBorrowRequests('pending');
      if (response.success && response.data && response.data.requests) {
        // Filter for this book - backend already filters by PENDING status
        const bookRequests = response.data.requests.filter(request => 
          String(request.bookId) === String(id)
        );
        console.log('📋 Pending borrow requests for this book (from server):', bookRequests);
        
        // Get currently borrowed books to exclude approved requests
        const borrowedResponse = await ApiService.getUserBooks(undefined, { status: 'borrowed', includeHistory: false });
        let borrowedCopyIds = new Set();
        
        if (borrowedResponse) {
          const borrowedBooks = Array.isArray(borrowedResponse) ? borrowedResponse : 
                               Array.isArray(borrowedResponse?.data) ? borrowedResponse.data :
                               Array.isArray(borrowedResponse?.data?.books) ? borrowedResponse.data.books :
                               Array.isArray(borrowedResponse?.books) ? borrowedResponse.books : [];
          
          borrowedBooks.forEach(book => {
            const copyId = book.copyId || book.copy_id || book.copy?.id || book.bookCopyId;
            if (copyId) {
              borrowedCopyIds.add(String(copyId));
            }
          });
        }
        
        console.log('📋 Currently borrowed copy IDs:', Array.from(borrowedCopyIds));
        
        // Since backend already filters by PENDING status, we can trust the server data
        // Just need to exclude any that are currently borrowed (approved requests)
        const serverCopyIds = new Set(bookRequests
          .map(r => r.copyId)
          .filter(Boolean)
          .filter(copyId => !borrowedCopyIds.has(String(copyId)))
        );
        
        console.log('📋 Server pending copy IDs (excluding borrowed):', Array.from(serverCopyIds));
        
        // Update pending copy IDs with fresh server data
        setPendingCopyIds(serverCopyIds);
        savePendingCopyIds(serverCopyIds);
      }
    } catch (error) {
      console.log('⚠️ Could not load pending requests from server:', error.message);
      console.log('⚠️ Relying on client state only');
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
      // Cleanup: if server shows no active reservation for this book, clear stale local flags
      if (mine.length === 0 && localIds.size > 0) {
        try {
          await AsyncStorage.removeItem(`reserved_copy_ids_${id}`);
        } catch {}
        setReservedCopyIds(new Set());
      }
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

  // Clear specific pending copy IDs from storage (when approved)
  const clearPendingCopyIds = async (copyIdsToRemove) => {
    try {
      const storageKey = `pending_copy_ids_${id}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const currentIds = new Set(JSON.parse(stored));
        copyIdsToRemove.forEach(copyId => {
          currentIds.delete(String(copyId));
        });
        await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(currentIds)));
        console.log('📋 Cleared pending copy IDs for book:', id, copyIdsToRemove);
      }
    } catch (error) {
      console.error('❌ Error clearing pending copy IDs:', error);
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
        try {
          // Pre-check if user already borrowed this book from dashboard or user-books API
          const extractRows = (res) => {
            if (!res) return [];
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res?.data?.books)) return res.data.books;
            if (Array.isArray(res?.data?.borrowedBooks)) return res.data.borrowedBooks;
            if (Array.isArray(res?.books)) return res.books;
            if (Array.isArray(res?.data?.items)) return res.data.items;
            if (Array.isArray(res?.data?.borrowed)) return res.data.borrowed;
            if (Array.isArray(res?.borrowed)) return res.borrowed;
            return [];
          };

          let myBooksRes = await ApiService.getUserBooks(undefined, { status: 'borrowed', includeHistory: false }).catch(() => null);
          let rows = extractRows(myBooksRes);
          if (!rows || rows.length === 0) {
            // Fallback to broader status if backend ignores filter
            myBooksRes = await ApiService.getUserBooks(undefined, 'all', false).catch(() => null);
            rows = extractRows(myBooksRes);
          }

          const mine = (rows || []).find(b => String(b.id || b.bookId || b.book_id) === String(bookResponse.data.id)
            && (String(b.status || b.loanStatus || b.loan_status || 'BORROWED').toUpperCase() === 'BORROWED' || String(b.isActive || b.active || 'true') === 'true'));
          const already = Boolean(mine);
          setIsAlreadyBorrowed(already);
          
          console.log('📋 Book details borrowed check:', {
            bookId: bookResponse.data.id,
            foundBorrowedBook: mine,
            already,
            borrowedCopyId: mine?.copyId || mine?.copy_id || mine?.copy?.id,
            rawResponse: myBooksRes,
            extractedRows: rows
          });
          
          if (already) {
            // Try multiple possible copy ID fields
            const borrowedCopyId = mine?.copyId || mine?.copy_id || mine?.copy?.id || mine?.copyNumber || mine?.copy_number || null;
            if (borrowedCopyId) {
              setCurrentBorrowedCopyId(String(borrowedCopyId));
              console.log('📋 Set current borrowed copy ID:', String(borrowedCopyId));
              console.log('🔍 DEBUG: BookDetailsScreen - Setting borrowed copy ID:', {
                borrowedCopyId: String(borrowedCopyId),
                mine: mine,
                DEBUG_FILE: 'BookDetailsScreen - CORRECT FILE',
                DEBUG_LINE: 'Line 164'
              });
            } else {
              console.log('⚠️ No copy ID found in borrowed book data:', mine);
            }
          } else {
            setCurrentBorrowedCopyId(null);
            console.log('🔍 DEBUG: BookDetailsScreen - No borrowed copy found, setting to null');
          }
        } catch {}
        try {
          // Load current borrowers for borrowed copies to display names
          if (Array.isArray(bookResponse.data.copies)) {
            const anyBorrowed = bookResponse.data.copies.some(c => String(c.status || '').toUpperCase() === 'BORROWED');
            if (anyBorrowed) {
              const idx = await fetchActiveBorrowersIndex();
              setBorrowersIndex(idx);
            } else {
              setBorrowersIndex({});
            }
          }
        } catch (e) {
          console.log('⚠️ Could not load borrowers index:', e?.message);
        }
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
        const availableCopies = bookData.copies.filter(copy => {
          const status = String(copy.status || '').toUpperCase();
          return status === 'AVAILABLE';
        });
        setAvailableCopies(availableCopies);
        setCopiesError(null);
      } else {
        setAvailableCopies([]);
        // Don't show error for books with no available copies - they can still be reserved
        setCopiesError(null);
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
    const copyKey = getCopyKey(copy);
    setLoadingCopyId(copyKey);
    
    if (isAlreadyBorrowed) {
      // If the user already borrowed this title, redirect to reservation flow instead of borrow
      setSelectedCopy(copy);
      setShowReserveModal(true);
      setLoadingCopyId(null);
      return;
    }
    const isCopyPending = pendingCopyIds.has(copy.id);
    const copyStatus = String(copy.status || '').toUpperCase();
    if (copyStatus !== 'AVAILABLE') {
      if (copyStatus.includes('LOST')) {
        Alert.alert('Not Borrowable', 'This copy is marked as lost. Please choose another available copy.');
      } else if (copyStatus.includes('DAMAGED')) {
        Alert.alert('Not Borrowable', 'This copy is marked as damaged. Please choose another available copy.');
      } else if (copyStatus.includes('BORROWED') || copyStatus.includes('RESERVED')) {
        Alert.alert('Unavailable', 'This copy is not available. Please choose another available copy.');
      } else {
        Alert.alert('Unavailable', 'This copy is not available right now.');
      }
      setLoadingCopyId(null);
      return;
    }
    if (isCopyPending) {
      Alert.alert(
        'Request Already Submitted',
        'You have already submitted a borrow request for this copy. Please wait for approval or check your requests.',
        [
          { text: 'OK' },
          { text: 'View My Requests', onPress: () => router.push('/borrowing/my-requests') }
        ]
      );
      setLoadingCopyId(null);
      return;
    }
    // Overdue pre-check before opening modal
    (async () => {
      try {
        const has = await ApiService.hasOverdueBooks();
        if (has) {
          setErrorDialog({ visible: true, type: 'overdue_books' });
          setLoadingCopyId(null);
          return;
        }
      } catch {}
      setSelectedCopy(copy);
      setShowBorrowModal(true);
      setLoadingCopyId(null);
    })();
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

  const handleDuplicateBorrowRequest = (copyIdMaybe) => {
    const copyId = copyIdMaybe || selectedCopy?.id;
    if (!copyId) return;
    setPendingCopyIds(prev => {
      if (prev.has(copyId)) return prev;
      const next = new Set(prev);
      next.add(copyId);
      savePendingCopyIds(next);
      return next;
    });
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
      // Clear any stale pending copy IDs from storage on component mount
      const clearStaleData = async () => {
        try {
          const storageKey = `pending_copy_ids_${id}`;
          await AsyncStorage.removeItem(storageKey);
          console.log('🗑️ Cleared stale pending copy IDs on component mount');
        } catch (error) {
          console.log('⚠️ Error clearing stale data:', error.message);
        }
      };
      clearStaleData();
      
      loadBookDetails();
    }
    
    // Set up real-time status synchronization for copy-specific statuses
    const statusSyncCallback = (syncData) => {
      console.log('📡 BookDetails: Received real-time status update with copy statuses');
      if (syncData.copyStatuses) {
        setCopyStatuses(syncData.copyStatuses);
        console.log('📡 BookDetails: Updated copy statuses:', {
          borrowed: syncData.copyStatuses.borrowed.size,
          pending: syncData.copyStatuses.pending.size,
          reserved: syncData.copyStatuses.reserved.size
        });
      }
      
      // Handle clearing pending copy IDs when requests are approved
      if (syncData.clearPending && Array.isArray(syncData.clearPending)) {
        console.log('📡 BookDetails: Clearing pending copy IDs for approved requests:', syncData.clearPending);
        setPendingCopyIds(prev => {
          const newSet = new Set(prev);
          syncData.clearPending.forEach(copyId => {
            newSet.delete(String(copyId));
          });
          return newSet;
        });
        // Also clear from storage
        clearPendingCopyIds(syncData.clearPending);
      }
      
      // Handle clearing pending book IDs when requests are approved
      if (syncData.clearPendingBooks && Array.isArray(syncData.clearPendingBooks)) {
        console.log('📡 BookDetails: Clearing pending book IDs for approved requests:', syncData.clearPendingBooks);
        // For book details, we don't need to track book-level pending status
        // since we're already tracking copy-level status
      }
    };
    
    StatusSync.addListener(statusSyncCallback);
    StatusSync.startSync();
    
    return () => {
      StatusSync.removeListener(statusSyncCallback);
    };
  }, [id]);

  // Build index of active borrowers by book copy id
  const fetchActiveBorrowersIndex = async () => {
    try {
      // Prefer new lightweight endpoint scoped to this book to reduce payload
      const res = await fetch(`${ApiService.API_BASE}/api/mobile/books/${encodeURIComponent(id)}/borrowers`, {
        method: 'GET',
        headers: await ApiService.getAuthHeaders(),
      });
      const data = await res.json();
      const rows = data?.data?.borrowersByCopyId || {};
      const index = {};
      Object.keys(rows).forEach(k => { index[k] = rows[k]; });
      return index;
    } catch (e) {
      return {};
    }
  };

  // Refresh reserved state when screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 DEBUG: BookDetailsScreen - Screen focused, refreshing data');
      
      // Clear stale data and refresh when screen regains focus
      const refreshData = async () => {
        try {
          const storageKey = `pending_copy_ids_${id}`;
          await AsyncStorage.removeItem(storageKey);
          console.log('🗑️ Cleared stale pending copy IDs on focus');
        } catch (error) {
          console.log('⚠️ Error clearing stale data on focus:', error.message);
        }
      };
      refreshData();
      
      loadReservedCopyIds();
      loadPendingCopyIds(); // Refresh pending copy IDs when screen regains focus
      
      // Also refresh borrowed book data to ensure we have latest info
      (async () => {
        try {
          if (!book?.id) return;
          
          // Check if user already borrowed this book
          const extractRows = (res) => {
            if (!res) return [];
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res?.data?.books)) return res.data.books;
            if (Array.isArray(res?.data?.borrowedBooks)) return res.data.borrowedBooks;
            if (Array.isArray(res?.books)) return res.books;
            if (Array.isArray(res?.data?.items)) return res.data.items;
            if (Array.isArray(res?.data?.borrowed)) return res.data.borrowed;
            if (Array.isArray(res?.borrowed)) return res.borrowed;
            return [];
          };

          let myBooksRes = await ApiService.getUserBooks(undefined, { status: 'borrowed', includeHistory: false }).catch(() => null);
          let rows = extractRows(myBooksRes);
          if (!rows || rows.length === 0) {
            myBooksRes = await ApiService.getUserBooks(undefined, 'all', false).catch(() => null);
            rows = extractRows(myBooksRes);
          }

          const mine = (rows || []).find(b => String(b.id || b.bookId || b.book_id) === String(book.id)
            && (String(b.status || b.loanStatus || b.loan_status || 'BORROWED').toUpperCase() === 'BORROWED' || String(b.isActive || b.active || 'true') === 'true'));
          
          const already = Boolean(mine);
          setIsAlreadyBorrowed(already);
          
          if (already) {
            // Try multiple possible copy ID fields
            const borrowedCopyId = mine?.copyId || mine?.copy_id || mine?.copy?.id || mine?.copyNumber || mine?.copy_number || null;
            if (borrowedCopyId) {
              setCurrentBorrowedCopyId(String(borrowedCopyId));
              console.log('📋 Refreshed borrowed copy ID on focus:', String(borrowedCopyId));
            }
          } else {
            setCurrentBorrowedCopyId(null);
          }
        } catch (e) {
          console.log('⚠️ Error refreshing borrowed data on focus:', e?.message);
        }
      })();
      
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
    }, [id, book?.id])
  );

  const renderCopyItem = ({ item }) => {
    const getCopyKey = (c) => String(c?.id || c?.copyId || c?.copy_id || c?.qrCode || c?.qr_code || c?.qrcode || c?.qr || c?.code || c?.uid || c?.uuid || c?.copyNumber || c?.copy_number || c?.number || '');
    const copyKey = getCopyKey(item);
    const isLoading = loadingCopyId === copyKey;
    
    // Enhanced status checking using real-time copy statuses
    const isMyBorrowedCopy = currentBorrowedCopyId && copyKey === String(currentBorrowedCopyId);
    const isCopyReserved = copyStatuses.reserved.has(copyKey);
    const isCopyBorrowed = copyStatuses.borrowed.has(copyKey);
    
    // Only check for pending if NOT currently borrowed (approved requests take priority)
    // Also check if the copy is not borrowed by anyone (including the user)
    const isCopyPending = !isMyBorrowedCopy && !isCopyBorrowed && (pendingCopyIds.has(copyKey) || copyStatuses.pending.has(copyKey));
    
    // Determine copy status for display - PRIORITY ORDER: My Borrowed > Reserved > Pending > Borrowed > Available
    let copyStatus = 'available';
    let statusText = 'Available';
    let statusColor = '#10b981';
    let statusIcon = 'check-circle';
    
    if (isMyBorrowedCopy) {
      copyStatus = 'my-borrowed';
      statusText = 'Currently Borrowed';
      statusColor = '#16a34a';
      statusIcon = 'book-check';
    } else if (isCopyReserved) {
      copyStatus = 'reserved';
      statusText = 'Reserved';
      statusColor = '#8b5cf6';
      statusIcon = 'bookmark';
    } else if (isCopyPending) {
      copyStatus = 'pending';
      statusText = 'Request Pending';
      statusColor = '#f59e0b';
      statusIcon = 'clock-outline';
    } else if (isCopyBorrowed || item.status === 'BORROWED') {
      copyStatus = 'borrowed';
      statusText = 'Borrowed';
      statusColor = '#ef4444';
      statusIcon = 'lock';
    }
    
    const reserveDisabledForBook = isAlreadyBorrowed; // prevent reserving any copy when user already has this book
    return (
      <TouchableOpacity
        style={[
          styles.copyItem, 
          isCopyPending && styles.pendingCopyItem,
          isCopyReserved && styles.reservedCopyItem,
          isMyBorrowedCopy && styles.borrowedCopyItem
        ]}
        onPress={() => {
          if (reserveDisabledForBook) {
            Alert.alert('Currently Borrowed', 'You already have this title borrowed. You cannot reserve it while you are currently borrowing it.');
            return;
          }
          handleCopySelection(item);
        }}
        disabled={Boolean(isMyBorrowedCopy || reserveDisabledForBook || isLoading)}
      >
        <View style={styles.copyIconContainer}>
          <MaterialCommunityIcons name="book" size={24} color="#1f2937" />
        </View>
        <View style={styles.copyInfo}>
          <Text style={styles.copyNumber}>Copy #{item.copyNumber}</Text>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color="#64748b" />
            <Text style={styles.copyLocation}>{item.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clipboard-text" size={14} color="#64748b" />
            <Text style={styles.copyShelf}>Shelf: {item.shelfLocation}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="sparkles" size={14} color="#10b981" />
            <Text style={styles.copyCondition}>Condition: {item.condition}</Text>
          </View>
          {/* Real-time status indicator */}
          <View style={[styles.copyStatusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.copyStatusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        <View style={styles.copyAction}>
          {isMyBorrowedCopy || reserveDisabledForBook ? (
            <>
              <Text style={styles.borrowedText}>✅ Currently Borrowed</Text>
            </>
          ) : isCopyPending ? (
            <>
              <Text style={styles.pendingText}>⏳ Request Pending</Text>
              <Text style={styles.pendingArrow}>⏳</Text>
            </>
          ) : isCopyReserved ? (
            <>
              <Text style={styles.reservedText}>🔖 Reserved</Text>
            </>
          ) : isCopyBorrowed || item.status === 'BORROWED' ? (
            <>
              <Text style={styles.borrowedText}>🔒 Borrowed</Text>
            </>
          ) : isLoading ? (
            <>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.borrowText}>Loading...</Text>
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
        All copies of this book are currently borrowed. You can reserve it to be notified when it becomes available.
      </Text>
      <TouchableOpacity
        style={styles.reserveButton}
        onPress={async () => {
          if (isAlreadyBorrowed) {
            Alert.alert('Currently Borrowed', 'You already have this title borrowed. You cannot reserve it while you are currently borrowing it.');
            return;
          }
          try {
            const has = await ApiService.hasOverdueBooks();
            if (has) {
              setErrorDialog({ visible: true, type: 'overdue_books' });
              return;
            }
          } catch {}
          if (fromReservation === 'true') {
            router.back();
          } else {
            setShowReserveModal(true);
          }
        }}
        disabled={Boolean(isAlreadyBorrowed)}
      >
        <Text style={styles.reserveButtonText}>
          {isAlreadyBorrowed ? '✅ Currently Borrowed' : (fromReservation === 'true' ? '← Back to Reservations' : '🔖 Reserve This Book')}
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
          {isAlreadyBorrowed && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>You already borrowed this book. See it in My Books.</Text>
              <TouchableOpacity style={styles.infoBannerBtn} onPress={() => router.push('/borrowing/my-books')}>
                <Text style={styles.infoBannerBtnText}>Open My Books</Text>
              </TouchableOpacity>
            </View>
          )}
          {pendingCopyIds && pendingCopyIds.size > 0 && (
            <View style={[styles.infoBanner, { backgroundColor: '#fff7ed', borderColor: '#f59e0b' }]}>
              <Text style={[styles.infoBannerText, { color: '#7c2d12' }]}>You have a pending borrow request for this book.</Text>
              <TouchableOpacity style={[styles.infoBannerBtn, { backgroundColor: '#f59e0b' }]} onPress={() => router.push('/borrowing/my-requests')}>
                <Text style={styles.infoBannerBtnText}>View My Requests</Text>
              </TouchableOpacity>
            </View>
          )}
          {hasBookReservation && (
            <View style={[styles.infoBanner, { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}>
              <Text style={[styles.infoBannerText, { color: '#1e3a8a' }]}>You have a pending/active reservation for this book.</Text>
              <TouchableOpacity style={[styles.infoBannerBtn, { backgroundColor: '#3b82f6' }]} onPress={() => router.push('/borrowing/reserve')}>
                <Text style={styles.infoBannerBtnText}>Open My Reservations</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.copiesSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Available Copies</Text>
            {pendingCopyIds && pendingCopyIds.size > 0 && (
              <View style={styles.pillBadge}><Text style={styles.pillBadgeText}>Borrow Request Pending</Text></View>
            )}
          </View>
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
              const isReservedPending = reservedCopyIds.has(copyKey) || copyStatuses.reserved.has(copyKey);
              // Enhanced check for user's own borrowed copy - check multiple possible identifiers
              const isMyBorrowedCopy = currentBorrowedCopyId && (
                copyKey === String(currentBorrowedCopyId) ||
                String(c.id) === String(currentBorrowedCopyId) ||
                String(c.copyId || c.copy_id) === String(currentBorrowedCopyId) ||
                String(c.copyNumber || c.copy_number) === String(currentBorrowedCopyId)
              );
              
              console.log('📋 Borrowed copy check:', {
                copyKey,
                currentBorrowedCopyId,
                isMyBorrowedCopy,
                isReservedPending,
                isAlreadyBorrowed,
                copyId: c.id,
                copyNumber: c.copyNumber,
                // DEBUG: Add more details
                DEBUG_FILE: 'BookDetailsScreen - CORRECT FILE',
                DEBUG_LINE: 'Line 610+',
                copyIdField: c.copyId,
                copyIdField2: c.copy_id
              });
              
              return (
              <TouchableOpacity key={c.id} style={[
                styles.copyItem, 
                (isReservedPending || isMyBorrowedCopy) && styles.pendingCopyItem,
                isReservedPending && styles.reservedCopyItem,
                isMyBorrowedCopy && styles.borrowedCopyItem
              ]} onPress={async () => {
                if (isReservedPending || isMyBorrowedCopy) return;
                try {
                  const has = await ApiService.hasOverdueBooks();
                  if (has) {
                    setErrorDialog({ visible: true, type: 'overdue_books' });
                    return;
                  }
                } catch {}
                setSelectedCopy(c);
                setShowReserveModal(true);
              }} disabled={isReservedPending || isMyBorrowedCopy}>
                <View style={styles.copyIconContainer}>
                  <MaterialCommunityIcons name="book-lock" size={24} color="#ef4444" />
                </View>
                <View style={styles.copyInfo}>
                  <Text style={styles.copyNumber}>Copy #{c.copyNumber}</Text>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#64748b" />
                    <Text style={styles.copyLocation}>{c.location || c.shelfLocation || 'Unknown location'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar" size={14} color="#ef4444" />
                    <Text style={[styles.copyCondition, { color: '#ef4444' }]}>Due: {(c.dueDate || c.due_date || c.expectedReturnDate || c.expected_return_date || c.borrowDueDate || (c.borrowtransaction && c.borrowtransaction.dueDate)) ? new Date(c.dueDate || c.due_date || c.expectedReturnDate || c.expected_return_date || c.borrowDueDate || (c.borrowtransaction && c.borrowtransaction.dueDate)).toLocaleDateString() : new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</Text>
                  </View>
                  {(() => {
                    const copyIdKey = String(c.id || c.copyId || c.copy_id || '');
                    const name = c.currentBorrowerName || (c.borrower && (c.borrower.fullName || c.borrower.name)) || c.borrowerName || borrowersIndex[copyIdKey];
                    return Boolean(name);
                  })() && (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="account" size={14} color="#6b7280" />
                      <Text style={styles.copyBorrower}>
                        Borrower: {(() => {
                          const copyIdKey = String(c.id || c.copyId || c.copy_id || '');
                          return c.currentBorrowerName || (c.borrower && (c.borrower.fullName || c.borrower.name)) || c.borrowerName || borrowersIndex[copyIdKey];
                        })()}
                      </Text>
                    </View>
                  )}
                  {/* Real-time status indicator for borrowed copies */}
                  <View style={[
                    styles.copyStatusBadge, 
                    { 
                      backgroundColor: isMyBorrowedCopy ? '#16a34a20' : isReservedPending ? '#8b5cf620' : '#ef444420',
                      borderColor: isMyBorrowedCopy ? '#16a34a' : isReservedPending ? '#8b5cf6' : '#ef4444'
                    }
                  ]}>
                    <Text style={[
                      styles.copyStatusText, 
                      { 
                        color: isMyBorrowedCopy ? '#16a34a' : isReservedPending ? '#8b5cf6' : '#ef4444'
                      }
                    ]}>
                      {isMyBorrowedCopy ? 'My Copy' : isReservedPending ? 'Reserved' : 'Borrowed'}
                    </Text>
                  </View>
                </View>
                <View style={styles.copyAction}>
                  {isMyBorrowedCopy ? (
                    <>
                      <Text style={styles.borrowedText}>✅ Currently Borrowed</Text>
                    </>
                  ) : isReservedPending ? (
                    <>
                      <Text style={styles.reservedText}>🔖 Reservation Pending</Text>
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
      {/* Overdue dialog at details level */}
      <BorrowErrorDialog
        visible={errorDialog.visible}
        onClose={() => setErrorDialog({ visible: false, type: null })}
        errorType={errorDialog.type}
        bookTitle={book?.title}
        onViewMyBooks={() => router.push('/borrowing/my-books')}
        onReserveInstead={() => setShowReserveModal(true)}
        onViewFines={() => router.push('/overdue-fines')}
      />
      <BorrowRequestModal
        visible={showBorrowModal}
        onClose={() => {
          setShowBorrowModal(false);
          setSelectedCopy(null);
          // Refresh pending copy IDs when modal is closed (in case request was cancelled)
          console.log('🔍 DEBUG: BookDetailsScreen - Modal closed, refreshing pending copy IDs');
          loadPendingCopyIds();
        }}
        book={book}
        selectedCopy={selectedCopy}
        onSuccess={handleBorrowRequestSuccess}
        onAlreadyBorrowed={() => {
          setIsAlreadyBorrowed(true);
          try {
            const selId = String(selectedCopy?.id || selectedCopy?.copyId || selectedCopy?.copy_id || '');
            if (selId) setCurrentBorrowedCopyId(selId);
          } catch {}
        }}
        onDuplicateRequest={handleDuplicateBorrowRequest}
        onReserveInstead={() => {
          setShowBorrowModal(false);
          setSelectedCopy(null);
          // Refresh pending copy IDs when switching to reservation
          console.log('🔍 DEBUG: BookDetailsScreen - Switching to reservation, refreshing data');
          loadPendingCopyIds();
          setShowReserveModal(true);
        }}
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
  infoBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ecfeff',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 8,
  },
  infoBannerText: {
    color: '#075985',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600'
  },
  infoBannerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  infoBannerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
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
  pillBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999
  },
  pillBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700'
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  copyNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4
  },
  copyLocation: {
    fontSize: 14,
    color: '#64748b'
  },
  copyShelf: {
    fontSize: 14,
    color: '#64748b'
  },
  copyCondition: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500'
  },
  copyBorrower: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500'
  },
  copyAction: {
    alignItems: 'center'
  },
  // subtle extra spacing for readability without changing card style
  copyInfo: {
    flex: 1,
    paddingRight: 8
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
  reservedCopyItem: {
    backgroundColor: '#f3e8ff',
    borderColor: '#8b5cf6'
  },
  borrowedCopyItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444'
  },
  copyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  copyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase'
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
  borrowedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a'
  },
  reservedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6'
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