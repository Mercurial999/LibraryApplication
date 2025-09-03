import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

// Lazy import components to avoid circular deps during creation
import FinesSummaryCard from '../../components/modules/FinesSummaryCard';
import OverdueBookCard from '../../components/modules/OverdueBookCard';

export default function OverdueFinesScreen() {
  const [overdueData, setOverdueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchOverdueData = useCallback(async () => {
    try {
      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const res = await fetch(`${ApiService.API_BASE}/api/mobile/users/${userId}/overdue-fines`, {
        headers: await ApiService.getAuthHeaders()
      });
      const data = await ApiService.handleApiResponse(res, 'overdue-fines');
      setOverdueData(data.data);
    } catch (err) {
      console.error('Error fetching overdue data:', err);
      Alert.alert('Error', err.message || 'Failed to load overdue & fines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdueData();
  }, [fetchOverdueData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOverdueData();
    setRefreshing(false);
  }, [fetchOverdueData]);

  const handlePayFine = (fineId) => {
    // Navigate to payment screen once available
    Alert.alert('Pay Fine', 'Payment screen coming soon.');
  };

  const handleViewDetails = (bookId) => {
    Alert.alert('Details', 'Fine details modal coming soon.');
  };

  if (loading) {
    return (
      <View style={styles.centered}> 
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading overdue & fines...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <FinesSummaryCard summary={overdueData?.finesSummary} />

      <View style={styles.overdueSection}>
        <Text style={styles.sectionTitle}>Overdue Books</Text>
        {overdueData?.overdueBooks?.length ? (
          overdueData.overdueBooks.map((book) => (
            <OverdueBookCard
              key={book.id}
              book={book}
              onPayFine={() => handlePayFine(book.fine.id)}
              onViewDetails={() => handleViewDetails(book.id)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No overdue books 🎉</Text>
        )}
      </View>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} currentRoute={'/overdue-fines'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0f172a', flex: 1 },
  overdueSection: { marginTop: 24 },
  sectionTitle: { color: '#e2e8f0', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64, backgroundColor: '#0f172a' },
  loadingText: { marginTop: 12, color: '#94a3b8' }
});


