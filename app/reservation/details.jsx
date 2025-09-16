import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import BookConditionsView from '../../components/BookConditionsView';
import BorrowErrorDialog from '../../components/BorrowErrorDialog';
import Header from '../../components/Header';
import ApiService from '../../services/ApiService';
import { handleErrorForUI } from '../../utils/ErrorHandler';

const ReservationDetailsScreen = () => {
  const { id, copyId } = useLocalSearchParams();
  const router = useRouter();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [reservedCopyIds, setReservedCopyIds] = useState(new Set());
  const [hasBookReservation, setHasBookReservation] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ visible: false, type: null });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myBorrowedBookIds, setMyBorrowedBookIds] = useState(new Set());

  // Load user's borrowed books to show "Currently Borrowed" status
  const loadUserBorrowedBooks = async (userId) => {
    try {
      console.log('📚 Loading user borrowed books for userId:', userId);
      const response = await ApiService.getUserBooks(userId, { status: 'all', includeHistory: false });
      
      if (response.success && response.data) {
        const borrowedBooks = response.data.borrowedBooks || [];
        console.log('📋 Raw borrowed books from API:', borrowedBooks);
        
        const borrowedBookIds = new Set();
        borrowedBooks.forEach(book => {
          const bookId = book.bookId || book.book_id || book.id;
          if (bookId) {
            borrowedBookIds.add(String(bookId));
          }
        });
        
        console.log('📚 Final user borrowed book IDs:', Array.from(borrowedBookIds));
        setMyBorrowedBookIds(borrowedBookIds);
      } else {
        console.log('❌ No borrowed books data found in response');
        setMyBorrowedBookIds(new Set());
      }
    } catch (error) {
      console.error('❌ Error loading borrowed books:', error);
      setMyBorrowedBookIds(new Set());
    }
  };

  const loadBook = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.getBookById(id);
      if (res.success && res.data) {
        console.log('📚 Loaded book data:', {
          bookId: res.data.id,
          title: res.data.title,
          totalCopies: res.data.copies?.length || 0,
          copyStatuses: res.data.copies?.map(c => ({ id: c.id, status: c.status })) || [],
          availableCopies: res.data.copies?.filter(c => c.status === 'AVAILABLE' || c.status === 'available').length || 0,
          borrowedCopies: res.data.copies?.filter(c => c.status === 'BORROWED' || c.status === 'borrowed').length || 0
        });
        setBook(res.data);
      } else {
        throw new Error(res.message || 'Book not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadBook();
  }, [id]);

  // Load user's borrowed books on component mount
  useEffect(() => {
    (async () => {
      try {
        const userId = await ApiService.getCurrentUserId();
        if (userId) {
          setCurrentUserId(userId);
          await loadUserBorrowedBooks(userId);
        }
      } catch (error) {
        console.error('❌ Error loading current user:', error);
      }
    })();
  }, []);

  // Load current user id for self-reservation blocking/labeling
  useEffect(() => {
    (async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setCurrentUserId(userData.id);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const loadReserved = async () => {
      try {
        // Load locally tracked reserved copy IDs (client-side memory)
        const stored = await AsyncStorage.getItem(`reserved_copy_ids_${id}`);
        const localIds = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
        const res = await ApiService.getUserReservations('all');
        const rows = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (res?.data?.reservations || res?.reservations || []));
        const mine = (rows || []).filter(r => {
          const status = String(r.status || '').toUpperCase();
          const isActive = status === 'ACTIVE' || status === 'READY' || status === 'PENDING';
          return isActive && String(r.bookId || r.book_id) === String(id);
        });
        const serverIds = new Set(mine.map(r => String(r.copyId || r.copy_id)).filter(Boolean));
        // Merge: prefer server IDs, but include local for UI specificity when server lacks copyId
        const merged = new Set([...Array.from(localIds), ...Array.from(serverIds)]);
        setReservedCopyIds(merged);
        setHasBookReservation(mine.length > 0);
        // If server shows no active reservation for this book, clear any stale local flags
        if (mine.length === 0 && localIds.size > 0) {
          try {
            await AsyncStorage.removeItem(`reserved_copy_ids_${id}`);
          } catch {}
          setReservedCopyIds(new Set());
        }
        // Fallback: if backend doesn't return copyId and we have a book-level reservation but no copy key yet,
        // mark the selected copy (if any) or the first borrowed copy as pending for UI feedback.
        if (mine.length > 0 && merged.size === 0 && Array.isArray(book?.copies)) {
          const fallbackKey = getCopyKey(selectedCopy) || getCopyKey((book?.copies || []).find(c => c.status === 'BORROWED' || c.status === 'borrowed'));
          if (fallbackKey) {
            const next = new Set(merged);
            next.add(String(fallbackKey));
            setReservedCopyIds(next);
            try {
              const key = `reserved_copy_ids_${id}`;
              await AsyncStorage.setItem(key, JSON.stringify(Array.from(next)));
            } catch {}
          }
        }
      } catch (e) {
        setReservedCopyIds(new Set());
        setHasBookReservation(false);
      }
    };
    loadReserved();
  }, [id, book, selectedCopy]);

  // If a copyId is passed from catalog, ensure it is marked pending locally immediately
  useEffect(() => {
    (async () => {
      try {
        if (copyId) {
          const key = `reserved_copy_ids_${id}`;
          const stored = await AsyncStorage.getItem(key);
          const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
          prev.add(String(copyId));
          await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
          setReservedCopyIds(new Set(prev));
        }
      } catch {}
    })();
  }, [id, copyId]);

  const getCopyDueDate = (copy) => {
    const raw = copy.dueDate || copy.due_date || copy.expectedReturnDate || copy.expected_return_date || (copy.borrowtransaction && copy.borrowtransaction.dueDate);
    if (raw) return new Date(raw);
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  };
  const getCopyKey = (c) => String(c?.id || c?.copyId || c?.copy_id || c?.qrCode || c?.qr_code || c?.qrcode || c?.qr || c?.code || c?.uid || c?.uuid || c?.copyNumber || c?.copy_number || c?.number || '');
  const getCopyAliases = (c) => {
    if (!c) return [];
    const raw = [
      c.id, c.copyId, c.copy_id, c.qrCode, c.qr_code, c.qrcode, c.qr, c.code, c.uid, c.uuid, c.copyNumber, c.copy_number, c.number
    ].filter(Boolean).map(v => String(v));
    const set = new Set(raw);
    // also include a stable number alias to survive id changes
    if (c.copyNumber || c.copy_number || c.number) {
      set.add(`num:${String(c.copyNumber || c.copy_number || c.number)}`);
    }
    return Array.from(set);
  };

  const borrowedCopies = Array.isArray(book?.copies)
    ? book.copies.filter(c => c.status === 'BORROWED' || c.status === 'borrowed')
    : [];
  const hasAvailableCopies = Array.isArray(book?.copies)
    ? book.copies.some(c => c.status === 'AVAILABLE' || c.status === 'available')
    : (Number(book?.availableCopies || book?.available_copies || 0) > 0);

  // Debug logging for validation
  console.log('🔍 Reservation details validation:', {
    bookId: book?.id,
    totalCopies: book?.copies?.length || 0,
    borrowedCopies: borrowedCopies.length,
    hasAvailableCopies,
    allCopyStatuses: book?.copies?.map(c => ({ id: c.id, status: c.status })) || [],
    availableCopiesCount: book?.copies?.filter(c => c.status === 'AVAILABLE' || c.status === 'available').length || 0
  });

  // getCopyKey is defined above
  const renderBorrowedCopy = ({ item }) => {
    const isReservedPending = getCopyAliases(item).some(a => reservedCopyIds.has(String(a)));
    const isMyBorrowedCopy = currentUserId && (String(item.borrowedByUserId || '') === String(currentUserId));
    return (
    <TouchableOpacity style={[styles.copyItem, (isReservedPending || isMyBorrowedCopy) && styles.pendingCopyItem]} onPress={async () => {
      if (isReservedPending) return;
      if (isMyBorrowedCopy) {
        Alert.alert('Cannot Reserve Your Own Copy', 'You are currently borrowing this copy. Please return it first if you need to borrow again.');
        return;
      }
      // Block reservations when the user has overdue items
      try {
        const has = await ApiService.hasOverdueBooks();
        if (has) {
          setErrorDialog({ visible: true, type: 'overdue_books' });
          return;
        }
      } catch {}
      setSelectedCopy(item);
      setShowReserveModal(true);
    }} disabled={isReservedPending}>
      <View style={styles.copyIconContainer}>
        <Text style={styles.copyIcon}>📚</Text>
      </View>
      <View style={styles.copyInfo}>
        <Text style={styles.copyNumber}>Copy #{item.copyNumber}</Text>
        <Text style={styles.copyLocation}>📍 {item.location || item.shelfLocation || 'Unknown location'}</Text>
        <Text style={styles.copyCondition}>🔒 Borrowed • Due: {getCopyDueDate(item).toLocaleDateString()}</Text>
      </View>
      <View style={styles.copyAction}>
        {isMyBorrowedCopy ? (
          <Text style={styles.pendingText}>✅ Currently Borrowed</Text>
        ) : isReservedPending ? (
          <>
            <Text style={styles.pendingText}>⏳ Reservation Pending</Text>
            <Text style={styles.pendingArrow}>⏳</Text>
          </>
        ) : (
          <>
            <Text style={styles.reserveText}>Select to Reserve</Text>
            <Text style={styles.reserveArrow}>→</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading reservation details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.mainErrorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBook}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.mainErrorContainer}>
        <Text style={styles.errorIcon}>📚</Text>
        <Text style={styles.errorTitle}>Book Not Found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Reservation Details"
        showMenuButton={false}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <ScrollView style={styles.content}>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>by {book.author}</Text>
          {book.subject && <Text style={styles.bookSubject}>Subject: {book.subject}</Text>}
          {book.isbn && <Text style={styles.bookIsbn}>ISBN: {book.isbn}</Text>}
          
          {/* Currently Borrowed Status */}
          {myBorrowedBookIds.has(String(book.id)) && (
            <View style={styles.borrowedStatusBadge}>
              <Text style={styles.borrowedStatusText}>📚 You Currently Borrowed This Book</Text>
            </View>
          )}
        </View>

        <View style={styles.copiesSection}>
          <Text style={styles.sectionTitle}>Borrowed Copies (Reservable)</Text>
          {borrowedCopies.length > 0 ? (
            <FlatList
              data={borrowedCopies}
              keyExtractor={(item) => item.id}
              renderItem={renderBorrowedCopy}
              scrollEnabled={false}
            />
          ) : hasAvailableCopies ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>This book is currently available</Text>
              <Text style={styles.emptySubtitle}>Borrow directly instead of reserving.</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push({ pathname: '/book-catalog/details', params: { id: book.id } })}
              >
                <Text style={styles.primaryButtonText}>Go to Borrow</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No copies available for reservation</Text>
              <Text style={styles.emptySubtitle}>All copies of this book are currently available. You can borrow it directly.</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push({ pathname: '/book-catalog/details', params: { id: book.id } })}
              >
                <Text style={styles.primaryButtonText}>Go to Borrow</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <BookConditionsView
        visible={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        onSubmit={async () => {
          try {
            if (hasBookReservation) {
              setShowReserveModal(false);
              Alert.alert(
                'Already Reserved',
                'You already have a pending reservation for this book. Do you want to view or cancel it?',
                [
                  { text: 'Close', style: 'cancel' },
                  { text: 'View My Reservations', onPress: () => router.replace({ pathname: '/borrowing/reserve', params: { tab: 'RESERVATIONS' } }) }
                ]
              );
              return;
            }
            // Get fresh book data from backend to match backend validation
            console.log('🔄 Fetching fresh book data to match backend validation...');
            console.log('📚 Current book data before fresh fetch:', {
              bookId: book.id,
              title: book.title,
              availableCopies: book.availableCopies,
              totalCopies: book.totalCopies,
              copiesLength: book.copies?.length,
              copyStatuses: book.copies?.map(c => c.status) || []
            });
            
            try {
              // Force completely fresh data - bypass ALL caching
              console.log('🌐 Making completely fresh API call with cache busting...');
              ApiService.clearCatalogCache();
              
              // Add timestamp to force fresh data
              const timestamp = Date.now();
              const randomParam = Math.random().toString(36).substring(7);
              
              // Try the exact same endpoint the backend uses for validation
              const freshEndpoint = `https://kcmi-library-system.vercel.app/api/books/${book.id}?t=${timestamp}&r=${randomParam}&_bust=${Date.now()}`;
              
              console.log(`🌐 Making fresh API call: ${freshEndpoint}`);
              const freshResponse = await fetch(freshEndpoint, {
                method: 'GET',
                headers: {
                  ...await ApiService.getAuthHeaders(),
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              });
              
              console.log('📡 Fresh API response status:', freshResponse.status);
              
              if (freshResponse.ok) {
                const freshData = await freshResponse.json();
                console.log('📡 Fresh API response data:', {
                  success: freshData.success,
                  hasData: !!freshData.data,
                  availableCopies: freshData.data?.availableCopies,
                  totalCopies: freshData.data?.totalCopies,
                  copiesLength: freshData.data?.copies?.length,
                  allCopyStatuses: freshData.data?.copies?.map(c => c.status) || []
                });
                
                if (freshData.success && freshData.data) {
                  const freshBook = freshData.data;
                  const freshAvailableCount = freshBook.availableCopies || freshBook.available_copies || 0;
                  const freshTotalCopies = freshBook.totalCopies || freshBook.total_copies || freshBook.copies?.length || 0;
                  
                  console.log('🔍 Fresh API book data (backend-aligned):', {
                    bookId: freshBook.id,
                    totalCopies: freshTotalCopies,
                    availableCopies: freshAvailableCount,
                    allStatuses: freshBook.copies?.map(c => c.status) || [],
                    backendCondition: `${freshAvailableCount} >= ${freshTotalCopies} = ${freshAvailableCount >= freshTotalCopies}`,
                    // This should match exactly what backend sees
                    backendLogic: `Backend will check: availableCopies(${freshAvailableCount}) >= totalCopies(${freshTotalCopies}) = ${freshAvailableCount >= freshTotalCopies}`
                  });
                  
                  // Backend logic: if availableCopies >= totalCopies, reject reservation
                  if (freshAvailableCount >= freshTotalCopies) {
                    console.log('❌ Blocking reservation: Fresh API shows all copies are available (matches backend logic)');
                    setShowReserveModal(false);
                    Alert.alert('Book Available', 'All copies of this book are available. Please borrow it directly.', [
                      { text: 'Go to Borrow', onPress: () => router.replace({ pathname: '/book-catalog/details', params: { id: book.id } }) },
                      { text: 'Close', style: 'cancel' }
                    ]);
                    return;
                  }
                  
                  // Update local book data with fresh data
                  setBook(freshBook);
                  console.log('✅ Fresh API data loaded (backend-aligned), proceeding with reservation');
                  // Skip the cached API call since we got fresh data
                  return;
                } else {
                  console.log('❌ Fresh API call failed - no data returned');
                }
              } else {
                console.log('❌ Fresh API call failed with status:', freshResponse.status);
              }
              
              // Fallback to cached API call
              console.log('📡 Falling back to cached API call...');
              const freshBookData = await ApiService.getBookById(book.id);
              console.log('📡 Fresh book data response:', {
                success: freshBookData.success,
                hasData: !!freshBookData.data,
                dataKeys: freshBookData.data ? Object.keys(freshBookData.data) : []
              });
              
              if (freshBookData.success && freshBookData.data) {
                const freshBook = freshBookData.data;
                // Use the exact same fields the backend uses
                const freshAvailableCount = freshBook.availableCopies || freshBook.available_copies || 0;
                const freshTotalCopies = freshBook.totalCopies || freshBook.total_copies || freshBook.copies?.length || 0;
                
                // Also calculate from copies array for comparison
                const freshAvailableCopies = freshBook.copies?.filter(c => 
              c.status === 'AVAILABLE' || c.status === 'available'
            ) || [];
                const calculatedAvailableCount = freshAvailableCopies.length;
                
                console.log('🔍 Fresh book data from backend:', {
                  bookId: freshBook.id,
                  totalCopies: freshTotalCopies,
                  availableCopies: freshAvailableCount,
                  calculatedAvailableCount,
                  allStatuses: freshBook.copies?.map(c => c.status) || [],
                  backendCondition: `${freshAvailableCount} >= ${freshTotalCopies} = ${freshAvailableCount >= freshTotalCopies}`,
                  // Debug: Check if backend uses different field names
                  availableCopiesField: freshBook.availableCopies,
                  totalCopiesField: freshBook.totalCopies,
                  available_copiesField: freshBook.available_copies,
                  total_copiesField: freshBook.total_copies
                });
                
                // Backend logic: if availableCopies >= totalCopies, reject reservation
                if (freshAvailableCount >= freshTotalCopies) {
                  console.log('❌ Blocking reservation: Backend shows all copies are available');
              setShowReserveModal(false);
                  Alert.alert('Book Available', 'All copies of this book are available. Please borrow it directly.', [
                { text: 'Go to Borrow', onPress: () => router.replace({ pathname: '/book-catalog/details', params: { id: book.id } }) },
                { text: 'Close', style: 'cancel' }
              ]);
              return;
            }

                // Update local book data with fresh data
                setBook(freshBook);
                console.log('✅ Fresh book data loaded, proceeding with reservation');
              } else {
                console.log('⚠️ Could not fetch fresh book data, using cached data');
              }
            } catch (error) {
              console.log('⚠️ Error fetching fresh book data:', error.message);
              // Continue with cached data if fresh data fails
            }

            // Additional check: Ensure we have a selected copy and it's borrowed
            if (!selectedCopy) {
              Alert.alert('No Copy Selected', 'Please select a borrowed copy to reserve.');
              return;
            }
            
            if (selectedCopy.status !== 'BORROWED' && selectedCopy.status !== 'borrowed') {
              Alert.alert('Invalid Selection', 'Please select a borrowed copy to reserve.');
              return;
            }

            // Check if user is trying to reserve their own borrowed book
            if (myBorrowedBookIds.has(String(book.id))) {
              Alert.alert(
                'Cannot Reserve Your Own Book',
                'You are currently borrowing this book. You cannot reserve a book that you are already borrowing.',
                [{ text: 'OK' }]
              );
              return;
            }

            // No need for final validation since we already checked with fresh data

            console.log('✅ All validations passed: Proceeding with reservation API call');
            console.log('📋 Selected copy details:', {
              id: selectedCopy.id,
              status: selectedCopy.status,
              copyNumber: selectedCopy.copyNumber,
              dueDate: getCopyDueDate(selectedCopy)
            });
            
            const expectedReturnDate = getCopyDueDate(selectedCopy).toISOString();
            const reservationData = {
              expectedReturnDate,
              initialCondition: 'GOOD',
              conditionNotes: selectedCopy ? `Reserved Copy #${selectedCopy.copyNumber} via mobile app` : 'Reserved via mobile app'
            };
            
            console.log('📤 Sending reservation data to backend:', {
              bookId: book.id,
              reservationData
            });
            
            const res = await ApiService.createReservation(book.id, reservationData);
            if (res.success) {
              // Persist reserved copy aliases locally to mark as pending in UI
              try {
                const key = `reserved_copy_ids_${book.id}`;
                const stored = await AsyncStorage.getItem(key);
                const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
                const aliases = getCopyAliases(selectedCopy);
                aliases.forEach(a => prev.add(String(a)));
                await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
              } catch {}
              // Update in-memory flags immediately
              setReservedCopyIds(prev => {
                const next = new Set(prev);
                const aliases = getCopyAliases(selectedCopy);
                aliases.forEach(a => next.add(String(a)));
                return next;
              });
              setHasBookReservation(true);
              setShowReserveModal(false);
              Alert.alert('Success', 'Reservation submitted. Redirecting to My Reservations...', [
                { text: 'OK', onPress: () => router.replace({ pathname: '/borrowing/reserve', params: { tab: 'RESERVATIONS' } }) }
              ]);
            } else {
              throw new Error(res.message || 'Failed to create reservation');
            }
          } catch (err) {
            const msg = String(err?.message || '').toUpperCase();
            console.error('❌ Reservation error in details page:', err);
            
            if (msg.includes('BOOK_AVAILABLE')) {
              setShowReserveModal(false);
              Alert.alert(
                'Book Available for Direct Borrowing',
                'This book has available copies. Please borrow it directly instead of reserving.',
                [
                  { text: 'Go to Borrow', onPress: () => router.replace({ pathname: '/book-catalog/details', params: { id: book.id } }) },
                  { text: 'Close', style: 'cancel' }
                ]
              );
              return;
            }
            
            if (msg.includes('NO_BORROWED_COPIES')) {
              setShowReserveModal(false);
              Alert.alert(
                'No Reservations Available',
                'All copies of this book are currently available. You can borrow it directly instead of reserving.',
                [
                  { text: 'Go to Borrow', onPress: () => router.replace({ pathname: '/book-catalog/details', params: { id: book.id } }) },
                  { text: 'Close', style: 'cancel' }
                ]
              );
              return;
            }
            
            if (msg.includes('DUPLICATE_RESERVATION') || msg.includes('ALREADY_RESERVED')) {
              // Save aliases locally so UI can mark the specific copy as pending
              try {
                const key = `reserved_copy_ids_${book.id}`;
                const stored = await AsyncStorage.getItem(key);
                const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
                const aliases = getCopyAliases(selectedCopy);
                aliases.forEach(a => prev.add(String(a)));
                await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
              } catch {}
              // Update in-memory flags so UI reflects pending immediately
              if (selectedCopy) {
                setReservedCopyIds(prev => {
                  const next = new Set(prev);
                  const aliases = getCopyAliases(selectedCopy);
                  aliases.forEach(a => next.add(String(a)));
                  return next;
                });
              }
              setHasBookReservation(true);
              setShowReserveModal(false);
              Alert.alert(
                'Already Reserved',
                'You already have a pending reservation for this book. Do you want to view or cancel it?',
                [
                  { text: 'Close', style: 'cancel' },
                  { text: 'View My Reservations', onPress: () => router.replace({ pathname: '/borrowing/reserve', params: { tab: 'RESERVATIONS' } }) }
                ]
              );
              return;
            }
            
            if (msg.includes('OVERDUE_BOOKS')) {
              setShowReserveModal(false);
              setErrorDialog({ visible: true, type: 'overdue_books' });
              return;
            }
            
            handleErrorForUI(err, Alert.alert, 'Reservation Failed');
          }
        }}
        title="Reservation Details"
        submitText="Reserve Book"
        book={book}
        loading={false}
        filterBorrowedOnly={true}
        onSelectCopy={(copy) => {
          console.log('📋 Copy selected:', copy);
          setSelectedCopy(copy);
        }}
        selectedCopyId={selectedCopy?.id}
        selectedCopyOnly={true}
      />

      {/* Overdue Dialog with View Fines */}
      <BorrowErrorDialog
        visible={errorDialog.visible}
        onClose={() => setErrorDialog({ visible: false, type: null })}
        errorType={errorDialog.type}
        bookTitle={book?.title}
        onViewMyBooks={() => router.push('/borrowing/my-books')}
        onReserveInstead={() => setErrorDialog({ visible: false, type: null })}
        onViewFines={() => router.push('/overdue-fines')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 20 },
  bookInfo: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  bookTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 8, lineHeight: 32 },
  bookAuthor: { fontSize: 18, color: '#64748b', marginBottom: 8 },
  bookSubject: { fontSize: 16, color: '#475569', marginBottom: 4 },
  bookIsbn: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  copiesSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  copyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  copyIconContainer: { marginRight: 16 },
  copyIcon: { fontSize: 24 },
  copyInfo: { flex: 1 },
  copyNumber: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  copyLocation: { fontSize: 14, color: '#64748b', marginBottom: 2 },
  copyCondition: { fontSize: 14, color: '#10b981', fontWeight: '500' },
  copyAction: { alignItems: 'center' },
  reserveText: { fontSize: 12, color: '#3b82f6', fontWeight: '600', marginBottom: 4 },
  reserveArrow: { fontSize: 16, color: '#3b82f6' },
  emptyContainer: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  primaryButton: { backgroundColor: '#8b5cf6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  mainErrorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  errorText: { color: '#dc2626', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  retryButton: { backgroundColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  // Currently Borrowed Status Styles
  borrowedStatusBadge: {
    backgroundColor: '#d1fae5',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  borrowedStatusText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReservationDetailsScreen;


