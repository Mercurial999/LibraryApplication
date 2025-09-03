import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const { width } = Dimensions.get('window');

const BookDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedCopyId, setSelectedCopyId] = useState(null);
  const router = useRouter();

  // Helper function for severity colors
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'IMPROVEMENT': return '#10B981'; // Green
      case 'DETERIORATION': return '#EF4444'; // Red
      case 'MAINTENANCE': return '#F59E0B'; // Yellow
      default: return '#6B7280'; // Gray
    }
  };

  // Helpers for copy status rendering (backend may return uppercase statuses)
  const getCopyStatusStyle = (rawStatus) => {
    const status = String(rawStatus || 'UNKNOWN').toUpperCase();
    switch (status) {
      case 'AVAILABLE':
        return styles.copyAvailable;
      case 'BORROWED':
        return styles.copyBorrowed;
      case 'RESERVED':
        return styles.copyReserved;
      case 'DAMAGED':
        return styles.copyDamaged;
      case 'LOST':
        return styles.copyLost;
      case 'MAINTENANCE':
        return styles.copyMaintenance || styles.copyUnknown;
      default:
        return styles.copyUnknown;
    }
  };

  const getCopyStatusLabel = (rawStatus) => {
    const status = String(rawStatus || 'UNKNOWN').toUpperCase();
    switch (status) {
      case 'AVAILABLE': return 'Available';
      case 'BORROWED': return 'Borrowed';
      case 'RESERVED': return 'Reserved';
      case 'DAMAGED': return 'Damaged';
      case 'LOST': return 'Lost';
      case 'MAINTENANCE': return 'Maintenance';
      default: return 'Unknown';
    }
  };

  useEffect(() => {
    const initializeScreen = async () => {
      // Load auth token from storage
      await ApiService.loadAuthToken();
      // Load book details
      loadBookDetails();
    };
    
    initializeScreen();
  }, [id]);

  const loadBookDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading book details for ID:', id);
      console.log('ID type:', typeof id);
      console.log('Auth token available:', !!ApiService.authToken);
      if (ApiService.authToken) {
        console.log('Token preview:', ApiService.authToken.substring(0, 30) + '...');
      }
      
      // Clear cache and force fresh load
      ApiService.clearCatalogCache();
      
      const response = await ApiService.getBookDetails(id);
      console.log('API Response:', response);
      
      // Handle different response structures from backend
      let bookData = null;
      
      if (response.success && response.data) {
        bookData = response.data;
      } else if (response.data) {
        // Backend might return data directly without success wrapper
        bookData = response.data;
      } else if (response.id) {
        // Backend might return book object directly
        bookData = response;
      } else {
        console.error('Unexpected response structure:', response);
        setError('Invalid response format from server');
        return;
      }
      
      console.log('Processed book data:', bookData);
      setBook(bookData);
      
    } catch (err) {
      console.error('Error loading book details:', err);
      setError(err.message || 'Unable to load book details');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowBook = () => {
    if (!selectedCopyId) {
      Alert.alert(
        'Select a Copy',
        'Please select a specific copy to borrow before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Navigate to borrow screen with selected copyId
    router.push({
      pathname: '/borrowing/borrow',
      params: { 
        bookId: id,
        copyId: selectedCopyId
      }
    });
  };

  const handleCopySelection = (copyId) => {
    setSelectedCopyId(copyId);
  };

  const handleReserveBook = () => {
    // Navigate to reserve screen with book details
    router.push({
      pathname: '/borrowing/reserve',
      params: { bookId: id }
    });
  };

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
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error Loading Book</Text>
        <Text style={styles.errorText}>{error}</Text>
        
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={loadBookDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundIcon}>📚</Text>
        <Text style={styles.notFoundTitle}>Book Not Found</Text>
        <Text style={styles.notFoundText}>The book you're looking for doesn't exist.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title={book.title}
        subtitle={`by ${book.author}`}
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/book-catalog/details"
      />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Book Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subject:</Text>
            <Text style={styles.detailValue}>{book.subject || 'Not specified'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DDC:</Text>
            <Text style={styles.detailValue}>{book.ddc || 'Not specified'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{book.location || 'Not specified'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ISBN:</Text>
            <Text style={styles.detailValue}>{book.isbn || 'Not specified'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Publisher:</Text>
            <Text style={styles.detailValue}>{book.publisher || 'Not specified'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Year:</Text>
            <Text style={styles.detailValue}>{book.publicationYear || 'Not specified'}</Text>
          </View>
          
          {/* Enhanced Book Information */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shelf Location:</Text>
            <View style={styles.enhancedValueContainer}>
              <Text style={styles.detailValue}>
                {book.shelfLocationPrefix || 'Fi'} - {book.getShelfLocationDisplay ? book.getShelfLocationDisplay() : 'College'}
              </Text>
              <View style={styles.shelfLocationBadge}>
                <Text style={styles.shelfLocationBadgeText}>
                  {book.shelfLocationPrefix || 'Fi'}
                </Text>
              </View>
            </View>
          </View>
          
          {book.courseProgram && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Course Program:</Text>
              <Text style={styles.detailValue}>{book.courseProgram}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Borrowable Status:</Text>
            <View style={[
              styles.borrowableStatusBadge,
              (book.isBorrowable !== false) ? styles.borrowableStatusActive : styles.borrowableStatusReference
            ]}>
              <Text style={[
                styles.borrowableStatusText,
                (book.isBorrowable !== false) ? styles.borrowableStatusTextActive : styles.borrowableStatusTextReference
              ]}>
                {(book.isBorrowable !== false) ? 'Borrowable' : 'Reference Only'}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Call Number:</Text>
            <Text style={styles.callNumberValue}>
              {book.shelfLocationPrefix || 'Fi'} {book.ddc || ''} {book.callNumber || ''} {book.year || book.publicationYear || ''}
            </Text>
          </View>
        </View>

        {/* Availability Section */}
        <View style={styles.availabilitySection}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.availabilityInfo}>
            <View style={[
              styles.availabilityBadge, 
              book.availableCopies > 0 ? styles.available : styles.unavailable
            ]}>
              <Text style={styles.availabilityText}>
                {book.availableCopies > 0 ? 'Available' : 'Unavailable'}
              </Text>
            </View>
            <Text style={styles.copiesText}>
              {book.availableCopies} of {book.totalCopies} copies available
            </Text>
          </View>
          
          {/* Individual Copy Statuses */}
          {book.copies && book.copies.length > 0 && (
            <View style={styles.copiesSection}>
              <Text style={styles.copiesTitle}>Copy Details:</Text>
              {book.copies.map((copy, index) => {
                const statusLabel = getCopyStatusLabel(copy.status);
                const statusStyle = getCopyStatusStyle(copy.status);
                const isAvailable = String(copy.status || '').toUpperCase() === 'AVAILABLE';
                const isSelected = selectedCopyId === copy.id;
                
                return (
                  <TouchableOpacity
                    key={copy.id || index}
                    style={[
                      styles.copyItem,
                      isAvailable && styles.copyItemSelectable,
                      isSelected && styles.copyItemSelected
                    ]}
                    onPress={() => isAvailable && handleCopySelection(copy.id)}
                    disabled={!isAvailable}
                  >
                    <View style={styles.copyHeader}>
                      <Text style={styles.copyId}>Copy #{copy.copyNumber || (index + 1)}</Text>
                      <View style={[styles.copyStatusBadge, statusStyle]}>
                        <Text style={styles.copyStatusText}>{statusLabel}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Text style={styles.selectedIndicatorText}>✓</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Meta details */}
                    <Text style={styles.copyMeta}>Location: {copy.location || 'Not specified'}</Text>
                    <Text style={styles.copyMeta}>Condition: {copy.condition || 'Unknown'}</Text>
                    
                    {String(copy.status || '').toUpperCase() === 'BORROWED' && (
                      <>
                        {copy.borrowedBy?.name && (
                          <Text style={styles.copySub}>Borrowed by: {copy.borrowedBy.name}</Text>
                        )}
                        {copy.dueDate && (
                          <Text style={styles.dueDate}>Due: {new Date(copy.dueDate).toLocaleDateString()}</Text>
                        )}
                      </>
                    )}
                    
                    {String(copy.status || '').toUpperCase() === 'RESERVED' && copy.reservedBy?.name && (
                      <Text style={styles.reservedBy}>Reserved by: {copy.reservedBy.name}</Text>
                    )}
                    
                    {!isAvailable && (
                      <Text style={styles.copyUnavailableText}>
                        {isAvailable ? 'Tap to select' : 'Not available for borrowing'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* NEW: Condition History Section */}
        <View style={styles.conditionHistorySection}>
          <Text style={styles.sectionTitle}>Condition History</Text>
          <Text style={styles.sectionSubtitle}>Track changes in book condition over time</Text>
          
          {/* Condition History List */}
          {book.conditionHistory && book.conditionHistory.length > 0 ? (
            <View style={styles.historyList}>
              {book.conditionHistory.map((change, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <View style={styles.conditionChange}>
                      <Text style={styles.conditionText}>
                        {change.previousCondition || 'Unknown'} → {change.newCondition}
                      </Text>
                      <Text style={styles.changeDate}>
                        {new Date(change.changeDate).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(change.severity) }
                    ]}>
                      <Text style={styles.severityText}>{change.severity || 'NORMAL'}</Text>
                    </View>
                  </View>
                  
                  {change.reason && (
                    <Text style={styles.changeReason}>{change.reason}</Text>
                  )}
                  
                  {change.librarianName && (
                    <Text style={styles.librarianName}>
                      By: {change.librarianName}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noHistoryContainer}>
              <Text style={styles.noHistoryText}>📚</Text>
              <Text style={styles.noHistoryTitle}>No condition history</Text>
              <Text style={styles.noHistorySubtitle}>
                This book hasn't had any condition changes recorded yet
      </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {book.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{book.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {book.availableCopies > 0 ? (
            <>
              {selectedCopyId ? (
                <TouchableOpacity 
                  style={styles.borrowButton} 
                  onPress={handleBorrowBook}
                >
                  <Text style={styles.borrowButtonText}>📚 Borrow Selected Copy</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.selectCopyMessage}>
                  <Text style={styles.selectCopyText}>Please select a copy to borrow</Text>
                  <Text style={styles.selectCopySubtext}>Tap on an available copy above</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.unavailableMessage}>
                <Text style={styles.unavailableText}>This book is currently unavailable</Text>
                <Text style={styles.unavailableSubtext}>All copies are borrowed, reserved, or unavailable</Text>
              </View>
              
              {/* Reserve Button for unavailable books */}
              <TouchableOpacity 
                style={styles.reserveButton} 
                onPress={handleReserveBook}
              >
                <Text style={styles.reserveButtonText}>🔖 Reserve This Book</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  notFoundIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  author: {
    fontSize: 20,
    color: '#666',
  },
  detailsSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  availabilitySection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  availabilityInfo: {
    alignItems: 'center',
  },
  availabilityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  available: {
    backgroundColor: '#e0f7fa',
    borderWidth: 1,
    borderColor: '#4db6ac',
  },
  unavailable: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  copiesText: {
    fontSize: 14,
    color: '#666',
  },
  copiesSection: {
    marginTop: 15,
  },
  copiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  copyItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyItemSelectable: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  copyItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
    borderWidth: 2,
  },
  copyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectedIndicator: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  copyUnavailableText: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
    marginTop: 4,
  },
  copyId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  copyStatusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  copyAvailable: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  copyBorrowed: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  copyReserved: {
    backgroundColor: '#e1f5fe',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  copyDamaged: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  copyLost: {
    backgroundColor: '#f3e5f5',
    borderWidth: 1,
    borderColor: '#ab47bc',
  },
  copyUnknown: {
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#9e9e9e',
  },
  copyStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  copyMeta: {
    fontSize: 14,
    color: '#444',
    marginTop: 6,
  },
  copySub: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  dueDate: {
    fontSize: 14,
    color: '#d32f2f',
    marginTop: 5,
  },
  reservedBy: {
    fontSize: 14,
    color: '#1976d2',
    marginTop: 5,
  },
  conditionHistorySection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  historyList: {
    // Add styles for the list if needed, e.g., padding, gap
  },
  historyItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conditionChange: {
    flex: 1,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  changeDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  severityBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  severityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  changeReason: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  librarianName: {
    fontSize: 14,
    color: '#1976d2',
    marginTop: 5,
  },
  noHistoryContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noHistoryText: {
    fontSize: 50,
    marginBottom: 10,
  },
  noHistoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  noHistorySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  descriptionSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  actionsSection: {
    marginTop: 20,
  },
  borrowButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reserveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  reserveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unavailableMessage: {
    backgroundColor: '#ffebee',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCopyMessage: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  selectCopyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  selectCopySubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 5,
  },
  unavailableSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Enhanced Book Information Styles
  enhancedValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shelfLocationBadge: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0288d1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  shelfLocationBadgeText: {
    color: '#0277bd',
    fontSize: 11,
    fontWeight: '600'
  },
  borrowableStatusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  borrowableStatusActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 1
  },
  borrowableStatusReference: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
    borderWidth: 1
  },
  borrowableStatusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  borrowableStatusTextActive: {
    color: '#15803d'
  },
  borrowableStatusTextReference: {
    color: '#b45309'
  },
  callNumberValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  }
});

export default BookDetailsScreen;