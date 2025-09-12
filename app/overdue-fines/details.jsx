import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

export default function OverdueDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        await ApiService.loadAuthToken?.();
        const userId = await ApiService.getCurrentUserId();
        const res = await fetch(`${ApiService.API_BASE}/api/mobile/users/${userId}/overdue-fines`, { headers: await ApiService.getAuthHeaders(), cache: 'no-store' });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error?.message || 'Failed to load details');
        const found = (json.data?.overdueBooks || []).find(b => String(b.id) === String(id));
        setBook(found || null);
      } catch (e) {
        setError(e.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <View style={styles.container}>
      <Header title="Overdue Details" subtitle="Read-only information" onMenuPress={() => setSidebarVisible(true)} showBackButton onBackPress={() => router.replace('/overdue-fines')} />
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} currentRoute={'/overdue-fines'} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /><Text style={styles.muted}>Loading...</Text></View>
        ) : error ? (
          <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
        ) : !book ? (
          <View style={styles.center}><Text style={styles.muted}>Record not found</Text></View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.subtitle}>by {book.author}</Text>
            <View style={styles.row}><Text style={styles.label}>QR</Text><Text style={styles.value}>{book.qrCode || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Borrowed</Text><Text style={styles.value}>{new Date(book.borrowDate).toLocaleDateString()}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Due Date</Text><Text style={styles.value}>{new Date(book.dueDate).toLocaleDateString()}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Days Overdue</Text><Text style={styles.value}>{book.daysOverdue}</Text></View>
            <View style={styles.divider} />
            <Text style={styles.section}>Fine</Text>
            <View style={styles.row}><Text style={styles.label}>Amount Due</Text><Text style={[styles.value, styles.amount]}>₱{Number(book?.fine?.amountDue || 0).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.value}>{book?.fine?.status || 'PENDING'}</Text></View>
            <Text style={styles.note}>Processing is handled by the librarian. You can review the status here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  center: { paddingVertical: 40, alignItems: 'center' },
  muted: { color: '#6b7280' },
  error: { color: '#ef4444' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  section: { fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#374151', fontWeight: '600' },
  value: { color: '#111827' },
  amount: { color: '#f59e0b', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  note: { color: '#6b7280', marginTop: 8 }
});


