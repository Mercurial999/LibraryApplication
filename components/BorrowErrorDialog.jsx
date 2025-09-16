import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const BorrowErrorDialog = ({ 
  visible, 
  onClose, 
  errorType, 
  bookTitle, 
  onViewMyBooks,
  onReserveInstead,
  onViewFines
}) => {
  const getErrorContent = () => {
    switch (errorType) {
      case 'already_borrowed':
        return {
          icon: 'book-check',
          iconColor: '#10b981',
          title: 'Already Borrowed',
          message: `You already have "${bookTitle}" borrowed. You cannot request to borrow or reserve it again.`,
          primaryAction: {
            text: 'View My Books',
            onPress: onViewMyBooks,
            style: styles.primaryButton
          },
          secondaryAction: {
            text: 'OK',
            onPress: onClose,
            style: styles.secondaryButton
          }
        };
      case 'copy_unavailable':
        return {
          icon: 'book-off',
          iconColor: '#ef4444',
          title: 'Copy Unavailable',
          message: 'This copy is not available for borrowing. It may be lost, damaged, or already borrowed.',
          primaryAction: {
            text: 'Reserve Instead',
            onPress: onReserveInstead,
            style: styles.primaryButton
          },
          secondaryAction: {
            text: 'OK',
            onPress: onClose,
            style: styles.secondaryButton
          }
        };
      case 'overdue_books':
        return {
          icon: 'alert-octagon',
          iconColor: '#ef4444',
          title: 'Action Blocked: Overdue Books',
          message: 'You currently have overdue book(s). You cannot request to borrow or reserve until all overdue items are returned and any fines are settled.',
          primaryAction: {
            text: onViewFines ? 'View Fines' : 'View My Books',
            onPress: onViewFines || onViewMyBooks,
            style: styles.primaryButton
          },
          secondaryAction: {
            text: 'OK',
            onPress: onClose,
            style: styles.secondaryButton
          }
        };
      case 'duplicate_request':
        return {
          icon: 'clock-outline',
          iconColor: '#f59e0b',
          title: 'Request Already Submitted',
          message: 'You have already submitted a borrow request for this book. Please wait for approval.',
          primaryAction: {
            text: 'View My Requests',
            onPress: onViewMyBooks,
            style: styles.primaryButton
          },
          secondaryAction: {
            text: 'OK',
            onPress: onClose,
            style: styles.secondaryButton
          }
        };
      case 'lost_reported':
        return {
          icon: 'alert-circle',
          iconColor: '#dc2626',
          title: 'Book Reported as Lost',
          message: 'This book has been reported as lost on your account. Please resolve this with the library before borrowing again.',
          primaryAction: {
            text: 'View My Books',
            onPress: onViewMyBooks,
            style: styles.primaryButton
          },
          secondaryAction: {
            text: 'OK',
            onPress: onClose,
            style: styles.secondaryButton
          }
        };
      default:
        return {
          icon: 'alert-circle',
          iconColor: '#6b7280',
          title: 'Cannot Borrow',
          message: 'This book cannot be borrowed at this time.',
          primaryAction: {
            text: 'OK',
            onPress: onClose,
            style: styles.primaryButton
          }
        };
    }
  };

  const content = getErrorContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={content.icon} 
              size={48} 
              color={content.iconColor} 
            />
          </View>
          
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>{content.message}</Text>
          
          <View style={styles.buttonContainer}>
            {content.secondaryAction && (
              <TouchableOpacity
                style={[styles.button, content.secondaryAction.style]}
                onPress={content.secondaryAction.onPress}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  {content.secondaryAction.text}
                </Text>
              </TouchableOpacity>
            )}
            {content.primaryAction && (
              <TouchableOpacity
                style={[styles.button, content.primaryAction.style]}
                onPress={content.primaryAction.onPress}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  {content.primaryAction.text}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#64748b',
  },
});

export default BorrowErrorDialog;
