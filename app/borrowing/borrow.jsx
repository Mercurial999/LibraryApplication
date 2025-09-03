import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ConditionAssessment from '../../components/ConditionAssessment';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const BorrowScreen = () => {
  const { bookId, copyId } = useLocalSearchParams();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [book, setBook] = useState(null);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const router = useRouter();

  // Load book details
  useEffect(() => {
    if (bookId) {
      loadBookDetails();
    }
  }, [bookId]);

  const loadBookDetails = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBookById(bookId);
      
      if (response.success && response.data) {
        setBook(response.data);
        
        // If copyId is provided, find and set the selected copy
        if (copyId && response.data.copies) {
          const copy = response.data.copies.find(c => c.id === copyId);
          if (copy) {
            setSelectedCopy(copy);
          } else {
            Alert.alert('Error', 'Selected copy not found. Please try again.');
            router.back();
          }
        }
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

  const handleBorrow = () => {
    if (!book) return;
    
    // Check if copy is selected
    if (!selectedCopy) {
      Alert.alert('No Copy Selected', 'Please select a copy to borrow.');
      return;
    }
    
    // Check if selected copy is available
    if (selectedCopy.status !== 'AVAILABLE') {
      Alert.alert('Copy Unavailable', 'The selected copy is not available for borrowing.');
      return;
    }

    // Show condition assessment modal
    setConditionModalVisible(true);
  };

  const handleConditionSubmit = async (conditionData) => {
    try {
      setBorrowing(true);
      
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

      // Instead of direct borrow, create a reservation (borrow request) for librarian processing
      const response = await ApiService.reserveBook(userId, bookId, {
        expectedReturnDate: expectedReturnDate.toISOString()
      });

      if (response.success) {
        Alert.alert(
          'Borrow Request Submitted',
          `Your request to borrow "${book.title}" has been submitted and is pending librarian approval.`,
          [
            {
              text: 'View My Requests',
              onPress: () => router.replace('/borrowing/my-requests')
            },
            {
              text: 'Back to Book',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to submit borrow request');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to borrow book');
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Book Not Found</Text>
        <Text style={styles.errorText}>The book you're trying to borrow doesn't exist.</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="Borrow Book"
        subtitle={`Borrowing: ${book.title}`}
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/borrowing/borrow"
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
            </View>
          </View>
        </View>

        {/* Selected Copy Information */}
        {selectedCopy && (
          <View style={styles.copySection}>
            <Text style={styles.sectionTitle}>Selected Copy</Text>
            
            <View style={styles.copyCard}>
              <View style={styles.copyHeader}>
                <Text style={styles.copyTitle}>Copy #{selectedCopy.copyNumber}</Text>
                <View style={styles.copyStatusBadge}>
                  <Text style={styles.copyStatusText}>Available</Text>
                </View>
              </View>
              
              <View style={styles.copyDetails}>
                <Text style={styles.copyDetail}>Location: {selectedCopy.location || 'Not specified'}</Text>
                <Text style={styles.copyDetail}>Condition: {selectedCopy.condition || 'Unknown'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Borrowing Information */}
        <View style={styles.borrowingSection}>
          <Text style={styles.sectionTitle}>Borrowing Details</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📅 Loan Period</Text>
            <Text style={styles.infoText}>30 days from borrowing date</Text>
            
            <Text style={styles.infoTitle}>⏰ Due Date</Text>
            <Text style={styles.infoText}>
              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </Text>
            
            <Text style={styles.infoTitle}>📋 Requirements</Text>
            <Text style={styles.infoText}>• Valid library account</Text>
            <Text style={styles.infoText}>• No overdue books</Text>
            <Text style={styles.infoText}>• Condition assessment required</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {selectedCopy ? (
            <TouchableOpacity 
              style={styles.borrowButton} 
              onPress={handleBorrow}
              disabled={borrowing}
            >
              {borrowing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.borrowButtonText}>📚 Borrow Selected Copy</Text>
              )}
            </TouchableOpacity>
          ) : book.availableCopies > 0 ? (
            <View style={styles.selectCopyMessage}>
              <Text style={styles.selectCopyText}>Please select a copy to borrow</Text>
              <Text style={styles.selectCopySubtext}>Go back to book details to select a copy</Text>
            </View>
          ) : (
            <View style={styles.unavailableMessage}>
              <Text style={styles.unavailableText}>This book is currently unavailable</Text>
              <Text style={styles.unavailableSubtext}>All copies are borrowed, reserved, or unavailable</Text>
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

      {/* Condition Assessment Modal */}
      <ConditionAssessment
        visible={conditionModalVisible}
        onClose={() => setConditionModalVisible(false)}
        onSubmit={handleConditionSubmit}
        title="Borrow Request - Condition Review"
        submitText="Submit Request"
        isReturn={false}
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
  },
  copySection: {
    padding: 20,
    paddingTop: 0,
  },
  copyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  copyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  copyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  copyStatusBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  copyStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  copyDetails: {
    marginTop: 8,
  },
  copyDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  borrowingSection: {
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
  borrowButton: {
    backgroundColor: '#10b981',
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
  borrowButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  unavailableMessage: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectCopyMessage: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectCopyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  selectCopySubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  unavailableSubtext: {
    fontSize: 14,
    color: '#ef4444',
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

export default BorrowScreen;
