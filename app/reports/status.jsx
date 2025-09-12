import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import ApiService from '../../services/ApiService';

export default function ReportStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await ApiService.listLostDamagedReports({ userId: 'current' }).catch(async () => {
          // if backend ignores user filter, get all then filter client-side
          const all = await ApiService.listLostDamagedReports({}).catch(() => ({ data: [] }));
          return all;
        });
        const rows = Array.isArray(res) ? res : (res?.data || res?.reports || []);
        const currentUser = await ApiService.getCurrentUser();
        const mine = (rows || []).filter(r => String(r.userId || r.user_id || '') === String(currentUser?.id || ''));
        if (mounted) setReports(mine);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load reports');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <Header title="My Reports" showNotificationButton={false} showProfileButton={false} />
      <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {loading && (
          <View style={styles.centerRow}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={{ marginLeft: 8, color: '#64748b' }}>Loading reports…</Text>
          </View>
        )}
        {!!error && !loading && (
          <Text style={styles.error}>{error}</Text>
        )}
        {!loading && !error && reports.length === 0 && (
          <Text style={styles.note}>No reports yet.</Text>
        )}
        {!loading && !error && reports.map(r => {
          const status = String(r.status || 'PENDING');
          const bookTitle = r.bookTitle || (r.book && r.book.title) || 'Book';
          const submitted = r.reportDate || r.createdAt || r.created_at;
          const resolved = r.resolutionDate || r.resolvedAt || null;
          return (
            <View key={r.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.title}>{bookTitle}</Text>
                <Text style={[styles.badge, status === 'PENDING' ? styles.pending : (status === 'RESOLVED' || status === 'FULFILLED') ? styles.resolved : styles.other]}>{status}</Text>
              </View>
              <Text style={styles.meta}>Type: {String(r.reportType || r.type)}</Text>
              {!!submitted && <Text style={styles.meta}>Submitted: {new Date(submitted).toLocaleString()}</Text>}
              {!!resolved && <Text style={styles.meta}>Resolved: {new Date(resolved).toLocaleString()}</Text>}
              {!!r.description && <Text style={styles.desc}>{r.description}</Text>}
        </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  error: { color: '#ef4444', padding: 16 },
  note: { color: '#6b7280', padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 12 },
  title: { fontWeight: '700', fontSize: 16, color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, color: '#fff', fontWeight: '700', overflow: 'hidden' },
  pending: { backgroundColor: '#f59e0b' },
  resolved: { backgroundColor: '#10b981' },
  other: { backgroundColor: '#6b7280' },
  meta: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  desc: { color: '#374151', marginTop: 8 }
});