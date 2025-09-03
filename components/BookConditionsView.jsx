import React from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const BookConditionsView = ({ 
  visible, 
  onClose, 
  onSubmit, 
  title = "Book Conditions", 
  submitText = "Reserve Book",
  book,
  loading = false
}) => {
  if (!book) return null;

  const handleSubmit = () => {
    onSubmit && onSubmit();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Book Information */}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>by {book.author}</Text>
            </View>

            {/* Copy Information */}
            {book.copies && book.copies.length > 0 && (
              <View style={styles.copiesSection}>
                <Text style={styles.sectionTitle}>Copy Details</Text>
                {book.copies.map((copy, index) => (
                  <View key={copy.id || index} style={styles.copyItem}>
                    <View style={styles.copyHeader}>
                      <Text style={styles.copyNumber}>Copy #{copy.copyNumber || (index + 1)}</Text>
                      <View style={[
                        styles.statusBadge,
                        copy.status === 'AVAILABLE' ? styles.availableBadge :
                        copy.status === 'BORROWED' ? styles.borrowedBadge :
                        copy.status === 'RESERVED' ? styles.reservedBadge :
                        styles.unavailableBadge
                      ]}>
                        <Text style={styles.statusText}>{copy.status || 'Unknown'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.copyDetails}>
                      <Text style={styles.detailText}>Location: {copy.location || 'Not specified'}</Text>
                      <Text style={styles.detailText}>Condition: {copy.condition || 'Unknown'}</Text>
                      
                      {copy.status === 'BORROWED' && copy.borrowedBy && (
                        <Text style={styles.detailText}>Borrowed by: {copy.borrowedBy.name}</Text>
                      )}
                      
                      {copy.status === 'BORROWED' && copy.dueDate && (
                        <Text style={styles.detailText}>Due: {new Date(copy.dueDate).toLocaleDateString()}</Text>
                      )}
                      
                      {copy.status === 'RESERVED' && copy.reservedBy && (
                        <Text style={styles.detailText}>Reserved by: {copy.reservedBy.name}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Condition History */}
            {book.conditionHistory && book.conditionHistory.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Condition History</Text>
                {book.conditionHistory.map((change, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.conditionChange}>
                        {change.previousCondition || 'Unknown'} → {change.newCondition}
                      </Text>
                      <Text style={styles.changeDate}>
                        {new Date(change.changeDate).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    {change.reason && (
                      <Text style={styles.changeReason}>{change.reason}</Text>
                    )}
                    
                    {change.librarianName && (
                      <Text style={styles.librarianName}>By: {change.librarianName}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Reservation Information */}
            <View style={styles.reservationInfo}>
              <Text style={styles.sectionTitle}>Reservation Details</Text>
              <Text style={styles.infoText}>• You will be notified when the book becomes available</Text>
              <Text style={styles.infoText}>• Reservation is valid for 30 days</Text>
              <Text style={styles.infoText}>• Book condition will be assessed by library staff</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : submitText}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  bookInfo: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  copiesSection: {
    marginBottom: 20,
  },
  copyItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  copyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  borrowedBadge: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  reservedBadge: {
    backgroundColor: '#e1f5fe',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  unavailableBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  copyDetails: {
    marginTop: 5,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  historySection: {
    marginBottom: 20,
  },
  historyItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conditionChange: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  changeDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  changeReason: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 3,
  },
  librarianName: {
    fontSize: 12,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  reservationInfo: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  infoText: {
    fontSize: 14,
    color: '#0c4a6e',
    marginBottom: 5,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookConditionsView;
