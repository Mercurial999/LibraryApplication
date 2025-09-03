import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { COURSE_PROGRAMS, SHELF_LOCATIONS } from '../../constants/BookConstants';
import ApiService from '../../services/ApiService';

const { width } = Dimensions.get('window');

const BookCatalogScreen = () => {
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('title');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Enhanced filter states
  const [selectedShelfLocation, setSelectedShelfLocation] = useState(null);
  const [selectedCourseProgram, setSelectedCourseProgram] = useState(null);
  // Collapsible filter sections
  const [locationCollapsed, setLocationCollapsed] = useState(false);
  const [programCollapsed, setProgramCollapsed] = useState(false);
  const router = useRouter();

  // Load books from backend
  const loadBooks = async (page = 1, isRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get ALL books at once - borrowers need to see everything available
      const response = await ApiService.getBooks({ 
        limit: 100, // Get all books - no pagination needed
        search: search || undefined,
        filterBy: filterBy || undefined,
        forceRefresh: isRefresh // Force refresh when pulling to refresh
      });
      
      if (response.success && response.data && response.data.books) {
        const allBooks = response.data.books;
        console.log(`📖 Loaded ${allBooks.length} books into catalog`);
        
        // Always set all books - no pagination for borrowers
        setBooks(allBooks);
        setHasMore(false); // No more pages needed
        setCurrentPage(1);
      } else {
        console.log('❌ No books data in response');
        setBooks([]);
      }
    } catch (err) {
      console.error('❌ Error loading books:', err);
      setError(err.message);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  // Search and filter books
  const handleSearch = () => {
    setCurrentPage(1);
    loadBooks(1, true);
  };

  // Refresh books
  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadBooks(1, true);
  };

  // Handle book reservation/request actions
  const handleRequestBorrow = async (bookId) => {
    try {
      console.log('Requesting to borrow book:', bookId);
      
      // Get current user ID
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to request books');
        return;
      }

      // Calculate expected return date (3 days from now)
      const expectedReturnDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const response = await fetch(
        `${ApiService.API_BASE}/api/mobile/users/${userId}/books/${bookId}/reserve`,
        {
          method: "POST",
          headers: await ApiService.getAuthHeaders(),
          body: JSON.stringify({
            expectedReturnDate: expectedReturnDate.toISOString(),
            initialCondition: "EXCELLENT",
            conditionNotes: "Requested via mobile app",
          }),
        }
      );

      if (response.ok) {
        Alert.alert(
          'Success', 
          'Book reservation request submitted successfully!',
          [
            { text: 'View My Reservations', onPress: () => router.push('/borrowing/my-requests') },
            { text: 'Continue Browsing', onPress: () => {} }
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to submit reservation request');
      }
    } catch (error) {
      console.error('Error requesting book:', error);
      Alert.alert('Error', 'Failed to submit reservation request. Please try again.');
    }
  };

  const handleReserveBook = async (bookId) => {
    // Same implementation as handleRequestBorrow for now
    // Both actions create a reservation request
    await handleRequestBorrow(bookId);
  };

  // Initial load
  useEffect(() => {
    const initializeScreen = async () => {
      // Load auth token from storage
      await ApiService.loadAuthToken();
      
              // Clear cache to force fresh load
        ApiService.clearCatalogCache();
        console.log('Cache cleared - fetching fresh data from backend');
      
      // Test backend connectivity
      const backendReachable = await ApiService.testBackendConnectivity();
      console.log('Backend reachable:', backendReachable);
      
      // Test if book catalog endpoint is working
      const catalogWorking = await ApiService.testBookCatalog();
      console.log('Book catalog endpoint working:', catalogWorking);
      
      // Load books
      loadBooks(1, true);
    };
    
    initializeScreen();
  }, []);

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilterBy(newFilter);
    setCurrentPage(1);
    loadBooks(1, true);
  };

  // Handle shelf location filter
  const handleShelfLocationFilter = (locationId) => {
    setSelectedShelfLocation(selectedShelfLocation === locationId ? null : locationId);
  };

  // Handle course program filter
  const handleCourseProgramFilter = (programId) => {
    setSelectedCourseProgram(selectedCourseProgram === programId ? null : programId);
  };

  // Apply enhanced filters
  const applyEnhancedFilters = () => {
    let filtered = [...books];
    
    if (selectedShelfLocation) {
      filtered = filtered.filter(book => book.shelfLocationPrefix === selectedShelfLocation);
    }
    
    if (selectedCourseProgram) {
      filtered = filtered.filter(book => book.courseProgram === selectedCourseProgram);
    }
    
    setFilteredBooks(filtered);
  };

  // Apply filters whenever books or filter states change
  useEffect(() => {
    applyEnhancedFilters();
  }, [books, selectedShelfLocation, selectedCourseProgram]);

  // Render book item
  const renderBookItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => {
        console.log('=== Book Tap Debug ===');
        console.log('Tapped book:', item.title);
        console.log('Book ID:', item.id);
        console.log('Book ID type:', typeof item.id);
        router.push({ 
          pathname: '/book-catalog/details', 
          params: { id: item.id } 
        });
      }}
    >
      {/* Book cover */}
      <View style={styles.bookCover}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.placeholderCover}>
            <Text style={styles.placeholderText}>📚</Text>
          </View>
        )}
      </View>

      {/* Book info */}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          {item.author}
        </Text>
        <Text style={styles.bookSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        
        {/* Enhanced Book Information */}
        <View style={styles.enhancedInfo}>
          {/* Shelf Location Badge */}
          <View style={styles.shelfLocationBadge}>
            <Text style={styles.shelfLocationText}>
              {item.shelfLocationPrefix || 'Fi'}
            </Text>
          </View>
          
          {/* Borrowable Status Badge */}
          <View style={[
            styles.borrowableBadge,
            (item.isBorrowable !== false) ? styles.borrowableBadgeActive : styles.borrowableBadgeReference
          ]}>
            <Text style={[
              styles.borrowableText,
              (item.isBorrowable !== false) ? styles.borrowableTextActive : styles.borrowableTextReference
            ]}>
              {(item.isBorrowable !== false) ? 'Borrowable' : 'Reference Only'}
            </Text>
          </View>
        </View>
        
        {/* Course Program */}
        {item.courseProgram && (
          <Text style={styles.courseProgramText}>
            Program: {item.courseProgram}
          </Text>
        )}
        
        {/* Full Call Number */}
        <Text style={styles.callNumberText}>
          {item.shelfLocationPrefix || 'Fi'} {item.ddc || ''} {item.callNumber || ''} {item.year || ''}
        </Text>
        
        {/* Availability badge */}
        <View style={[
          styles.availabilityBadge,
          (item.availableCopies > 0) ? styles.availableBadge : styles.unavailableBadge
        ]}>
          <Text style={[
            styles.availabilityText,
            (item.availableCopies > 0) ? styles.availableText : styles.unavailableText
          ]}>
            {item.availableCopies > 0 
              ? `${item.availableCopies} copy${item.availableCopies === 1 ? '' : 'ies'} available`
              : 'No copies available'
            }
          </Text>
        </View>
        
        {/* Total copies info */}
        <Text style={styles.copiesInfo}>
          Total copies: {item.totalCopies || 0}
        </Text>
        
        {/* Action Buttons - Request/Reserve instead of direct borrow */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => handleRequestBorrow(item.id)}
          >
            <Text style={styles.requestButtonText}>Request to Borrow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reserveButton}
            onPress={() => handleReserveBook(item.id)}
          >
            <Text style={styles.reserveButtonText}>Reserve Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>No books found</Text>
        <Text style={styles.emptySubtitle}>
          {search.trim() 
            ? `No books match "${search}"` 
            : 'Try adjusting your search or filters'
          }
        </Text>
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
        <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
            placeholder="Search for books..."
          value={search}
          onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {['title', 'author', 'subject', 'ddc'].map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterButton, 
                filterBy === key && styles.filterButtonActive
              ]}
              onPress={() => handleFilterChange(key)}
            >
              <Text style={[
                styles.filterText, 
                filterBy === key && styles.filterTextActive
              ]}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Enhanced Filter Options */}
        <View style={styles.enhancedFilterContainer}>
          {/* Shelf Location Filter */}
          <View style={styles.filterRow}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterLabel}>Location:</Text>
              <TouchableOpacity
                onPress={() => setLocationCollapsed(!locationCollapsed)}
                style={styles.collapseButton}
              >
                <Text style={styles.collapseButtonText}>{locationCollapsed ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
            {!locationCollapsed && (
              <View style={styles.filterOptions}>
                {SHELF_LOCATIONS.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.enhancedFilterButton,
                      selectedShelfLocation === location.id && styles.enhancedFilterButtonActive
                    ]}
                    onPress={() => handleShelfLocationFilter(location.id)}
                  >
                    <Text style={[
                      styles.enhancedFilterText,
                      selectedShelfLocation === location.id && styles.enhancedFilterTextActive
                    ]}>
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Course Program Filter */}
          <View style={styles.filterRow}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterLabel}>Program:</Text>
              <TouchableOpacity
                onPress={() => setProgramCollapsed(!programCollapsed)}
                style={styles.collapseButton}
              >
                <Text style={styles.collapseButtonText}>{programCollapsed ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
            {!programCollapsed && (
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.enhancedFilterButton,
                    !selectedCourseProgram && styles.enhancedFilterButtonActive
                  ]}
                  onPress={() => handleCourseProgramFilter(null)}
                >
                  <Text style={[
                    styles.enhancedFilterText,
                    !selectedCourseProgram && styles.enhancedFilterTextActive
                  ]}>
                    All Programs
                  </Text>
                </TouchableOpacity>
                {COURSE_PROGRAMS.map(program => (
                  <TouchableOpacity
                    key={program.id}
                    style={[
                      styles.enhancedFilterButton,
                      selectedCourseProgram === program.id && styles.enhancedFilterButtonActive
                    ]}
                    onPress={() => handleCourseProgramFilter(program.id)}
                  >
                    <Text style={[
                      styles.enhancedFilterText,
                      selectedCourseProgram === program.id && styles.enhancedFilterTextActive
                    ]}>
                      {program.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity
            style={styles.retryButton} 
            onPress={() => loadBooks(1, true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Books List */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item, index) => {
          // Use a more stable key that won't cause re-rendering issues
          const key = `book_${item.id || 'unknown'}_${index}`;
          return key;
        }}
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
        // Add these props to improve performance and debugging
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        onEndReachedThreshold={0.5}
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
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16
  },
  searchInput: { 
    flex: 1,
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 12, 
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff'
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButtonText: {
    fontSize: 18,
    color: '#ffffff'
  },
  filterContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  filterButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterButtonActive: { 
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  filterText: { 
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  },
  filterTextActive: { 
    color: '#ffffff',
    fontWeight: '600'
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row', // Added for cover and info layout
    alignItems: 'center' // Align items for cover and info
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9'
  },
  placeholderText: {
    fontSize: 40,
    color: '#64748b'
  },
  bookInfo: {
    flex: 1,
    paddingVertical: 10
  },
  bookTitle: { 
    fontWeight: '700', 
    fontSize: 18,
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24
  },
  bookAuthor: { 
    color: '#64748b',
    fontSize: 16,
    marginBottom: 4
  },
  bookSubject: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 12
  },
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  bookLocation: {
    color: '#64748b',
    fontSize: 12
  },
  bookDdc: {
    color: '#64748b',
    fontSize: 12
  },
  bookStatus: {
    alignItems: 'flex-end'
  },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8
  },
  availableBadge: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
    borderWidth: 1
  },
  unavailableBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600'
  },
  availableText: {
    color: '#065f46'
  },
  unavailableText: {
    color: '#991b1b'
  },
  copiesInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
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
    lineHeight: 24
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

  // Enhanced Filter Styles
  enhancedFilterContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  filterRow: {
    marginBottom: 12
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  collapseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
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
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
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

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8
  },
  requestButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  requestButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  reserveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  reserveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default BookCatalogScreen;