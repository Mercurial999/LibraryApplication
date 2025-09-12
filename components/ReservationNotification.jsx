import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ApiService from '../services/ApiService';

const ReservationNotification = ({ visible, onClose, onReserveBook }) => {
  const [availableReservations, setAvailableReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAvailableReservations();
    }
  }, [visible]);

  const loadAvailableReservations = async () => {
    try {
      setLoading(true);
      // Get user's reservations that are now available
      const response = await ApiService.getUserReservations('available');
      
      if (response.success && response.data) {
        setAvailableReservations(response.data.reservations || []);
      }
    } catch (error) {
      console.error('Error loading available reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReserveNow = (reservation) => {
    Alert.alert(
      'Book Available!',
      `"${reservation.book.title}" is now available. Would you like to borrow it now?`,
      [
        {
          text: 'Later',
          style: 'cancel'
        },
        {
          text: 'Borrow Now',
          onPress: () => {
            onReserveBook(reservation);
            onClose();
          }
        }
      ]
    );
  };

  const handleDismiss = (reservationId) => {
    // Mark reservation as dismissed (user will be notified again later)
    setAvailableReservations(prev => 
      prev.filter(res => res.id !== reservationId)
    );
  };

  if (!visible || availableReservations.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📚 Books Available!</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            The following books you reserved are now available:
          </Text>

          {availableReservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationCard}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{reservation.book.title}</Text>
                <Text style={styles.bookAuthor}>by {reservation.book.author}</Text>
                <Text style={styles.reservationDate}>
                  Reserved on: {new Date(reservation.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.borrowButton}
                  onPress={() => handleReserveNow(reservation)}
                >
                  <Text style={styles.borrowButtonText}>📖 Borrow Now</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => handleDismiss(reservation.id)}
                >
                  <Text style={styles.dismissButtonText}>Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              💡 You have 3 days to borrow these books before they become available to others.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  reservationCard: {
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
    marginBottom: 16,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  reservationDate: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  borrowButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  borrowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dismissButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  footerText: {
    fontSize: 14,
    color: '#0369a1',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReservationNotification;
