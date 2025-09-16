import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import BorrowRequestModal from '../../components/BorrowRequestModal';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { COURSE_PROGRAMS, SHELF_LOCATIONS } from '../../constants/BookConstants';
import ApiService from '../../services/ApiService';
import StatusSync from '../../utils/StatusSync';

const { width } = Dimensions.get('window');

const BookCatalogScreen = () => {
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('title');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Enhanced filter states
  const [selectedShelfLocation, setSelectedShelfLocation] = useState(null);
  const [selectedCourseProgram, setSelectedCourseProgram] = useState(null);
  // Collapsible filter sections
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [locationCollapsed, setLocationCollapsed] = useState(true);
  const [programCollapsed, setProgramCollapsed] = useState(true);
  
  // Modal states
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  
  // Pending copy IDs tracking using Set
  const [pendingCopyIds, setPendingCopyIds] = useState(new Set());
  const [myBorrowedBookIds, setMyBorrowedBookIds] = useState(new Set());
  // Track pending requests by book ID for proper catalog display
  const [pendingBookIds, setPendingBookIds] = useState(new Set());
  
  const router = useRouter();


  // Load pending copy IDs from storage and server
  const loadPendingCopyIds = async () => {
    try {
      // First load from storage
      const storageKey = 'pending_copy_ids_global';
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const copyIds = JSON.parse(stored);
        console.log('📋 Loaded global pending copy IDs from storage:', copyIds);
        setPendingCopyIds(new Set(copyIds));
      }

      // Try to load from server and handle missing copyId
      console.log('🔍 Loading pending requests from server');
      try {
      const response = await ApiService.getBorrowRequests('pending');
      
      if (response.success && response.data && response.data.requests) {
          console.log('📋 Server pending requests:', response.data.requests);
          
          // Get currently borrowed books to exclude approved requests
          const borrowedResponse = await ApiService.getUserBooks(undefined, 'borrowed', false);
          let borrowedCopyIds = new Set();
          
          if (borrowedResponse) {
            const borrowedBooks = Array.isArray(borrowedResponse) ? borrowedResponse : 
                                 Array.isArray(borrowedResponse?.data) ? borrowedResponse.data :
                                 Array.isArray(borrowedResponse?.data?.books) ? borrowedResponse.data.books :
                                 Array.isArray(borrowedResponse?.books) ? borrowedResponse.books : [];
            
            borrowedBooks.forEach(book => {
              const copyId = book.copyId || book.copy_id || book.copy?.id;
              if (copyId) {
                borrowedCopyIds.add(String(copyId));
              }
            });
          }
          
          console.log('📋 Currently borrowed copy IDs (catalog):', Array.from(borrowedCopyIds));
          
          // Only include copy IDs that are NOT currently borrowed (exclude approved requests)
          const serverCopyIds = new Set(
            response.data.requests
              .filter(r => String(r.status || '').toUpperCase() === 'PENDING')
              .map(r => r.copyId)
              .filter(Boolean)
              .filter(copyId => !borrowedCopyIds.has(String(copyId)))
          );
          
          // Also track pending book IDs for catalog display
          const serverBookIds = new Set(
            response.data.requests
              .filter(r => String(r.status || '').toUpperCase() === 'PENDING')
              .map(r => r.bookId)
              .filter(Boolean)
              .filter(bookId => !myBorrowedBookIds.has(String(bookId)))
          );
          
          console.log('📋 Server pending copy IDs (excluding borrowed):', Array.from(serverCopyIds));
          console.log('📋 Server pending book IDs (excluding borrowed):', Array.from(serverBookIds));
          
          if (serverCopyIds.size > 0) {
            setPendingCopyIds(prev => {
              const merged = new Set([...Array.from(prev), ...Array.from(serverCopyIds)]);
              savePendingCopyIds(merged);
              return merged;
            });
          }
          
          if (serverBookIds.size > 0) {
            setPendingBookIds(prev => {
              const merged = new Set([...Array.from(prev), ...Array.from(serverBookIds)]);
              return merged;
            });
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

  // Save pending copy IDs to storage
  const savePendingCopyIds = async (copyIds) => {
    try {
      const storageKey = 'pending_copy_ids_global';
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(copyIds)));
      console.log('📋 Saved global pending copy IDs:', Array.from(copyIds));
    } catch (error) {
      console.error('❌ Error saving pending copy IDs:', error);
    }
  };

  // Clear specific pending copy IDs from storage (when approved)
  const clearPendingCopyIds = async (copyIdsToRemove) => {
    try {
      const storageKey = 'pending_copy_ids_global';
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const currentIds = new Set(JSON.parse(stored));
        copyIdsToRemove.forEach(copyId => {
          currentIds.delete(String(copyId));
        });
        await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(currentIds)));
        console.log('📋 Cleared global pending copy IDs:', copyIdsToRemove);
      }
    } catch (error) {
      console.error('❌ Error clearing pending copy IDs:', error);
    }
  };

  // Load books from backend
  const loadBooks = async (isRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading books with search:', search, 'filterBy:', filterBy);
      
      // Use the books API to get ALL books (available and unavailable) for the catalog
      const response = await ApiService.getBooks({ 
        limit: 1000, // Get all books regardless of availability
        search: search || undefined,
        filterBy: filterBy || undefined,
        forceRefresh: isRefresh
      });
      
      if (response.success && response.data) {
        // Handle both array response and object with books property
        const allBooks = Array.isArray(response.data) ? response.data : response.data.books || [];
        console.log(`📖 Loaded ${allBooks.length} books into catalog (including unavailable books)`);
        
        // Debug: Log first book structure to understand data format
        if (allBooks.length > 0) {
          console.log('📋 Sample book structure:', {
            id: allBooks[0].id,
            title: allBooks[0].title,
            author: allBooks[0].author,
            subject: allBooks[0].subject,
            shelfLocationPrefix: allBooks[0].shelfLocationPrefix,
            location: allBooks[0].location,
            courseProgram: allBooks[0].courseProgram,
            program: allBooks[0].program,
            availableCopies: allBooks[0].availableCopies,
            totalCopies: allBooks[0].totalCopies
          });
        }
        
        setBooks(allBooks);
        // Apply client-side filtering for enhanced filters
        applyClientSideFilters(allBooks);
      } else {
        console.log('❌ No books data in response');
        console.log('📋 Response structure:', response);
        
        // Check if it's a CORS error
        if (response.error && response.error.type === 'CORS_ERROR') {
          console.log('🚨 CORS error detected, using fallback data');
          // Don't set error, just use empty results and let user know
          setBooks([]);
          setFilteredBooks([]);
        } else {
          setError('No books found. The backend may be experiencing issues or no books are available.');
        setBooks([]);
        setFilteredBooks([]);
        }
      }
    } catch (err) {
      console.error('❌ Error loading books:', err);
      
      // Provide specific error messages based on error type
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        console.log('🚨 CORS/Network error detected, using fallback approach');
        // Don't set error for CORS issues, just use empty results
        setBooks([]);
        setFilteredBooks([]);
      } else if (err.message.includes('Network')) {
        setError('Network connection issue. Please check your internet connection and try again.');
        setBooks([]);
        setFilteredBooks([]);
      } else {
        setError(`Unable to load books: ${err.message}`);
      setBooks([]);
      setFilteredBooks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load user's currently borrowed books once and on refresh
  const loadMyBorrowedBooks = async () => {
    try {
      console.log('🔄 loadMyBorrowedBooks called - starting fresh fetch');
      
      // Get current user ID first
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        console.log('⚠️ No user ID available for borrowed books check');
        setMyBorrowedBookIds(new Set());
        return;
      }
      
      console.log('📋 Current user ID:', userId);

      // Try multiple API approaches to get borrowed books
      let res = null;
      
      // Approach 1: Try the mobile API endpoint
      try {
        console.log('📋 Trying mobile API endpoint...');
        const response = await fetch(`${ApiService.API_BASE}/api/mobile/users/${userId}/books`, {
          method: 'GET',
          headers: await ApiService.getAuthHeaders(),
        });
        
        if (response.ok) {
          res = await response.json();
          console.log('📋 Mobile API response:', res);
        } else {
          console.log('📋 Mobile API failed with status:', response.status);
        }
      } catch (e) {
        console.log('📋 Mobile API error:', e.message);
      }
      
      // Approach 2: Try ApiService.getUserBooks if mobile API failed
      if (!res || !res.success) {
        try {
          console.log('📋 Trying ApiService.getUserBooks...');
          res = await ApiService.getUserBooks(userId, 'borrowed', false);
          console.log('📋 ApiService response:', res);
        } catch (e) {
          console.log('📋 ApiService error:', e.message);
        }
      }
      
      // Approach 3: Try alternative ApiService signature
      if (!res || !res.success) {
        try {
          console.log('📋 Trying alternative ApiService signature...');
          res = await ApiService.getUserBooks(userId, { status: 'borrowed', includeHistory: false });
          console.log('📋 Alternative ApiService response:', res);
        } catch (e) {
          console.log('📋 Alternative ApiService error:', e.message);
        }
      }

      console.log('📋 Final API response:', res);

      // Extract borrowed books from response
      let rows = [];
      if (res && res.success) {
        if (Array.isArray(res.data)) {
        rows = res.data;
        } else if (Array.isArray(res.data?.books)) {
        rows = res.data.books;
        } else if (Array.isArray(res.data?.borrowedBooks)) {
          rows = res.data.borrowedBooks;
        } else if (Array.isArray(res.data?.items)) {
          rows = res.data.items;
        }
      } else if (Array.isArray(res)) {
        rows = res;
      } else if (Array.isArray(res?.books)) {
        rows = res.books;
      }

      console.log('📋 Extracted rows:', rows);

      // Extract book IDs from borrowed books
      const ids = new Set();
      (rows || []).forEach(book => {
        // Try multiple possible ID fields
        const possibleIds = [
          book.id,
          book.bookId,
          book.book_id,
          book.book?.id,
          book.book?.bookId,
          book.book?.book_id
        ].filter(Boolean);
        
        possibleIds.forEach(id => {
          if (id) {
            ids.add(String(id));
            console.log('📋 Found borrowed book ID:', String(id), 'from book:', book.title || book.book?.title || 'Unknown');
          }
        });
      });

      console.log('📋 Final borrowed book IDs (catalog):', Array.from(ids));

      if (ids.size > 0) {
        setMyBorrowedBookIds(ids);
        try { 
          await AsyncStorage.setItem('my_borrowed_ids', JSON.stringify(Array.from(ids))); 
          console.log('📋 Saved borrowed book IDs to cache:', Array.from(ids));
        } catch {}
      } else {
        setMyBorrowedBookIds(new Set());
        console.log('📋 No borrowed books found');
      }
    } catch (e) {
      console.log('⚠️ Could not load my borrowed books for catalog:', e?.message);
      setMyBorrowedBookIds(new Set());
    }
  };

  // Apply client-side filtering for enhanced filters
  const applyClientSideFilters = (booksToFilter = books) => {
    let filtered = [...booksToFilter];
    
    // Apply shelf location filter
    if (selectedShelfLocation) {
      console.log('Applying shelf location filter:', selectedShelfLocation);
      filtered = filtered.filter(book => {
        // Check various possible field names for shelf location
        const location = book.shelfLocation || book.shelfLocationPrefix || book.location || book.locationPrefix;
        console.log('Book location:', location, 'Selected:', selectedShelfLocation);
        
        // Map filter selection to actual shelf location patterns
        let locationKeywords = [];
        switch (selectedShelfLocation) {
          case 'Fi-college':
            locationKeywords = ['College', 'college'];
            break;
          case 'Fi/senH':
            locationKeywords = ['senH', 'Senior High', 'senior high'];
            break;
          case 'Fi/HS':
            locationKeywords = ['HS', 'High School', 'high school'];
            break;
          case 'Fi/E':
            locationKeywords = ['E-', 'Elementary', 'elementary'];
            break;
          case 'Fi/K':
            locationKeywords = ['K', 'Kindergarten', 'kindergarten'];
            break;
          default:
            return true; // Show all if no specific pattern
        }
        
        // Check if the book's location matches any of the keywords
        const matches = location && locationKeywords.some(keyword => 
          location.toLowerCase().includes(keyword.toLowerCase())
        );
        console.log('Location keywords:', locationKeywords, 'Book location:', location, 'Matches:', matches);
        return matches;
      });
      console.log('After shelf location filter:', filtered.length, 'books');
    }
    
    // Apply course program filter (if available)
    if (selectedCourseProgram) {
      console.log('Applying course program filter:', selectedCourseProgram);
      filtered = filtered.filter(book => {
        // Check various possible field names for course program
        const program = book.courseProgram || book.program || book.academicProgram;
        console.log('Book program:', program, 'Selected:', selectedCourseProgram);
        return program === selectedCourseProgram;
      });
      console.log('After course program filter:', filtered.length, 'books');
    }
    
    setFilteredBooks(filtered);
  };

  // Search and filter books
  const handleSearch = () => {
    console.log('Performing search:', search, 'filterBy:', filterBy);
    
    // If we have books loaded, try client-side search first
    if (books.length > 0 && search.trim()) {
      console.log('Performing client-side search on', books.length, 'books');
      const filtered = books.filter(book => {
        const searchTerm = search.toLowerCase().trim();
        const searchField = book[filterBy] || book.title || '';
        return String(searchField).toLowerCase().includes(searchTerm);
      });
      
      console.log('Client-side search found', filtered.length, 'books');
      setFilteredBooks(filtered);
      
      // Also try server-side search in background
    loadBooks(true);
    } else {
      // No books loaded or no search term, load from server
      loadBooks(true);
    }
  };

  // Refresh books
  const onRefresh = () => {
    setRefreshing(true);
    console.log('🔄 Manual refresh triggered');
    Promise.all([loadBooks(true), loadMyBorrowedBooks()]).finally(() => setRefreshing(false));
  };
  
  // Force refresh borrowed books
  const forceRefreshBorrowedBooks = async () => {
    console.log('🔄 Force refreshing borrowed books...');
    await loadMyBorrowedBooks();
  };

  // Handle book click - navigate to book details to select copy
  const handleBookClick = async (bookId) => {
    console.log('Book clicked:', bookId);
    
    // Quick check if this book is already borrowed before navigating
    const bookIdStr = String(bookId);
    if (myBorrowedBookIds.has(bookIdStr)) {
      Alert.alert(
        'Already Borrowed',
        'You currently have this book borrowed. You cannot request to borrow or reserve it again.',
        [
          { text: 'View My Books', onPress: () => router.push('/borrowing/my-books') },
          { text: 'OK' }
        ]
      );
      return;
    }
    
    // Refresh borrowed books data to ensure we have latest info
    await loadMyBorrowedBooks();
    
    // Check again after refresh
    if (myBorrowedBookIds.has(bookIdStr)) {
      Alert.alert(
        'Already Borrowed',
        'You currently have this book borrowed. You cannot request to borrow or reserve it again.',
        [
          { text: 'View My Books', onPress: () => router.push('/borrowing/my-books') },
          { text: 'OK' }
        ]
      );
      return;
    }
    
    router.push({ 
      pathname: '/book-catalog/details', 
      params: { id: bookId } 
    });
  };

  // Handle successful borrow request submission
  const handleBorrowRequestSuccess = (requestData) => {
    console.log('Borrow request submitted successfully:', requestData);
    console.log('📋 Request data copyId:', requestData.copyId);
    console.log('📋 Request data bookId:', requestData.bookId);
    console.log('📋 Current global pending copy IDs before update:', Array.from(pendingCopyIds));
    
    // Add the copy ID to pending set
    if (requestData.copyId) {
      console.log('📋 Adding copy ID to global pending set:', requestData.copyId);
      setPendingCopyIds(prev => {
        const newSet = new Set(prev);
        newSet.add(requestData.copyId);
        console.log('📋 Updated global pending copy IDs:', Array.from(newSet));
        savePendingCopyIds(newSet);
        return newSet;
      });
    } else {
      console.log('❌ No copyId in request data for global tracking');
      console.log('❌ Request data:', requestData);
    }
    
    // Add the book ID to pending book set
    if (requestData.bookId) {
      console.log('📋 Adding book ID to global pending set:', requestData.bookId);
      setPendingBookIds(prev => {
        const newSet = new Set(prev);
        newSet.add(requestData.bookId);
        console.log('📋 Updated global pending book IDs:', Array.from(newSet));
        return newSet;
      });
    } else {
      console.log('❌ No bookId in request data for global tracking');
    }
    
    // Optionally refresh the book list or show success message
    Alert.alert(
      'Request Submitted!',
      'Your borrow request has been submitted successfully. You will be notified when it\'s approved.',
      [
        { text: 'View My Requests', onPress: () => router.push('/borrowing/my-requests') }
      ]
    );
  };

  // Handle book reservation for unavailable books
  const handleReserveBook = async (bookId) => {
    try {
      console.log('Reserving book:', bookId);
      
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to reserve books');
        return;
      }

      const book = books.find(b => b.id === bookId);
      if (!book) {
        Alert.alert('Error', 'Book not found');
        return;
      }

      // Check if user already has this book borrowed
      const bookIdStr = String(bookId);
      const alreadyBorrowed = myBorrowedBookIds.has(bookIdStr);
      
      // Refresh borrowed books data to ensure we have latest info
      await loadMyBorrowedBooks();
      
      // Check again after refresh
      const stillBorrowed = myBorrowedBookIds.has(bookIdStr);
      
      if (alreadyBorrowed || stillBorrowed) {
        Alert.alert(
          'Already Borrowed',
          'You already have this book borrowed. You cannot reserve a book you currently have on loan.',
          [
            { text: 'View My Books', onPress: () => router.push('/borrowing/my-books') },
            { text: 'OK' }
          ]
        );
        return;
      }

      // Check if all copies are borrowed (available for reservation)
      // Additional validation: ensure we have valid data
      if (!book.availableCopies && book.availableCopies !== 0) {
        Alert.alert('Error', 'Unable to determine book availability. Please try again.');
        return;
      }
      
      if (book.availableCopies === 0 && book.totalCopies > 0) {
        const expectedReturnDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const response = await fetch(
          `${ApiService.API_BASE}/api/mobile/users/${userId}/books/${bookId}/reserve`,
          {
            method: "POST",
            headers: await ApiService.getAuthHeaders(),
            body: JSON.stringify({
              expectedReturnDate: expectedReturnDate.toISOString()
            }),
          }
        );

        if (response.ok) {
          Alert.alert(
            'Reservation Successful!', 
            'Book has been reserved successfully. You will be notified when it becomes available.',
            [
              { text: 'View My Reservations', onPress: () => router.push('/borrowing/my-requests') }
            ]
          );
        } else {
          const error = await response.json();
          console.log('Reservation error response:', error);
          
          // Handle specific error cases
          if (error.error && error.error.code === 'BOOK_AVAILABLE') {
            Alert.alert(
              'Book Available', 
              'This book has available copies. Please borrow it directly instead of reserving.',
              [
                { text: 'Go to Borrow', onPress: () => handleBookClick(bookId) },
                { text: 'Close', style: 'cancel' }
              ]
            );
          } else if (error.error && error.error.code === 'NO_BORROWED_COPIES') {
            Alert.alert(
              'No Reservations Needed', 
              'All copies of this book are currently available. You can borrow it directly.',
              [
                { text: 'Go to Borrow', onPress: () => handleBookClick(bookId) },
                { text: 'Close', style: 'cancel' }
              ]
            );
          } else {
            Alert.alert('Reservation Failed', error.error?.message || error.message || 'Failed to reserve book. Please try again.');
          }
        }
      } else {
        Alert.alert(
          'Book Unavailable', 
          'This book is currently unavailable for reservation. All copies may be damaged, lost, or under maintenance.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error reserving book:', error);
      Alert.alert('Error', 'Failed to reserve book. Please try again.');
    }
  };

  // Initial load
  useEffect(() => {
    const initializeScreen = async () => {
      await ApiService.loadAuthToken();
        ApiService.clearCatalogCache();
      await Promise.all([
        loadBooks(true),
        loadPendingCopyIds(),
        loadMyBorrowedBooks()
      ]);
    };
    
    initializeScreen();
    
    // Set up real-time status synchronization
    const statusSyncCallback = (syncData) => {
      console.log('📡 BookCatalog: Received real-time status update');
      // Refresh borrowed books data to update availability status
      loadMyBorrowedBooks();
      // Refresh pending copy IDs to update request status
      loadPendingCopyIds();
      
      // Handle clearing pending copy IDs when requests are approved
      if (syncData.clearPending && Array.isArray(syncData.clearPending)) {
        console.log('📡 BookCatalog: Clearing pending copy IDs for approved requests:', syncData.clearPending);
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
        console.log('📡 BookCatalog: Clearing pending book IDs for approved requests:', syncData.clearPendingBooks);
        setPendingBookIds(prev => {
          const newSet = new Set(prev);
          syncData.clearPendingBooks.forEach(bookId => {
            newSet.delete(String(bookId));
          });
          return newSet;
        });
      }
    };
    
    StatusSync.addListener(statusSyncCallback);
    StatusSync.startSync();
    
    return () => {
      StatusSync.removeListener(statusSyncCallback);
    };
  }, []);

  // Refresh borrowed IDs when returning to catalog
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          // Always apply cached IDs immediately on focus before fetching server
          const cached = await AsyncStorage.getItem('my_borrowed_ids');
          if (cached) setMyBorrowedBookIds(new Set(JSON.parse(cached).map(String)));
        } catch {}
        await loadMyBorrowedBooks();
      })();
      return () => {};
    }, [])
  );

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilterBy(newFilter);
    // Trigger search with new filter
    loadBooks(true);
  };

  // Handle shelf location filter
  const handleShelfLocationFilter = (locationId) => {
    const newLocation = selectedShelfLocation === locationId ? null : locationId;
    setSelectedShelfLocation(newLocation);
  };

  // Handle course program filter
  const handleCourseProgramFilter = (programId) => {
    const newProgram = selectedCourseProgram === programId ? null : programId;
    setSelectedCourseProgram(newProgram);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedShelfLocation(null);
    setSelectedCourseProgram(null);
    setSearch('');
    setFilterBy('title');
  };

  // Test API connection
  const testApiConnection = async () => {
    try {
      console.log('🧪 Testing API connection...');
      const response = await fetch(`${ApiService.API_BASE}/api/books?limit=1`, {
        method: 'GET',
        headers: await ApiService.getAuthHeaders(),
      });
      
      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', response.headers);
      
      const text = await response.text();
      console.log('API Response Text:', text.substring(0, 500));
      
      if (response.ok) {
        Alert.alert('API Test', `API is working! Status: ${response.status}`);
      } else {
        Alert.alert('API Test', `API returned error: ${response.status}`);
      }
    } catch (error) {
      console.error('API Test Error:', error);
      Alert.alert('API Test', `Connection failed: ${error.message}`);
    }
  };

  // Apply enhanced filters whenever they change
  useEffect(() => {
    applyClientSideFilters();
  }, [selectedShelfLocation, selectedCourseProgram]);

  // Real-time search as user types
  useEffect(() => {
    if (search.trim() && books.length > 0) {
      console.log('Real-time search for:', search);
      const filtered = books.filter(book => {
        const searchTerm = search.toLowerCase().trim();
        const searchField = book[filterBy] || book.title || '';
        return String(searchField).toLowerCase().includes(searchTerm);
      });
      setFilteredBooks(filtered);
    } else if (books.length > 0) {
      // If no search term, show all books
      setFilteredBooks(books);
    }
  }, [search, filterBy, books]);

  // Render book item
  const renderBookItem = ({ item }) => {
    return (
    <View style={styles.bookCard}>
      <View style={styles.bookHeader}>
        <View style={styles.bookTitleContainer}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor}>by {item.author}</Text>
        </View>
        
        {/* Enhanced Availability Badge - Hide if currently borrowed */}
        {!myBorrowedBookIds.has(String(item.id || item.bookId || item.book_id)) && (
        <View style={[styles.availabilityBadge, item.availableCopies > 0 ? styles.availableBadge : styles.unavailableBadge]}>
          <MaterialCommunityIcons 
            name={item.availableCopies > 0 ? 'check-circle' : 'bookmark-outline'} 
            size={12} 
            color={item.availableCopies > 0 ? '#10b981' : '#f59e0b'} 
          />
          <Text style={[styles.availabilityBadgeText, { color: item.availableCopies > 0 ? '#10b981' : '#f59e0b' }]}>
            {item.availableCopies > 0 ? 'Available' : 'Can Reserve'}
          </Text>
        </View>
        )}
        {myBorrowedBookIds.has(String(item.id || item.bookId || item.book_id)) && (
          <View style={[styles.availabilityBadge, { backgroundColor: '#d1fae5', marginLeft: 8 }]}>
            <MaterialCommunityIcons name="book-check" size={12} color="#16a34a" />
            <Text style={[styles.availabilityBadgeText, { color: '#16a34a' }]}>You Borrowed This</Text>
          </View>
        )}
      </View>

      <View style={styles.bookMeta}>
        {(item.category || item.subject) && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category || item.subject}</Text>
          </View>
        )}
        
        {/* DDC Classification Badge */}
        {(item.ddcClassification || item.ddc) && (
          <View style={styles.ddcBadge}>
            <Text style={styles.ddcBadgeText}>
              DDC: {item.ddcClassification || item.ddc}
            </Text>
          </View>
        )}
        
        {/* Shelf Location Badge */}
        <View style={styles.shelfLocationBadge}>
          <Text style={styles.shelfLocationText}>
            {item.shelfLocation || item.shelfLocationPrefix || 'Main'}
          </Text>
        </View>
      </View>

      <View style={styles.bookDetails}>
        <View style={styles.bookDetailItem}>
          <MaterialCommunityIcons name="bookshelf" size={14} color="#6b7280" />
          <Text style={styles.bookDetailText}>Shelf: {item.shelfLocation || item.shelfLocationPrefix || 'N/A'}</Text>
        </View>
        <View style={styles.bookDetailItem}>
          <MaterialCommunityIcons name="tag" size={14} color="#6b7280" />
          <Text style={styles.bookDetailText}>DDC: {item.ddcClassification || item.ddc || '—'}</Text>
        </View>
        <View style={styles.bookDetailItem}>
          <MaterialCommunityIcons name="book-open" size={14} color="#6b7280" />
          <Text style={styles.bookDetailText}>{item.category || item.subject || '—'}</Text>
        </View>
      </View>

      {/* Course Program */}
      {item.courseProgram && (
        <View style={styles.courseProgramSection}>
          <MaterialCommunityIcons name="school" size={14} color="#7c3aed" />
          <Text style={styles.courseProgramText}>Program: {item.courseProgram}</Text>
        </View>
      )}

      {/* Enhanced Availability Info */}
      <View style={styles.availabilityInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.availabilityInfoText}>
            {myBorrowedBookIds.has(String(item.id || item.bookId || item.book_id))
              ? `You have this book borrowed`
              : item.availableCopies > 0 
              ? `${item.availableCopies} of ${item.totalCopies || 0} copies available`
              : `All ${item.totalCopies || 0} copies borrowed - can be reserved`
            }
          </Text>
          {myBorrowedBookIds.has(String(item.id || item.bookId || item.book_id)) && (
            <View style={styles.borrowedPill}><Text style={styles.borrowedPillText}>Currently Borrowed</Text></View>
          )}
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.bookActions}>
        {(() => {
          // More comprehensive check for already borrowed books (PRIORITY)
          const bookId = String(item.id || item.bookId || item.book_id);
          const alreadyBorrowed = myBorrowedBookIds.has(bookId);
          
          // Check for pending requests - only if NOT already borrowed
          // Check if this specific book has pending requests
          const hasPendingCopy = !alreadyBorrowed && pendingBookIds.has(bookId);
          
          console.log('📋 Book action check for:', bookId, 'Already borrowed:', alreadyBorrowed, 'Has pending:', hasPendingCopy);

          const hasAnyPending = hasPendingCopy;

          // PRIORITY ORDER: Already Borrowed > Pending > Available
          return alreadyBorrowed ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.borrowedActionButton]}
              onPress={() => {
                Alert.alert(
                  'Already Borrowed',
                  'You currently have this book borrowed. You cannot request to borrow or reserve it again.',
                  [
                    { text: 'View My Books', onPress: () => router.push('/borrowing/my-books') },
                    { text: 'OK' }
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="book-check" size={16} color="#16a34a" />
              <Text style={[styles.actionButtonText, styles.borrowedActionButtonText]}>Currently Borrowed</Text>
            </TouchableOpacity>
          ) : hasAnyPending ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.pendingActionButton]}
              onPress={() => {
                Alert.alert(
                  'Request Already Submitted',
                  'You have already submitted a borrow request for this book. Please wait for approval or check your requests.',
                  [
                    { text: 'OK' },
                    { text: 'View My Requests', onPress: () => router.push('/borrowing/my-requests') }
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="clock-outline" size={16} color="#f59e0b" />
              <Text style={[styles.actionButtonText, styles.pendingActionButtonText]}>Request Pending</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryActionButton]}
              onPress={() => handleBookClick(item.id)}
            >
              <MaterialCommunityIcons 
                name={item.availableCopies > 0 ? "eye" : "bookmark-outline"} 
                size={16} 
                color="#ffffff" 
              />
              <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
                {item.availableCopies > 0 ? 'View Details' : 'Reserve Book'}
              </Text>
            </TouchableOpacity>
          );
        })()}
      </View>
    </View>
  );
  };

  // Render footer (loading more)
  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.footerText}>Loading more books...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    const hasActiveFilters = selectedShelfLocation || selectedCourseProgram || search.trim();
    const hasBooks = books.length > 0;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>
          {hasActiveFilters ? 'No books found' : hasBooks ? 'No books match your criteria' : 'No books available'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {search.trim() 
            ? `No books match "${search}" in ${filterBy}` 
            : hasActiveFilters
            ? 'Try adjusting your filters or search terms'
            : hasBooks
            ? 'Try different search terms or clear filters'
            : 'The library catalog is currently empty or unavailable'
          }
        </Text>
        
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>🗑️ Clear All Filters</Text>
          </TouchableOpacity>
        )}
        
        {!hasActiveFilters && !hasBooks && (
          <TouchableOpacity style={styles.retryButton} onPress={() => loadBooks(true)}>
            <Text style={styles.retryButtonText}>🔄 Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && books.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="Book Catalog"
        subtitle="Discover your next great read"
        onMenuPress={() => setSidebarVisible(true)}
      />
      

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/book-catalog"
      />

      {/* Search Section */}
      <View style={styles.searchSection}>
        {/* Main Search Bar */}
        <View style={styles.mainSearchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
              style={styles.mainSearchInput}
              placeholder="Search books by title, author, category, DDC, ISBN..."
          value={search}
          onChangeText={setSearch}
            returnKeyType="search"
              placeholderTextColor="#94a3b8"
              autoCorrect={false}
              autoCapitalize="none"
          />
            {search.length > 0 && (
          <TouchableOpacity 
                style={styles.clearSearchButton} 
                onPress={() => setSearch('')}
          >
                <MaterialCommunityIcons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Toggle Button */}
            <TouchableOpacity
          style={styles.filterToggleButton}
          onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <MaterialCommunityIcons 
            name={showAdvancedFilters ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#475569" 
          />
          <Text style={styles.filterToggleText}>
            {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </Text>
        </TouchableOpacity>

        {/* Search Results Counter */}
        {search.trim() && (
          <View style={styles.searchResultsCounter}>
            <Text style={styles.searchResultsText}>
              {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found for "{search}"
            </Text>
          </View>
        )}

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <View style={styles.filtersPanel}>
            {/* Search Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Search By</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'title', label: 'Title', icon: 'book-open' },
                  { key: 'author', label: 'Author', icon: 'account-edit' },
                  { key: 'category', label: 'Category', icon: 'tag' },
                  { key: 'ddcClassification', label: 'DDC', icon: 'format-list-numbered' },
                  { key: 'isbn', label: 'ISBN', icon: 'barcode' },
                  { key: 'publisher', label: 'Publisher', icon: 'office-building' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
              style={[
                      styles.filterOption,
                      filterBy === option.key && styles.filterOptionActive
              ]}
                    onPress={() => handleFilterChange(option.key)}
            >
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={16} 
                      color={filterBy === option.key ? '#ffffff' : '#6b7280'} 
                      style={styles.filterOptionIcon}
                    />
              <Text style={[
                      styles.filterOptionText,
                      filterBy === option.key && styles.filterOptionTextActive
              ]}>
                      {option.label}
              </Text>
            </TouchableOpacity>
          ))}
              </View>
        </View>
        
          {/* Shelf Location Filter */}
            <View style={styles.filterGroup}>
              <View style={styles.filterGroupHeader}>
                <Text style={styles.filterGroupTitle}>Shelf Location</Text>
              <TouchableOpacity
                onPress={() => setLocationCollapsed(!locationCollapsed)}
                  style={styles.collapseToggle}
              >
                  <Text style={styles.collapseToggleText}>
                    {locationCollapsed ? 'Show' : 'Hide'}
                  </Text>
              </TouchableOpacity>
            </View>
            {!locationCollapsed && (
              <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      !selectedShelfLocation && styles.filterOptionActive
                    ]}
                    onPress={() => handleShelfLocationFilter(null)}
                  >
                    <MaterialCommunityIcons 
                      name="map-marker" 
                      size={16} 
                      color={!selectedShelfLocation ? '#ffffff' : '#6b7280'} 
                      style={styles.filterOptionIcon}
                    />
                    <Text style={[
                      styles.filterOptionText,
                      !selectedShelfLocation && styles.filterOptionTextActive
                    ]}>
                      All Locations
                    </Text>
                  </TouchableOpacity>
                {SHELF_LOCATIONS.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                        styles.filterOption,
                        selectedShelfLocation === location.id && styles.filterOptionActive
                    ]}
                    onPress={() => handleShelfLocationFilter(location.id)}
                  >
                      <MaterialCommunityIcons 
                        name="bookshelf" 
                        size={16} 
                        color={selectedShelfLocation === location.id ? '#ffffff' : '#6b7280'} 
                        style={styles.filterOptionIcon}
                      />
                    <Text style={[
                        styles.filterOptionText,
                        selectedShelfLocation === location.id && styles.filterOptionTextActive
                    ]}>
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Course Program Filter */}
            <View style={styles.filterGroup}>
              <View style={styles.filterGroupHeader}>
                <Text style={styles.filterGroupTitle}>Course Program</Text>
              <TouchableOpacity
                onPress={() => setProgramCollapsed(!programCollapsed)}
                  style={styles.collapseToggle}
              >
                  <Text style={styles.collapseToggleText}>
                    {programCollapsed ? 'Show' : 'Hide'}
                  </Text>
              </TouchableOpacity>
            </View>
            {!programCollapsed && (
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                      styles.filterOption,
                      !selectedCourseProgram && styles.filterOptionActive
                  ]}
                  onPress={() => handleCourseProgramFilter(null)}
                >
                    <MaterialCommunityIcons 
                      name="school" 
                      size={16} 
                      color={!selectedCourseProgram ? '#ffffff' : '#6b7280'} 
                      style={styles.filterOptionIcon}
                    />
                  <Text style={[
                      styles.filterOptionText,
                      !selectedCourseProgram && styles.filterOptionTextActive
                  ]}>
                    All Programs
                  </Text>
                </TouchableOpacity>
                {COURSE_PROGRAMS.map(program => (
                  <TouchableOpacity
                    key={program.id}
                    style={[
                        styles.filterOption,
                        selectedCourseProgram === program.id && styles.filterOptionActive
                    ]}
                    onPress={() => handleCourseProgramFilter(program.id)}
                  >
                      <MaterialCommunityIcons 
                        name="book-education" 
                        size={16} 
                        color={selectedCourseProgram === program.id ? '#ffffff' : '#6b7280'} 
                        style={styles.filterOptionIcon}
                      />
                    <Text style={[
                        styles.filterOptionText,
                        selectedCourseProgram === program.id && styles.filterOptionTextActive
                    ]}>
                      {program.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

            {/* Clear All Filters */}
            {(selectedShelfLocation || selectedCourseProgram || search.trim()) && (
              <TouchableOpacity 
                style={styles.clearAllButton} 
                onPress={clearAllFilters}
              >
                <Text style={styles.clearAllButtonText}>🗑️ Clear All Filters</Text>
              </TouchableOpacity>
            )}
        </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Book Catalog Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          {/* Show specific instructions for CORS errors */}
          {error.includes('CORS') && (
            <View style={styles.corsHelpContainer}>
              <Text style={styles.corsHelpTitle}>🔧 Backend Team Action Required:</Text>
              <Text style={styles.corsHelpText}>
                1. Configure CORS to allow localhost:8081{'\n'}
                2. See BACKEND_CRITICAL_FIXES.md for details{'\n'}
                3. Test with the "Test API" button below
              </Text>
            </View>
          )}
          
          <View style={styles.errorButtons}>
          <TouchableOpacity
            style={styles.retryButton} 
              onPress={() => loadBooks(true)}
            >
              <Text style={styles.retryButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.debugButton} 
              onPress={testApiConnection}
            >
              <Text style={styles.debugButtonText}>🧪 Test API</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton} 
              onPress={() => {
                setError(null);
                setSearch('');
                setFilterBy('title');
                setSelectedShelfLocation(null);
                setSelectedCourseProgram(null);
                loadBooks(true);
              }}
            >
              <Text style={styles.clearButtonText}>🧹 Clear All</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Books List */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item, index) => `book_${item.id || 'unknown'}_${index}`}
        renderItem={renderBookItem}
        ListFooterComponent={renderFooter}
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
        keyboardShouldPersistTaps="handled"
      />

      {/* Borrow Request Modal */}
      <BorrowRequestModal
        visible={showBorrowModal}
        onClose={() => {
          setShowBorrowModal(false);
          setSelectedBook(null);
        }}
        book={selectedBook}
        onSuccess={handleBorrowRequestSuccess}
        onAlreadyBorrowed={() => {
          // Navigate to My Books or simply notify
          Alert.alert('Already Borrowed', 'This book is already in your borrowed list.');
        }}
        onDuplicateRequest={(copyId) => {
          if (!copyId) return;
          setPendingCopyIds(prev => {
            if (prev.has(copyId)) return prev;
            const next = new Set(prev);
            next.add(copyId);
            savePendingCopyIds(next);
            return next;
          });
          Alert.alert('Request Pending', 'You already have a pending borrow request for this book.', [
            { text: 'View My Requests', onPress: () => router.push('/borrowing/my-requests') },
            { text: 'OK' }
          ]);
        }}
      />
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

  // Search Section
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  
  // Main Search Container
  mainSearchContainer: {
    marginBottom: 16
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12
  },
  mainSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 8
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsCounter: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  searchResultsText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '600',
  },

  // Filter Toggle
  filterToggleButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterToggleText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },

  // Filters Panel
  filtersPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },

  // Filter Groups
  filterGroup: {
    marginBottom: 20
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151'
  },
  collapseToggle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  collapseToggleText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600'
  },

  // Filter Options
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterOptionIcon: {
    marginRight: 8
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  filterOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },

  // Clear All Button
  clearAllButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8
  },
  clearAllButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },

  // Error Container
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center'
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24
  },
  corsHelpContainer: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%'
  },
  corsHelpTitle: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8
  },
  corsHelpText: {
    color: '#b45309',
    fontSize: 12,
    lineHeight: 18
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12
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
  debugButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6
  },
  debugButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  clearButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    color: '#64748b',
    marginTop: 8,
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

  // List Container
  listContainer: {
    padding: 20,
    paddingBottom: 40
  },

  // Book Card
  bookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#eef2ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730a3',
  },
  ddcBadge: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  ddcBadgeText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  shelfLocationBadge: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0288d1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shelfLocationText: {
    color: '#0277bd',
    fontSize: 11,
    fontWeight: '600',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: '#dcfce7',
  },
  unavailableBadge: {
    backgroundColor: '#fee2e2',
  },
  availabilityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bookDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minWidth: '30%',
  },
  bookDetailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  courseProgramSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseProgramText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
    marginLeft: 4,
  },
  availabilityInfo: {
    marginBottom: 16,
  },
  availabilityInfoText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  borrowedPill: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999
  },
  borrowedPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    color: '#64748b',
    marginTop: 8,
    fontSize: 14
  },
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
    lineHeight: 24,
    marginBottom: 16
  },
  clearFiltersButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  clearFiltersText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },

  // Enhanced Book Information Styles
  enhancedInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8
  },
  shelfLocationBadge: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0288d1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  shelfLocationText: {
    color: '#0277bd',
    fontSize: 11,
    fontWeight: '600'
  },
  borrowableBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  borrowableBadgeActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 1
  },
  borrowableBadgeReference: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
    borderWidth: 1
  },
  borrowableText: {
    fontSize: 11,
    fontWeight: '600'
  },
  borrowableTextActive: {
    color: '#15803d'
  },
  borrowableTextReference: {
    color: '#b45309'
  },
  courseProgramText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
    marginBottom: 4
  },
  callNumberText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8
  },

  // Advanced Filter Toggle
  advancedFilterToggle: {
    marginBottom: 8
  },
  advancedFilterButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  advancedFilterButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600'
  },

  // Advanced Filter Container
  advancedFilterContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterSection: {
    marginBottom: 16
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  collapseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  collapseButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600'
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  enhancedFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  enhancedFilterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  enhancedFilterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500'
  },
  enhancedFilterTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  clearAllFiltersButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  clearAllFiltersText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },

  // Book Actions
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  primaryActionButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  pendingActionButton: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  borrowedActionButton: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 6,
  },
  primaryActionButtonText: {
    color: '#ffffff',
  },
  pendingActionButtonText: {
    color: '#ffffff',
  },
  borrowedActionButtonText: {
    color: '#ffffff',
  },
});

export default BookCatalogScreen;