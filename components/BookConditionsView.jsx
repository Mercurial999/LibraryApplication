import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
  loading = false,
  onSelectCopy,
  selectedCopyId,
  filterBorrowedOnly = false,
  selectedCopyOnly = false
}) => {
  if (!book) return null;
  const [borrowersIndex, setBorrowersIndex] = useState({});

  useEffect(() => {
    const loadBorrowers = async () => {
      try {
        const { default: ApiService } = await import('../services/ApiService');
        const res = await fetch(`${ApiService.API_BASE}/api/mobile/books/${encodeURIComponent(book.id)}/borrowers`, {
          headers: await ApiService.getAuthHeaders(),
          method: 'GET'
        });
        const data = await res.json();
        const map = data?.data?.borrowersByCopyId || {};
        setBorrowersIndex(map);
      } catch (e) {
        setBorrowersIndex({});
      }
    };
    if (visible && book?.id) loadBorrowers();
  }, [visible, book?.id]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="bookmark-plus" size={20} color="#1f2937" />
              <Text style={[styles.title, { marginLeft: 8 }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Book Information */}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialCommunityIcons name="account" size={14} color="#6b7280" />
                <Text style={[styles.bookAuthor, { marginLeft: 6 }]}>by {book.author}</Text>
              </View>
            </View>

            {/* Copy Information */}
            {book.copies && book.copies.length > 0 && (
              <View style={styles.copiesSection}>
                {(() => {
                  const baseCopies = filterBorrowedOnly ? book.copies.filter(c => (c.status === 'borrowed' || c.status === 'BORROWED')) : book.copies;
                  const copies = selectedCopyOnly && selectedCopyId ? baseCopies.filter(c => c.id === selectedCopyId) : baseCopies;
                  return (
                    <>
                      <Text style={styles.sectionTitle}>📚 Copy Details ({copies.length}{selectedCopyOnly ? ' selected' : ' total'})</Text>
                      {copies.map((copy, index) => (
                  <TouchableOpacity key={copy.id || index} style={[styles.copyItem, selectedCopyId && (selectedCopyId === copy.id) && styles.copyItemSelected]} activeOpacity={onSelectCopy ? 0.8 : 1} onPress={() => onSelectCopy && onSelectCopy(copy)}>
                    <View style={styles.copyHeader}>
                      <Text style={styles.copyNumber}>
                        {copy.copyNumber || `Copy ${index + 1}`}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        copy.status === 'available' || copy.status === 'AVAILABLE' ? styles.availableBadge :
                        copy.status === 'borrowed' || copy.status === 'BORROWED' ? styles.borrowedBadge :
                        copy.status === 'reserved' || copy.status === 'RESERVED' ? styles.reservedBadge :
                        copy.status === 'damaged' || copy.status === 'DAMAGED' ? styles.damagedBadge :
                        copy.status === 'lost' || copy.status === 'LOST' ? styles.lostBadge :
                        styles.unavailableBadge
                      ]}>
                        <Text style={styles.statusText}>
                          {copy.status === 'available' || copy.status === 'AVAILABLE' ? 'Available' :
                           copy.status === 'borrowed' || copy.status === 'BORROWED' ? 'Borrowed' :
                           copy.status === 'reserved' || copy.status === 'RESERVED' ? 'Reserved' :
                           copy.status === 'damaged' || copy.status === 'DAMAGED' ? 'Damaged' :
                           copy.status === 'lost' || copy.status === 'LOST' ? 'Lost' :
                           'Unknown'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.copyDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#6b7280" />
                        <Text style={[styles.detailText, { marginLeft: 6 }]}>Shelf: {copy.shelfLocation || copy.location || 'Not specified'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <MaterialCommunityIcons name="magnify" size={14} color="#6b7280" />
                        <Text style={[styles.detailText, { marginLeft: 6 }]}>Condition: {copy.condition || 'Unknown'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <MaterialCommunityIcons name="identifier" size={14} color="#6b7280" />
                        <Text style={[styles.detailText, { marginLeft: 6 }]}>Copy ID: {copy.id || 'Not available'}</Text>
                      </View>
                      
                      {(copy.status === 'borrowed' || copy.status === 'BORROWED') && (
                        (() => {
                          const key = String(copy.id || copy.copyId || copy.copy_id || '');
                          const name = (copy.borrowedBy && (copy.borrowedBy.name || copy.borrowedBy)) || borrowersIndex[key];
                          return name ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <MaterialCommunityIcons name="account" size={14} color="#6b7280" />
                              <Text style={[styles.detailText, { marginLeft: 6 }]}>Borrowed by: {name}</Text>
                            </View>
                          ) : null;
                        })()
                      )}
                      
                      {(copy.status === 'borrowed' || copy.status === 'BORROWED') && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
                          <Text style={[styles.detailText, { marginLeft: 6 }]}>
                          {(() => {
                            const rawDue = copy.dueDate || copy.due_date || copy.expectedReturnDate || copy.expected_return_date || copy.borrowDueDate || (copy.borrowtransaction && copy.borrowtransaction.dueDate);
                            let dateObj;
                            if (rawDue) {
                              dateObj = new Date(rawDue);
                            } else {
                              dateObj = new Date();
                              dateObj.setDate(dateObj.getDate() + 30);
                            }
                              return `Due: ${dateObj.toLocaleDateString()}`;
                          })()}
                        </Text>
                        </View>
                      )}
                      
                      {(copy.status === 'reserved' || copy.status === 'RESERVED') && copy.reservedBy && (
                        <Text style={styles.detailText}>
                          👤 Reserved by: {copy.reservedBy.name || copy.reservedBy}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                    </>
                  );
                })()}
              </View>
            )}

            {/* Availability Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>📊 Availability Summary</Text>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  📖 Total Copies: {book.totalCopies || 0}
                </Text>
                <Text style={styles.summaryText}>
                  ✅ Available: {book.availableCopies || 0}
                </Text>
                <Text style={styles.summaryText}>
                  🔒 Borrowed: {(book.totalCopies || 0) - (book.availableCopies || 0)}
                </Text>
                <Text style={styles.summaryText}>
                  📚 Available for Reservation: {(book.totalCopies || 0) - (book.availableCopies || 0)}
                </Text>
              </View>
            </View>

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
    width: width * 0.95,
    maxHeight: '90%',
    minHeight: '70%',
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
  damagedBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  lostBadge: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#9ca3af',
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
  summarySection: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  summaryText: {
    fontSize: 14,
    color: '#0c4a6e',
    marginBottom: 5,
    fontWeight: '500',
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
