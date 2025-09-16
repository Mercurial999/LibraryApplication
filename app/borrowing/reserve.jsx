import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';
import { logAction as logReco } from '../../services/RecoService';
import { handleErrorForUI } from '../../utils/ErrorHandler';

const BookReservationScreen = () => {
  const { bookId, copyId, copyNumber, tab } = useLocalSearchParams();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [activeTab, setActiveTab] = useState('BOOKS'); // BOOKS | RESERVATIONS
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [forceReservationsView, setForceReservationsView] = useState(false);
  const [hasOverdues, setHasOverdues] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ visible: false, type: null });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userBorrowedCopyIds, setUserBorrowedCopyIds] = useState(new Set());
  const [loadingCopyId, setLoadingCopyId] = useState(null);
  const [myBorrowedBookIds, setMyBorrowedBookIds] = useState(new Set());
  const router = useRouter();

  // Initialize tab from query param on first render
  useEffect(() => {
    const desired = String(tab || '').toUpperCase();
    console.log('🎯 Tab parameter received:', tab, 'Normalized:', desired);
    if (desired === 'RESERVATIONS' || desired === 'BOOKS') {
      setActiveTab(desired);
      console.log('✅ Tab set to:', desired);
    }
  }, [tab]);

  // Watch for force reservations view flag
  useEffect(() => {
    if (forceReservationsView) {
      console.log('🚀 Force reservations view triggered!');
      setBook(null);
      setSelectedCopy(null);
      setActiveTab('RESERVATIONS');
      loadReservations();
      // Reset the flag after a short delay
      setTimeout(() => {
        setForceReservationsView(false);
        console.log('🔄 Force flag reset');
      }, 100);
    }
  }, [forceReservationsView]);

  // Load reservations when switching to reservations tab
  const loadReservations = async () => {
    try {
      setLoadingReservations(true);
      console.log('🔄 Loading reservations...');
      const response = await ApiService.getUserReservations('all');
      console.log('📋 Reservations API response:', response);
      if (response.success && response.data) {
        const reservationsList = response.data.reservations || response.data || [];
        console.log('📚 Found reservations:', reservationsList.length, reservationsList);
        setReservations(reservationsList);
      } else {
        console.log('❌ No reservations found or API error');
        setReservations([]);
      }
    } catch (err) {
      console.error('❌ Error loading reservations:', err);
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Load user's borrowed copy IDs to check for self-reservation
  const loadUserBorrowedCopyIds = async (userId) => {
    try {
      console.log('📚 Loading user borrowed copy IDs for userId:', userId);
      const response = await ApiService.getUserBooks(userId, { status: 'all', includeHistory: false });
      
      const borrowedCopyIds = new Set();
      const borrowedBookIds = new Set();
      
      if (response.success && response.data) {
        // The API returns response.data.borrowedBooks, not just response.data
        const borrowedBooks = response.data.borrowedBooks || [];
        console.log('📋 Raw borrowed books from API:', borrowedBooks);
        
        borrowedBooks.forEach(book => {
          // The copy ID field is book.copyId based on the my-books implementation
          const copyId = book.copyId || book.copy_id || book.copy?.id || book.bookCopyId;
          if (copyId) {
            borrowedCopyIds.add(String(copyId));
            console.log('📋 Added copy ID to set:', String(copyId), 'from book:', {
              bookId: book.id || book.bookId,
              bookTitle: book.title || book.bookTitle,
              copyId: copyId,
              allFields: Object.keys(book)
            });
          } else {
            console.log('⚠️ No copy ID found in book:', {
              bookId: book.id || book.bookId,
              bookTitle: book.title || book.bookTitle,
              allFields: Object.keys(book)
            });
          }
          
          // Collect book IDs for "Currently Borrowed" status
          const bookId = book.bookId || book.book_id || book.id;
          if (bookId) {
            borrowedBookIds.add(String(bookId));
          }
        });
      }
      
      setUserBorrowedCopyIds(borrowedCopyIds);
      setMyBorrowedBookIds(borrowedBookIds);
      console.log('📋 Final user borrowed copy IDs:', Array.from(borrowedCopyIds));
      console.log('📚 Final user borrowed book IDs:', Array.from(borrowedBookIds));
    } catch (err) {
      console.error('❌ Error loading user borrowed copy IDs:', err);
      setUserBorrowedCopyIds(new Set());
      setMyBorrowedBookIds(new Set());
    }
  };

  // Load book details
  useEffect(() => {
    if (bookId && activeTab !== 'RESERVATIONS') {
      console.log('📖 Loading book details for bookId:', bookId);
      loadBookDetails();
    } else if (!bookId) {
      console.log('📚 Loading available books (no bookId)');
      // If no specific book, load all available books for reservation
      loadAvailableBooks();
    } else {
      console.log('🚫 Skipping book details load - activeTab is RESERVATIONS');
    }
  }, [bookId, activeTab]);

  // Pre-check overdue status and load user data once when screen mounts
  useEffect(() => {
    (async () => {
      try {
        const has = await ApiService.hasOverdueBooks();
        setHasOverdues(Boolean(has));
        
        // Load current user ID and their borrowed copy IDs
        const userId = await ApiService.getCurrentUserId();
        if (userId) {
          setCurrentUserId(userId);
          await loadUserBorrowedCopyIds(userId);
        }
      } catch {}
    })();
  }, []);

  // Reset to BOOKS tab when no specific book (but not if we're on RESERVATIONS tab)
  useEffect(() => {
    if (!bookId && activeTab !== 'RESERVATIONS') {
      console.log('🔄 No bookId, resetting to BOOKS tab');
      setActiveTab('BOOKS');
    }
  }, [bookId]); // Removed activeTab from dependencies to prevent conflicts

  // Load reservations when switching to reservations tab
  useEffect(() => {
    console.log('🔄 Active tab changed to:', activeTab);
    if (activeTab === 'RESERVATIONS') {
      console.log('📋 Loading reservations because tab is RESERVATIONS');
      loadReservations();
    }
  }, [activeTab]);

  // Auto-show book conditions modal if copy is selected
  useEffect(() => {
    if (book && selectedCopy && copyId) {
      setConditionModalVisible(true);
    }
  }, [book, selectedCopy, copyId]);

  const loadBookDetails = async () => {
    try {
      setLoading(true);
      // Get book details with copies
      const bookResponse = await ApiService.getBookById(bookId);
      
      if (bookResponse.success && bookResponse.data) {
        const bookData = bookResponse.data;
        
        // Keep all copies for proper validation - don't filter here
        const allCopies = bookData.copies || [];
        const borrowedCopies = allCopies.filter(copy => 
          copy.status === 'BORROWED' || copy.status === 'borrowed'
        );
        
        console.log(`📚 Total copies: ${allCopies.length}, Borrowed copies: ${borrowedCopies.length}`);
        console.log('📋 All copy statuses:', allCopies.map(c => ({ id: c.id, status: c.status })));
        
        // Debug all copy IDs in the book copies
        borrowedCopies.forEach((copy, index) => {
          const copyId = String(copy.id || copy.copyId || copy.copy_id || '');
          console.log(`📋 Copy ${index + 1} ID fields:`, {
            id: copy.id,
            copyId: copy.copyId,
            copy_id: copy.copy_id,
            extractedId: copyId,
            allFields: Object.keys(copy)
          });
        });
        
        // Keep all copies for validation, but add a flag for display
        bookData.copies = allCopies;
        bookData.borrowedCopies = borrowedCopies; // For display purposes
        
        setBook(bookData);
        
        // Reload user's borrowed copy IDs to ensure we have the latest data
        if (currentUserId) {
          await loadUserBorrowedCopyIds(currentUserId);
        }
      } else {
        throw new Error(bookResponse.message || 'Failed to load book details');
      }
    } catch (err) {
      console.error('Error loading book details:', err);
      setError(err.message || 'Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBooks = async () => {
    try {
      setLoading(true);
      // Try primary books API
      let booksRes = await (ApiService.getBooks ? ApiService.getBooks({ limit: 1000 }) : ApiService.getAllBooks?.({ limit: 1000 }));
      
      // Fallback: some ApiService implementations return { success, data: { books: [...] } }
      if (booksRes?.success) {
        const booksArray = Array.isArray(booksRes.data?.books)
          ? booksRes.data.books
          : Array.isArray(booksRes.data)
            ? booksRes.data
            : [];

        // Filter to books that have at least one borrowed copy (more accurate filtering)
        const booksWithBorrowed = booksArray.filter(b => {
          const total = Number(b.totalCopies ?? b.total_copies ?? b.total) || 0;
          const available = Number(b.availableCopies ?? b.available_copies ?? b.available) || 0;
          const borrowed = total - available;
          
          console.log('📚 Book filtering:', {
            title: b.title || b.bookTitle,
            total,
            available,
            borrowed,
            shouldInclude: total > 0 && borrowed > 0
          });
          
          // Include books that have borrowed copies (but don't require available === 0)
          // The backend will handle the final validation
          return total > 0 && borrowed > 0;
        });

        // Bind directly to list renderer by placing under copies key
        setBook({ 
          id: 'all-books', 
          title: 'Books With Borrowed Copies',
          copies: booksWithBorrowed,
          borrowedCopies: booksWithBorrowed // For display purposes
        });
        return;
      }

      throw new Error(booksRes?.message || 'Failed to load available books');
    } catch (err) {
      console.error('Error loading available books:', err);
      setError(err.message || 'Failed to load available books');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySelection = async (copy) => {
    const copyId = String(copy.id || copy.copyId || copy.copy_id || '');
    setLoadingCopyId(copyId);
    
    try {
      // Get user ID to check for self-reservation
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        throw new Error('User not logged in. Please log in again.');
      }
      
      const userData = JSON.parse(userDataString);
      const userId = userData.id;

      // Block reserve when user has any overdue items
      try {
        const has = await ApiService.hasOverdueBooks(userId);
        if (has) {
          setErrorDialog({ visible: true, type: 'overdue_books' });
          return;
        }
      } catch {}

      // Check if user is trying to reserve their own borrowed copy
      const possibleCopyIds = [
        String(copy.id || ''),
        String(copy.copyId || ''),
        String(copy.copy_id || ''),
        String(copy.qrCode || ''),
        String(copy.qr_code || ''),
        String(copy.copyNumber || ''),
        String(copy.copy_number || '')
      ].filter(id => id && id !== 'undefined' && id !== 'null');
      
      const isMyBorrowedCopy = possibleCopyIds.some(id => userBorrowedCopyIds.has(id));
      if (isMyBorrowedCopy) {
        Alert.alert(
          'Cannot Reserve Your Own Copy',
          `You are currently borrowing Copy #${copy.copyNumber || copy.copy_number || copy.id} of "${book.title}".\n\nYou cannot reserve a copy that you are already borrowing. Please return the book first if you need to borrow it again.`,
          [{ text: 'OK' }]
        );
      return;
    }

      console.log('📖 Selected copy for reservation:', copy);
      setSelectedCopy(copy);
    setConditionModalVisible(true);
    } catch (err) {
      handleErrorForUI(err, Alert.alert, 'Selection Failed');
    } finally {
      setLoadingCopyId(null);
    }
  };

  const handleReserveSubmit = async () => {
    try {
      setReserving(true);

      if (hasOverdues) {
        setErrorDialog({ visible: true, type: 'overdue_books' });
        setReserving(false);
        return;
      }
      
      // Get user ID from storage
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        throw new Error('User not logged in. Please log in again.');
      }
      
      const userData = JSON.parse(userDataString);
      const userId = userData.id;

      // Guard: if user already has a pending reservation for this book, skip API and route to My Reservations
      try {
        const res = await ApiService.getUserReservations('all');
        const rows = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (res?.data?.reservations || res?.reservations || []));
        const hasActiveForBook = (rows || []).some(r => {
          const status = String(r.status || '').toUpperCase();
          const isActive = status === 'ACTIVE' || status === 'READY' || status === 'PENDING';
          return isActive && String(r.bookId || r.book_id) === String(book?.id);
        });
        if (hasActiveForBook) {
          // Persist selected copy as reserved locally for UI pending state
          try {
            const key = `reserved_copy_ids_${book.id}`;
            const stored = await AsyncStorage.getItem(key);
            const prev = stored ? new Set(JSON.parse(stored)) : new Set();
            if (selectedCopy?.id) prev.add(selectedCopy.id);
            await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
          } catch {}
          setConditionModalVisible(false);
          Alert.alert(
            'Already Reserved',
            'You already have a pending reservation for this book. View it in My Reservations.',
            [
              { text: 'Close', style: 'cancel' },
              { text: 'Go to My Reservations', onPress: () => setForceReservationsView(true) }
            ]
          );
          return;
        }
      } catch (e) {
        // Non-blocking if fetch fails; continue
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
      
      let freshBook = book;
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
            freshBook = freshData.data;
            console.log('✅ Fresh API data loaded from backend (backend-aligned)');
          } else {
            console.log('❌ Fresh API call failed - no data returned');
          }
        } else {
          console.log('❌ Fresh API call failed with status:', freshResponse.status);
        }
      } catch (error) {
        console.log('⚠️ Error with fresh API calls:', error.message);
      }
      
      // Fallback to cached API call if direct call failed
      if (freshBook === book) {
        try {
          const freshBookData = await ApiService.getBookById(book.id);
          if (freshBookData.success && freshBookData.data) {
            freshBook = freshBookData.data;
            console.log('✅ Cached API data loaded from backend');
          } else {
            console.log('⚠️ Could not fetch fresh book data, using cached data');
          }
        } catch (error) {
          console.log('⚠️ Error fetching fresh book data:', error.message);
          // Continue with cached data if fresh data fails
        }
      }

      // Enhanced validation to match backend logic exactly
      if (freshBook && freshBook.copies) {
        // Use the exact same fields the backend uses
        const freshAvailableCount = freshBook.availableCopies || freshBook.available_copies || 0;
        const freshTotalCopies = freshBook.totalCopies || freshBook.total_copies || freshBook.copies.length;
        
        // Also calculate from copies array for comparison
        const availableCopies = freshBook.copies.filter(copy => 
          copy.status === 'available' || copy.status === 'AVAILABLE'
        );
        
        const borrowedCopies = freshBook.copies.filter(copy => 
          copy.status === 'BORROWED' || copy.status === 'borrowed'
        );
        
        const calculatedAvailableCount = availableCopies.length;
        
        console.log('📊 Fresh book availability check (backend logic):', {
          totalCopies: freshTotalCopies,
          availableCopies: freshAvailableCount,
          calculatedAvailableCount,
          borrowedCopies: borrowedCopies.length,
          bookId: freshBook.id,
          allCopyStatuses: freshBook.copies.map(c => ({ id: c.id, status: c.status })),
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
          Alert.alert(
            'Book Available for Direct Borrowing',
            'All copies of this book are currently available. You can borrow it directly from the library instead of reserving.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Go to Borrow', 
                onPress: () => {
                  setConditionModalVisible(false);
                  router.push({
                    pathname: '/book-catalog/details',
                    params: { id: freshBook.id }
                  });
                }
              }
            ]
          );
          return;
        }

        // If no borrowed copies, don't allow reservation
        if (borrowedCopies.length === 0) {
          console.log('❌ Blocking reservation: No borrowed copies available');
          Alert.alert(
            'No Reservations Available',
            'All copies of this book are currently available. You can borrow it directly instead of reserving.',
            [
              { text: 'Go to Borrow', onPress: () => router.push(`/book-catalog/details?id=${freshBook.id}`) },
              { text: 'Close', style: 'cancel' }
            ]
          );
          return;
        }
        
        console.log('✅ Book validation passed: Proceeding with reservation');

        // Check for self-reservation (user cannot reserve their own borrowed copy)
        const possibleSelectedCopyIds = [
          String(selectedCopy.id || ''),
          String(selectedCopy.copyId || ''),
          String(selectedCopy.copy_id || ''),
          String(selectedCopy.qrCode || ''),
          String(selectedCopy.qr_code || ''),
          String(selectedCopy.copyNumber || ''),
          String(selectedCopy.copy_number || '')
        ].filter(id => id && id !== 'undefined' && id !== 'null');
        
        const isMyBorrowedCopy = possibleSelectedCopyIds.some(id => userBorrowedCopyIds.has(id));
        if (isMyBorrowedCopy) {
          Alert.alert(
            'Cannot Reserve Your Own Copy',
            `You are currently borrowing Copy #${selectedCopy.copyNumber || selectedCopy.copy_number || selectedCopy.id} of "${book.title}".\n\nYou cannot reserve a copy that you are already borrowing. Please return the book first if you need to borrow it again.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Calculate expected return date (30 days from now)
      const expectedReturnDate = new Date();
      expectedReturnDate.setDate(expectedReturnDate.getDate() + 30);

      // Call the new reservation API
      console.log('📝 Creating reservation for book:', freshBook.id);
      const response = await ApiService.createReservation(freshBook.id, {
        expectedReturnDate: expectedReturnDate.toISOString(),
        initialCondition: 'GOOD',
        conditionNotes: selectedCopy ? `Reserved Copy #${selectedCopy.copyNumber} via mobile app` : 'Reserved via mobile app'
      });

      console.log('📋 Reservation creation response:', response);

      if (response.success) {
        // Save local reserved copy id for UI pending badges
        try {
          const key = `reserved_copy_ids_${book.id}`;
          const stored = await AsyncStorage.getItem(key);
          const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
          const aliases = [
            selectedCopy?.id, selectedCopy?.copyId, selectedCopy?.copy_id,
            selectedCopy?.qrCode, selectedCopy?.qr_code, selectedCopy?.qrcode,
            selectedCopy?.qr, selectedCopy?.code, selectedCopy?.uid, selectedCopy?.uuid,
            selectedCopy?.copyNumber, selectedCopy?.copy_number, selectedCopy?.number
          ].filter(Boolean).map(String);
          aliases.forEach(a => prev.add(a));
          if (selectedCopy?.copyNumber || selectedCopy?.copy_number || selectedCopy?.number) {
            prev.add(`num:${String(selectedCopy?.copyNumber || selectedCopy?.copy_number || selectedCopy?.number)}`);
          }
          await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
        } catch {}
        setConditionModalVisible(false);
        console.log('🔄 Reservation successful, triggering force view...');
        
        // Log activity for recommendations
        try { logReco({ type: 'reserve', bookId: book?.id, category: book?.subject || book?.category, author: book?.author, shelfPrefix: book?.shelfLocationPrefix || book?.shelfPrefix, shelfLocation: book?.shelfLocation }); } catch {}
        // Navigate to My Reservations tab
        router.replace({ pathname: '/borrowing/reserve', params: { tab: 'RESERVATIONS' } });
        
        // Show success message
        Alert.alert('Success', 'Reservation submitted. You can track it in My Reservations.');
      } else {
        throw new Error(response.message || 'Failed to reserve book');
      }
    } catch (err) {
      const msg = String(err?.message || '').toUpperCase();
      console.error('❌ Reservation error:', err);
      
      if (msg.includes('BOOK_AVAILABLE')) {
        setConditionModalVisible(false);
        Alert.alert(
          'Book Available for Direct Borrowing',
          'This book has available copies. Please borrow it directly instead of reserving.',
          [
            { text: 'Go to Borrow', onPress: () => router.push(`/book-catalog/details?id=${book.id}`) },
            { text: 'Close', style: 'cancel' }
          ]
        );
        return;
      }
      
      if (msg.includes('NO_BORROWED_COPIES')) {
        setConditionModalVisible(false);
        Alert.alert(
          'No Reservations Available',
          'All copies of this book are currently available. You can borrow it directly instead of reserving.',
          [
            { text: 'Go to Borrow', onPress: () => router.push(`/book-catalog/details?id=${book.id}`) },
            { text: 'Close', style: 'cancel' }
          ]
        );
        return;
      }
      
      if (msg.includes('DUPLICATE_RESERVATION') || msg.includes('ALREADY_RESERVED')) {
        // Save selected copy locally so UI can show pending
        try {
          const key = `reserved_copy_ids_${book.id}`;
          const stored = await AsyncStorage.getItem(key);
          const keyVal = String(selectedCopy?.id || selectedCopy?.copyId || selectedCopy?.copy_id || selectedCopy?.qrCode || selectedCopy?.qr_code || selectedCopy?.qrcode || selectedCopy?.qr || selectedCopy?.code || selectedCopy?.uid || selectedCopy?.uuid || selectedCopy?.copyNumber || selectedCopy?.copy_number || selectedCopy?.number || '');
          const prev = stored ? new Set(JSON.parse(stored).map(String)) : new Set();
          if (keyVal) prev.add(keyVal);
          await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
        } catch {}
        setConditionModalVisible(false);
        Alert.alert(
          'Already Reserved',
          'You already have a pending reservation for this book. View it in My Reservations.',
          [
            { text: 'Close', style: 'cancel' },
            { text: 'Go to My Reservations', onPress: () => router.replace({ pathname: '/borrowing/reserve', params: { tab: 'RESERVATIONS' } }) }
          ]
        );
        return;
      }
      
      if (msg.includes('OVERDUE_BOOKS')) {
        setConditionModalVisible(false);
        setErrorDialog({ visible: true, type: 'overdue_books' });
        return;
      }
      
      handleErrorForUI(err, Alert.alert, 'Reservation Failed');
    } finally {
      setReserving(false);
    }
  };

  const renderBookItem = ({ item }) => {
    const isCurrentlyBorrowed = myBorrowedBookIds.has(String(item.id || item.bookId || item.book_id));
    const availableCopies = item.availableCopies ?? item.available_copies ?? 0;
    const totalCopies = item.totalCopies ?? item.total_copies ?? 0;
    const borrowedCopies = totalCopies - availableCopies;
    // Backend logic: reservation allowed if availableCopies < totalCopies (some copies are borrowed)
    const canReserve = availableCopies < totalCopies;
    
    console.log('🔍 Book reservation check:', {
      bookId: item.id,
      title: item.title,
      availableCopies,
      totalCopies,
      borrowedCopies,
      canReserve,
      isCurrentlyBorrowed
    });
    
    return (
      <View style={styles.bookItem}>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{item.title || item.bookTitle}</Text>
          <Text style={styles.bookAuthor}>by {item.author || item.bookAuthor || 'Not specified'}</Text>
        <View style={styles.bookDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="book" size={16} color="#6b7280" />
              <Text style={styles.detailText}>Subject: {item.subject || item.category || 'Not specified'}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
              <Text style={styles.detailText}>DDC: {item.ddc || item.ddcNumber || 'Not specified'}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="barcode" size={16} color="#6b7280" />
              <Text style={styles.detailText}>ISBN: {item.isbn || item.ISBN || 'Not specified'}</Text>
            </View>
          </View>
        </View>
        
        {/* Currently Borrowed Status */}
        {isCurrentlyBorrowed && (
          <View style={styles.borrowedStatusBadge}>
            <MaterialCommunityIcons name="book-check" size={16} color="#16a34a" />
            <Text style={styles.borrowedStatusText}>You Currently Borrowed This</Text>
          </View>
        )}
        
        <View style={styles.availabilityInfo}>
          <View style={styles.availabilityBadge}>
            <MaterialCommunityIcons name="book" size={16} color="#f59e0b" />
            <Text style={styles.availabilityText}>
              {availableCopies} of {totalCopies} copies available
          </Text>
          </View>
          <View style={styles.borrowedInfo}>
            <MaterialCommunityIcons name="lock" size={16} color="#ef4444" />
            <Text style={styles.borrowedText}>
              {borrowedCopies} copies currently borrowed
          </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.reserveButton, (!canReserve || isCurrentlyBorrowed) && styles.disabledButton]}
          onPress={() => {
            if (isCurrentlyBorrowed) {
              Alert.alert(
                'Cannot Reserve Your Own Copy',
                'You are currently borrowing this book. You cannot reserve a copy that you are already borrowing.',
                [{ text: 'OK' }]
              );
            } else if (!canReserve) {
              Alert.alert(
                'All Copies Available',
                'All copies of this book are currently available. You can borrow it directly instead of reserving.',
                [
                  { text: 'Go to Borrow', onPress: () => router.push({ pathname: '/book-catalog/details', params: { id: item.id } }) },
                  { text: 'Close', style: 'cancel' }
                ]
              );
            } else {
              router.push({ pathname: '/reservation/details', params: { id: item.id } });
            }
          }}
        >
          <View style={styles.buttonContent}>
            <MaterialCommunityIcons 
              name={isCurrentlyBorrowed ? "book-check" : (!canReserve ? "book-open" : "eye")} 
              size={18} 
              color="white" 
            />
            <Text style={styles.reserveButtonText}>
              {isCurrentlyBorrowed ? 'Currently Borrowed' : (!canReserve ? 'All Copies Available' : 'View Details')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCopyItem = ({ item }) => {
    console.log('🔍 Copy item data for rendering:', item);
    console.log('🔍 Available copy fields:', Object.keys(item));
    const copyId = String(item.id || item.copyId || item.copy_id || '');
    console.log('🔍 Extracted copyId:', copyId);
    console.log('🔍 User borrowed copy IDs:', Array.from(userBorrowedCopyIds));
    
    // Try multiple possible copy ID formats for comparison
    const possibleCopyIds = [
      String(item.id || ''),
      String(item.copyId || ''),
      String(item.copy_id || ''),
      String(item.qrCode || ''),
      String(item.qr_code || ''),
      String(item.copyNumber || ''),
      String(item.copy_number || '')
    ].filter(id => id && id !== 'undefined' && id !== 'null');
    
    console.log('🔍 All possible copy IDs for this item:', possibleCopyIds);
    
    const isMyBorrowedCopy = possibleCopyIds.some(id => userBorrowedCopyIds.has(id));
    console.log('🔍 Is my borrowed copy?', isMyBorrowedCopy, 'using any of:', possibleCopyIds);
    const isLoading = loadingCopyId === copyId;
    
    return (
    <View style={styles.bookItem}>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>Copy #{item.copyNumber}</Text>
        <Text style={styles.bookAuthor}>Status: {item.status}</Text>
        <View style={styles.bookDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Location: {item.location || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="star" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Condition: {item.condition || 'Unknown'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account" size={16} color="#6b7280" />
        <Text style={styles.detailText}>
              Borrowed by: {item.borrowedBy?.name || item.borrowedBy || 'Unknown'}
        </Text>
          </View>
        </View>
      </View>

      <View style={styles.availabilityInfo}>
        <View style={styles.borrowedInfo}>
          <MaterialCommunityIcons name="clock" size={16} color="#f59e0b" />
          { (item.dueDate || item.due_date || item.expectedReturnDate || item.expected_return_date || item.borrowDueDate || (item.borrowtransaction && item.borrowtransaction.dueDate)) ? (
            <Text style={styles.borrowedText}>
              Due: {new Date(item.dueDate || item.due_date || item.expectedReturnDate || item.expected_return_date || item.borrowDueDate || (item.borrowtransaction && item.borrowtransaction.dueDate)).toLocaleDateString()}
          </Text>
          ) : null }
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.reserveButton, isMyBorrowedCopy && styles.disabledButton]}
        onPress={() => handleCopySelection(item)}
        disabled={isMyBorrowedCopy || isLoading}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
          <MaterialCommunityIcons name="bookmark" size={18} color="white" />
          )}
          <Text style={styles.reserveButtonText}>
            {isLoading ? 'Loading...' : (isMyBorrowedCopy ? '✅ Currently Borrowed' : 'Reserve This Copy')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Error Loading Book</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            if (bookId) {
              loadBookDetails();
            } else {
              loadAvailableBooks();
            }
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If we have a specific book (from book details) AND we're not on RESERVATIONS tab AND not forcing reservations view
  console.log('🔍 Rendering check - book:', book, 'bookId:', bookId, 'activeTab:', activeTab, 'forceReservationsView:', forceReservationsView);
  console.log('🔍 Conditions - hasBook:', !!book, 'bookNotAllBooks:', book?.id !== 'all-books', 'notReservationsTab:', activeTab !== 'RESERVATIONS', 'notForceView:', !forceReservationsView);
  
  if (book && book.id !== 'all-books' && activeTab !== 'RESERVATIONS' && !forceReservationsView) {
    console.log('📖 RENDERING BOOK DETAILS VIEW for:', book.title);
    return (
      <View style={styles.container}>
        {/* Header */}
        <Header 
          title="Reserve Book Copy"
          subtitle={`Select a borrowed copy of "${book.title}" to reserve`}
          onMenuPress={() => setSidebarVisible(true)}
        />

        {/* Sidebar */}
        <Sidebar 
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Book Information */}
            <View style={styles.bookCard}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>by {book.author}</Text>
              
              <View style={styles.bookDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="book" size={16} color="#6b7280" />
                <Text style={styles.detailText}>Subject: {book.subject || 'Not specified'}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
                <Text style={styles.detailText}>DDC: {book.ddc || 'Not specified'}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="barcode" size={16} color="#6b7280" />
                <Text style={styles.detailText}>ISBN: {book.isbn || 'Not specified'}</Text>
              </View>
              </View>

              {/* Availability Status */}
            {book.copies && book.copies.length > 0 ? (
              <View style={styles.availabilitySection}>
                <View style={styles.availabilityBadge}>
                  <MaterialCommunityIcons name="book" size={16} color="#f59e0b" />
                  <Text style={styles.availabilityText}>
                    {book.copies.filter(c => c.status === 'available' || c.status === 'AVAILABLE').length} of {book.copies.length} copies available
                  </Text>
                </View>
                <View style={styles.borrowedInfo}>
                  <MaterialCommunityIcons name="lock" size={16} color="#ef4444" />
                  <Text style={styles.borrowedText}>
                    {book.copies.filter(c => c.status === 'borrowed' || c.status === 'BORROWED').length} copies currently borrowed
                </Text>
              </View>
                      </View>
            ) : (
              <View style={styles.availableSection}>
                <MaterialCommunityIcons name="book-open" size={24} color="#22c55e" />
                <Text style={styles.availableText}>This book is currently available</Text>
                <Text style={styles.availableSubtext}>You can borrow it directly instead of reserving</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setConditionModalVisible(false);
                router.back();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Book Conditions View Modal */}
        <BookConditionsView
          visible={conditionModalVisible}
          onClose={() => {
            setConditionModalVisible(false);
            router.back();
          }}
          onSubmit={handleReserveSubmit}
          title="Book Conditions & Reservation"
          submitText="Reserve Book"
          book={book}
          loading={reserving}
        />

      </View>
    );
  }

  // If we have a list of books (from general reservation)
  // Render reservation item
  const renderReservationItem = ({ item }) => {
    console.log('🎨 Rendering reservation item:', item);
    return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.book?.title || item.bookTitle || 'Unknown Book'}</Text>
      <Text style={styles.author}>by {item.book?.author || item.bookAuthor || 'Unknown Author'}</Text>
      {item.copyId && (
        <Text style={styles.copyInfo}>Copy ID: {item.copyId}</Text>
      )}
      <Text style={styles.date}>
        Requested: {new Date(item.requestDate || item.reservationDate || item.dateRequested).toLocaleDateString()}
      </Text>
      {item.expectedReturnDate && (
        <Text style={styles.expectedReturn}>
          Expected Return: {new Date(item.expectedReturnDate).toLocaleDateString()}
        </Text>
      )}
      <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
      {/* Cancel action when pending/active */}
      {(item.status === 'PENDING' || item.status === 'ACTIVE' || item.status === 'APPROVED') && (
        <TouchableOpacity
          style={[styles.reserveButton, { backgroundColor: '#ef4444', marginTop: 8 }]}
          onPress={async () => {
            try {
              const res = await ApiService.cancelReservation(null, item.id, 'Cancelled by user');
              if (res.success !== false) {
                Alert.alert('Cancelled', 'Your reservation has been cancelled.');
                loadReservations();
                try {
                  // Clear local UI memory for reserved copy ids for this book if known
                  if (item.bookId && item.copyId) {
                    const key = `reserved_copy_ids_${item.bookId}`;
                    const stored = await AsyncStorage.getItem(key);
                    const prev = stored ? new Set(JSON.parse(stored)) : new Set();
                    if (prev.has(item.copyId)) {
                      prev.delete(item.copyId);
                      await AsyncStorage.setItem(key, JSON.stringify(Array.from(prev)));
                    }
                  }
                } catch {}
              } else {
                throw new Error(res.message || 'Failed to cancel reservation');
              }
            } catch (err) {
              Alert.alert('Cancel Failed', err.message || 'Please try again later.');
            }
          }}
        >
          <View style={styles.buttonContent}>
            <MaterialCommunityIcons name="close" size={18} color="white" />
            <Text style={styles.reserveButtonText}>Cancel Reservation</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
    );
  };

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

  console.log('📋 RENDERING MAIN RESERVATIONS VIEW - activeTab:', activeTab, 'reservations count:', reservations.length, 'forceReservationsView:', forceReservationsView);
  return (
    <View key={`reservations-${activeTab}`} style={styles.container}>
      {/* Header */}
      <Header 
        title="Book Reservations"
        subtitle="Reserve books that are currently borrowed"
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {/* Tab Row */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          onPress={() => setActiveTab('BOOKS')} 
          style={[styles.tab, activeTab === 'BOOKS' && styles.activeTab]}
        >
          <Text style={activeTab === 'BOOKS' ? styles.activeTabText : styles.tabText}>Books</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('RESERVATIONS')} 
          style={[styles.tab, activeTab === 'RESERVATIONS' && styles.activeTab]}
        >
          <Text style={activeTab === 'RESERVATIONS' ? styles.activeTabText : styles.tabText}>My Reservations</Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'BOOKS' ? (
      <FlatList
          data={book?.borrowedCopies || book?.copies || []}
        renderItem={renderBookItem}
          keyExtractor={(item, index) => `book_${item.id || index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="book-open" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Books Available for Reservation</Text>
              <Text style={styles.emptyMessage}>
                All books are currently available for direct borrowing. No reservations needed!
            </Text>
          </View>
        }
        />
      ) : (
        <View style={styles.content}>
          {loadingReservations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading your reservations...</Text>
            </View>
          ) : (
            <FlatList
              data={reservations}
              renderItem={renderReservationItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="bookmark-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Reservations</Text>
                  <Text style={styles.emptyMessage}>
                    You haven't made any reservations yet. Browse books to reserve copies that are currently borrowed.
            </Text>
          </View>
        }
      />
          )}
        </View>
      )}

      {/* Book Conditions View Modal */}
      <BookConditionsView
        visible={conditionModalVisible}
        onClose={() => {
          setConditionModalVisible(false);
          router.back();
        }}
        onSubmit={handleReserveSubmit}
        title="Reservation Details"
        submitText="Reserve Book"
        book={book}
        loading={reserving}
      />

      {/* Overdue Error Dialog */}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  bookCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  bookDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  availabilitySection: {
    marginBottom: 20,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 8,
  },
  borrowedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  borrowedText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  availableSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 20,
  },
  availableText: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 8,
  },
  availableSubtext: {
    fontSize: 14,
    color: '#16a34a',
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  bookItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookInfo: {
    marginBottom: 12,
  },
  availabilityInfo: {
    marginBottom: 16,
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
  reserveButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Tab styles
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  activeTab: {
    borderColor: '#3b82f6',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // Reservation card styles
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
    borderColor: '#f1f5f9',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
    color: '#1e293b',
  },
  author: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  copyInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  date: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  expectedReturn: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Currently Borrowed Status Styles
  borrowedStatusBadge: {
    backgroundColor: '#d1fae5',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  borrowedStatusText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
});

export default BookReservationScreen;
