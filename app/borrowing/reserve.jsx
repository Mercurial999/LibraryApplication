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
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const BookReservationScreen = () => {
  const { bookId } = useLocalSearchParams();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const router = useRouter();

  // Load book details
  useEffect(() => {
    if (bookId) {
      loadBookDetails();
    } else {
      // If no specific book, load all available books for reservation
      loadAvailableBooks();
    }
  }, [bookId]);

  const loadBookDetails = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBookById(bookId);
      
      if (response.success && response.data) {
        setBook(response.data);
      } else {
        throw new Error('Failed to load book details');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load book details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBooks = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBooks();
      
      if (response.success && response.data) {
        // Filter books that have borrowed copies (can be reserved)
        const reservableBooks = response.data.books.filter(book => 
          book.totalCopies > 0 && book.availableCopies < book.totalCopies
        );
        setBook({ type: 'list', books: reservableBooks });
      } else {
        throw new Error('Failed to load books');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleReserveBook = (bookData, copyData = null) => {
    if (!bookData) return;
    
    // Check if book has borrowed copies that can be reserved
    if (bookData.availableCopies >= bookData.totalCopies) {
      Alert.alert('Book Available', 'This book has available copies. You can borrow it directly instead of reserving.');
      return;
    }

    setBook(bookData);
    setSelectedCopy(copyData);
    
    // Show book conditions for viewing (no condition assessment required)
    setConditionModalVisible(true);
  };

  const handleReserveSubmit = async () => {
    try {
      setReserving(true);
      
      // Get user ID from storage
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        throw new Error('User not logged in. Please log in again.');
      }
      
      const userData = JSON.parse(userDataString);
      const userId = userData.id;

      // Calculate expected return date (30 days from now)
      const expectedReturnDate = new Date();
      expectedReturnDate.setDate(expectedReturnDate.getDate() + 30);

      // Call reserve API without condition assessment (backend will handle it)
      const response = await ApiService.reserveBook(userId, book.id, {
        expectedReturnDate: expectedReturnDate.toISOString()
        // No condition assessment required - backend will handle it
      });

      if (response.success) {
        Alert.alert(
          'Book Reserved Successfully!',
          `You have reserved "${book.title}". You will be notified when it becomes available.`,
          [
            {
              text: 'View My Reservations',
              onPress: () => router.push('/borrowing/my-requests')
            },
            {
              text: 'Continue Browsing',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to reserve book');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reserve book');
    } finally {
      setReserving(false);
    }
  };

  const renderBookItem = ({ item }) => (
    <View style={styles.bookCard}>
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.bookAuthor}>by {item.author}</Text>
      
      <View style={styles.bookDetails}>
        <Text style={styles.detailText}>
          📚 Subject: {item.subject || 'Not specified'}
        </Text>
        <Text style={styles.detailText}>
          📍 DDC: {item.ddc || 'Not specified'}
        </Text>
        <Text style={styles.detailText}>
          🆔 ISBN: {item.isbn || 'Not specified'}
        </Text>
      </View>

      {/* Availability Status */}
      <View style={styles.availabilitySection}>
        <Text style={styles.availabilityTitle}>Availability:</Text>
        <View style={[
          styles.availabilityBadge,
          item.availableCopies > 0 ? styles.available : styles.unavailable
        ]}>
          <Text style={styles.availabilityText}>
            {item.availableCopies > 0 
              ? `${item.availableCopies} copy${item.availableCopies === 1 ? '' : 'ies'} available`
              : 'No copies available'
            }
          </Text>
        </View>
        <Text style={styles.totalCopies}>
          Total copies: {item.totalCopies || 0}
        </Text>
        <Text style={styles.borrowedCopies}>
          Borrowed copies: {(item.totalCopies || 0) - (item.availableCopies || 0)}
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity 
        style={[
          styles.reserveButton,
          item.availableCopies >= item.totalCopies && styles.reserveButtonDisabled
        ]} 
        onPress={() => handleReserveBook(item)}
        disabled={item.availableCopies >= item.totalCopies}
      >
        <Text style={styles.reserveButtonText}>
          {item.availableCopies >= item.totalCopies ? 'All Copies Available' : '🔖 Reserve This Book'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>No Books Found</Text>
        <Text style={styles.errorText}>No books are available for reservation at this time.</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If we have a specific book (from book details)
  if (book.id && !book.type) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <Header 
          title="Reserve Book"
          subtitle={`Reserving: ${book.title}`}
          onMenuPress={() => setSidebarVisible(true)}
        />

        {/* Sidebar */}
        <Sidebar 
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          currentRoute="/borrowing/reserve"
        />

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Book Information */}
          <View style={styles.bookSection}>
            <Text style={styles.sectionTitle}>Book Information</Text>
            
            <View style={styles.bookCard}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>by {book.author}</Text>
              
              <View style={styles.bookDetails}>
                <Text style={styles.detailText}>
                  📚 Subject: {book.subject || 'Not specified'}
                </Text>
                <Text style={styles.detailText}>
                  📍 DDC: {book.ddc || 'Not specified'}
                </Text>
                <Text style={styles.detailText}>
                  🆔 ISBN: {book.isbn || 'Not specified'}
                </Text>
              </View>

              {/* Availability Status */}
              <View style={styles.availabilitySection}>
                <Text style={styles.availabilityTitle}>Availability:</Text>
                <View style={[
                  styles.availabilityBadge,
                  book.availableCopies > 0 ? styles.available : styles.unavailable
                ]}>
                  <Text style={styles.availabilityText}>
                    {book.availableCopies > 0 
                      ? `${book.availableCopies} copy${book.availableCopies === 1 ? '' : 'ies'} available`
                      : 'No copies available'
                    }
                  </Text>
                </View>
                <Text style={styles.totalCopies}>
                  Total copies: {book.totalCopies || 0}
                </Text>
                <Text style={styles.borrowedCopies}>
                  Borrowed copies: {(book.totalCopies || 0) - (book.availableCopies || 0)}
                </Text>
              </View>

              {/* Copy Details */}
              {book.copies && book.copies.length > 0 && (
                <View style={styles.copiesSection}>
                  <Text style={styles.copiesTitle}>Copy Details:</Text>
                  {book.copies.map((copy, index) => (
                    <View key={copy.id || index} style={styles.copyItem}>
                      <Text style={styles.copyId}>Copy #{copy.copyNumber || (index + 1)}</Text>
                      <View style={[
                        styles.copyStatusBadge,
                        copy.status === 'available' ? styles.copyAvailable :
                        copy.status === 'borrowed' ? styles.copyBorrowed :
                        copy.status === 'reserved' ? styles.copyReserved :
                        copy.status === 'damaged' ? styles.copyDamaged :
                        copy.status === 'lost' ? styles.copyLost : styles.copyUnknown
                      ]}>
                        <Text style={styles.copyStatusText}>
                          {copy.status === 'available' ? 'Available' :
                           copy.status === 'borrowed' ? 'Borrowed' :
                           copy.status === 'reserved' ? 'Reserved' :
                           copy.status === 'damaged' ? 'Damaged' :
                           copy.status === 'lost' ? 'Lost' : 'Unknown'}
                        </Text>
                      </View>
                      {copy.status === 'borrowed' && copy.dueDate && (
                        <Text style={styles.dueDate}>Due: {copy.dueDate}</Text>
                      )}
                      {copy.status === 'reserved' && copy.reservedBy && (
                        <Text style={styles.reservedBy}>Reserved by: {copy.reservedBy}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Reservation Information */}
          <View style={styles.reservationSection}>
            <Text style={styles.sectionTitle}>Reservation Details</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>📅 Reservation Period</Text>
              <Text style={styles.infoText}>Until the book becomes available</Text>
              
              <Text style={styles.infoTitle}>🔔 Notification</Text>
              <Text style={styles.infoText}>You will be notified when the book is available</Text>
              
              <Text style={styles.infoTitle}>📋 Requirements</Text>
              <Text style={styles.infoText}>• Valid library account</Text>
              <Text style={styles.infoText}>• No overdue books</Text>
              <Text style={styles.infoText}>• Condition assessment required</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {book.availableCopies < book.totalCopies ? (
              <TouchableOpacity 
                style={styles.reserveButton} 
                onPress={() => handleReserveBook(book)}
                disabled={reserving}
              >
                {reserving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.reserveButtonText}>🔖 Reserve This Book</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.availableMessage}>
                <Text style={styles.availableText}>This book is currently available</Text>
                <Text style={styles.availableSubtext}>You can borrow it directly instead of reserving</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Book Conditions View Modal */}
        <BookConditionsView
          visible={conditionModalVisible}
          onClose={() => setConditionModalVisible(false)}
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
  return (
    <View style={styles.container}>
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
        currentRoute="/borrowing/reserve"
      />

      <FlatList
        data={book.books}
        renderItem={renderBookItem}
        keyExtractor={(item, index) => `book_${index}_${item.id || 'unknown'}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Available for Reservation</Text>
            <Text style={styles.headerSubtitle}>
              These books are currently borrowed but can be reserved
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No Books Available for Reservation</Text>
            <Text style={styles.emptyText}>
              All books are currently available for borrowing or have no borrowed copies.
            </Text>
          </View>
        }
      />

      {/* Book Conditions View Modal */}
      <BookConditionsView
        visible={conditionModalVisible}
        onClose={() => setConditionModalVisible(false)}
        onSubmit={handleReserveSubmit}
        title="Book Conditions & Reservation"
        submitText="Reserve Book"
        book={book}
        loading={reserving}
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
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  bookSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  bookCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 16,
  },
  bookDetails: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8,
  },
  availabilitySection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  availabilityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  available: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  unavailable: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  totalCopies: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  borrowedCopies: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  copiesSection: {
    marginTop: 20,
  },
  copiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  copyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  copyId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
    minWidth: 80,
  },
  copyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  copyAvailable: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  copyBorrowed: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  copyReserved: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  copyDamaged: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  copyLost: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  copyUnknown: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  copyStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dueDate: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 'auto',
  },
  reservedBy: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 'auto',
  },
  reservationSection: {
    padding: 20,
    paddingTop: 0,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  actionSection: {
    padding: 20,
    paddingTop: 0,
  },
  reserveButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reserveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  reserveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  availableMessage: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  availableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a',
    marginBottom: 4,
  },
  availableSubtext: {
    fontSize: 14,
    color: '#22c55e',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookReservationScreen;
