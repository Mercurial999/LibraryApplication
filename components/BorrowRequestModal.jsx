import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ApiService from '../services/ApiService';
import { handleErrorForUI } from '../utils/ErrorHandler';

const BorrowRequestModal = ({ visible, onClose, book, selectedCopy, onSuccess }) => {
  const [requestNotes, setRequestNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate return date - automatically 3 days from now
  const getReturnDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Initialize when modal opens
  React.useEffect(() => {
    if (visible) {
      setRequestNotes('');
    }
  }, [visible]);

  const submitBorrowRequest = async () => {
    if (!selectedCopy) {
      Alert.alert('Error', 'Please select a copy to borrow');
      return;
    }

    setLoading(true);
    try {
      const returnDate = getReturnDate();
      console.log('📝 Submitting borrow request with data:', {
        bookId: book.id,
        copyId: selectedCopy.id,
        expectedReturnDate: new Date(returnDate).toISOString(),
        initialCondition: 'GOOD',
        conditionNotes: 'Book condition assessed by librarian',
        requestNotes: requestNotes.trim() || 'Borrow request via mobile app'
      });

      const response = await ApiService.createBorrowRequest(book.id, {
        copyId: selectedCopy.id,
        expectedReturnDate: new Date(returnDate).toISOString(),
        initialCondition: 'GOOD',
        conditionNotes: 'Book condition assessed by librarian',
        requestNotes: requestNotes.trim() || 'Borrow request via mobile app'
      });

      if (response.success) {
        console.log('📋 Borrow request success response:', response.data);
        Alert.alert(
          'Success!',
          `Your borrow request has been submitted successfully. The book must be returned by ${returnDate}. You will be notified when it's approved.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess(response.data);
                onClose();
              }
            }
          ]
        );
      } else {
        // Handle specific error types
        const errorCode = response.error?.code;
        const errorMessage = response.error?.message || 'Failed to submit borrow request';
        
        if (errorCode === 'BORROW_LIMIT') {
          Alert.alert(
            'Borrowing Limit Reached',
            'You have reached your maximum borrowing limit. Please return some books before requesting new ones.',
            [{ text: 'OK' }]
          );
        } else if (errorCode === 'BOOK_UNAVAILABLE') {
          Alert.alert(
            'Book Unavailable',
            'This book is no longer available for borrowing.',
            [{ text: 'OK' }]
          );
        } else if (errorCode === 'DUPLICATE_REQUEST' || errorMessage.includes('already requested') || errorMessage.includes('duplicate') || errorMessage.includes('pending borrow request')) {
          Alert.alert(
            'Request Already Submitted',
            'You have already submitted a borrow request for this book. Please wait for approval or check your requests.',
            [
              { text: 'OK' },
              { text: 'View My Requests', onPress: () => {
                onClose();
                // Navigate to requests page - you might need to pass router as prop
              }}
            ]
          );
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      handleErrorForUI(error, Alert.alert, 'Request Failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequestNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'web' ? 'fullScreen' : 'pageSheet'}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="book-plus" size={24} color="#3b82f6" />
            <Text style={styles.title}>Request to Borrow</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Book Info */}
          <View style={styles.bookInfo}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="book-open-variant" size={18} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Book Details</Text>
            </View>
            <Text style={styles.bookTitle}>{book?.title}</Text>
            <Text style={styles.bookAuthor}>by {book?.author}</Text>
            <View style={styles.bookMeta}>
              {book?.subject && (
                <View style={styles.metaBadge}>
                  <MaterialCommunityIcons name="tag" size={12} color="#3730a3" />
                  <Text style={styles.metaBadgeText}>{book.subject}</Text>
                </View>
              )}
              <View style={styles.metaBadge}>
                <MaterialCommunityIcons name="map-marker" size={12} color="#0277bd" />
                <Text style={styles.metaBadgeText}>{book?.shelfLocationPrefix || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Return Date Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Return Date</Text>
            </View>
            <View style={styles.dateCard}>
              <MaterialCommunityIcons name="calendar" size={20} color="#10b981" />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Must be returned by</Text>
                <Text style={styles.dateValue}>{getReturnDate()}</Text>
                <Text style={styles.dateHelpText}>
                  Books are automatically due in 3 days from borrowing date
                </Text>
              </View>
            </View>
          </View>

          {/* Selected Copy Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="barcode" size={18} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Selected Copy</Text>
            </View>
            {selectedCopy ? (
              <View style={styles.copyCard}>
                <MaterialCommunityIcons name="book" size={20} color="#3b82f6" />
                <View style={styles.copyDetails}>
                  <View style={styles.copyDetailItem}>
                    <MaterialCommunityIcons name="identifier" size={14} color="#6b7280" />
                    <Text style={styles.copyDetailText}>Copy: {selectedCopy.copyNumber}</Text>
                  </View>
                  <View style={styles.copyDetailItem}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#6b7280" />
                    <Text style={styles.copyDetailText}>Location: {selectedCopy.location}</Text>
                  </View>
                  <View style={styles.copyDetailItem}>
                    <MaterialCommunityIcons name="bookshelf" size={14} color="#6b7280" />
                    <Text style={styles.copyDetailText}>Shelf: {selectedCopy.shelfLocation}</Text>
                  </View>
                  <View style={styles.copyDetailItem}>
                    <MaterialCommunityIcons name="check-circle" size={14} color="#6b7280" />
                    <Text style={styles.copyDetailText}>Condition: {selectedCopy.condition}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noCopyCard}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#f59e0b" />
                <Text style={styles.noCopyText}>No copy selected</Text>
              </View>
            )}
          </View>

          {/* Request Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="note-text" size={18} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            </View>
            <View style={styles.notesInputContainer}>
              <TextInput
                style={styles.notesInput}
                value={requestNotes}
                onChangeText={setRequestNotes}
                placeholder="Why do you need this book? Any special requirements?"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={submitBorrowRequest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={16} color="#ffffff" />
                <Text style={styles.submitButtonText}>Submit Borrow Request</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    marginTop: 50, // Add top margin to avoid status bar overlap
  },
  webContainer: {
    marginTop: 0, // No margin needed on web
    paddingTop: 20, // Add padding instead
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 40
  },
  bookInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4
  },
  bookSubject: {
    fontSize: 14,
    color: '#94a3b8'
  },
  section: {
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  dateInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic'
  },
  
  // Date Info Styles
  dateInfoContainer: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 8,
    padding: 16,
    marginTop: 8
  },
  dateInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4
  },
  dateHelpText: {
    fontSize: 14,
    color: '#0369a1',
    fontStyle: 'italic'
  },
  
  // Copy Selection Styles
  copiesContainer: {
    gap: 8
  },
  copyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4
  },
  copyOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6'
  },
  copyIcon: {
    fontSize: 20,
    marginRight: 12
  },
  copyInfo: {
    flex: 1
  },
  copyNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2
  },
  copyNumberActive: {
    color: '#1d4ed8'
  },
  copyLocation: {
    fontSize: 14,
    color: '#6b7280'
  },
  copyLocationActive: {
    color: '#1e40af'
  },
  checkmark: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold'
  },
  noCopiesText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    fontStyle: 'italic'
  },

  // Selected Copy Display Styles
  selectedCopyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0ea5e9'
  },
  copyShelf: {
    fontSize: 14,
    color: '#0369a1',
    marginBottom: 2
  },
  copyCondition: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500'
  },
  noCopySelectedText: {
    fontSize: 14,
    color: '#dc2626',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },

  // New Modern Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  bookMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 4,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  dateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  copyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyDetails: {
    marginLeft: 12,
    flex: 1,
  },
  copyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  copyDetailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  noCopyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noCopyText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    fontWeight: '500',
  },
  notesInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 4,
  },
});

export default BorrowRequestModal;
