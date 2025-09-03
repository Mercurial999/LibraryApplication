import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

export default function OutstandingFinesScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fines, setFines] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const router = useRouter();

  const loadOutstandingFines = async () => {
    try {
      setError(null);
      const allFines = await ApiService.getFines();
      
      // Filter for unpaid fines only
      const unpaidFines = allFines.filter(fine => fine.status === 'UNPAID');
      
      setFines(unpaidFines);
      setTotalOutstanding(unpaidFines.reduce((sum, fine) => sum + fine.amountDue, 0));
    } catch (err) {
      console.error('Error loading outstanding fines:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load outstanding fines. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOutstandingFines();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOutstandingFines();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFineTypeIcon = (fineType) => {
    switch (fineType?.toLowerCase()) {
      case 'overdue fine':
        return '⏰';
      case 'damage fine':
        return '📚';
      case 'lost book fine':
        return '❌';
      default:
        return '💰';
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Outstanding Fines"
        subtitle="Unpaid fines and overdue books"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/fines"
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading outstanding fines...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={loadOutstandingFines} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Outstanding</Text>
              <Text style={styles.summaryAmount}>₱{totalOutstanding.toFixed(2)}</Text>
              <Text style={styles.summarySubtext}>
                {fines.length} {fines.length === 1 ? 'fine' : 'fines'} unpaid
              </Text>
            </View>

            {fines.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>No Outstanding Fines</Text>
                <Text style={styles.emptyText}>
                  Great! You don't have any unpaid fines at the moment.
                </Text>
              </View>
            ) : (
              fines.map(fine => (
                <View key={fine.id} style={styles.fineCard}>
                  <View style={styles.fineHeader}>
                    <Text style={styles.fineIcon}>
                      {getFineTypeIcon(fine.fineType)}
                    </Text>
                    <View style={styles.fineInfo}>
                      <Text style={styles.bookTitle}>
                        {fine.borrowtransaction?.book?.title || 'Unknown Book'}
                      </Text>
                      <Text style={styles.fineType}>
                        {fine.fineType || 'Overdue Fine'}
                      </Text>
                    </View>
                    <Text style={styles.fineAmount}>
                      ₱{fine.amountDue.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={styles.fineDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(fine.borrowtransaction?.dueDate)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date Issued:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(fine.dateIssued)}
                      </Text>
                    </View>
                    {fine.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{fine.notes}</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push({ 
                      pathname: '/fines/details', 
                      params: { id: fine.id } 
                    })}
                  >
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {fines.length > 0 && (
              <View style={styles.paymentNote}>
                <Text style={styles.noteTitle}>💡 Payment Instructions</Text>
                <Text style={styles.noteText}>
                  To pay your fines, please visit the library during operating hours. 
                  Bring your student ID and show this screen to the librarian.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  content: { 
    flex: 1, 
    padding: 24 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryTitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4
  },
  summarySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24
  },
  fineCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  fineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  fineIcon: {
    fontSize: 24,
    marginRight: 12
  },
  fineInfo: {
    flex: 1
  },
  bookTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 4
  },
  fineType: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  fineAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444'
  },
  fineDetails: {
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500'
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8
  },
  notesLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4
  },
  notesText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  viewButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  },
  paymentNote: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    marginTop: 16
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 8
  },
  noteText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20
  }
});