import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';
import { markNotificationsSeenNow } from '../../services/NotificationService';

const typeToAccent = {
  OVERDUE: { border: '#ef4444', bg: '#fef2f2', text: '#b91c1c', icon: '⏰' },
  DUE_SOON: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', icon: '⚠️' },
  RESERVED_AVAILABLE: { border: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6', icon: '📬' },
  TRANSACTION: { border: '#3b82f6', bg: '#eff6ff', text: '#1e40af', icon: '📦' },
  SYSTEM: { border: '#64748b', bg: '#f1f5f9', text: '#334155', icon: 'ℹ️' }
};

const NotificationsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadNotifications = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await ApiService.getRecentActivity(null, 50);
      const data = res?.data?.activities || res?.data || res?.activities || [];
      const normalized = (data || []).map((n, idx) => ({
        id: n.id || idx + 1,
        title: n.title || n.message || 'Update',
        message: n.message || n.details || '',
        createdAt: n.createdAt || n.time || new Date().toISOString(),
        type: String(n.type || n.category || 'SYSTEM').toUpperCase(),
        meta: n
      }));
      setItems(normalized);
      await markNotificationsSeenNow();
    } catch (e) {
      setError(e?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotifications(); }, []);

  const onRefresh = async () => {
    try { setRefreshing(true); await loadNotifications(); } finally { setRefreshing(false); }
  };

  const notificationCount = useMemo(() => items.length, [items]);

  const renderItem = ({ item }) => {
    const accent = typeToAccent[item.type] || typeToAccent.SYSTEM;
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: accent.border, backgroundColor: accent.bg }]}
        activeOpacity={0.9}
        onPress={() => {
          if (item.meta?.reservationId) router.push('/reservation');
          else if (item.meta?.fineId) router.push('/fines');
          else if (item.meta?.bookId) router.push('/book-catalog');
        }}
      >
        <Text style={styles.cardIcon}>{accent.icon}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {!!item.message && <Text style={[styles.message, { color: accent.text }]} numberOfLines={2}>{item.message}</Text>}
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Notifications"
        subtitle="All updates from your librarian"
        onMenuPress={() => setSidebarVisible(true)}
        notificationCount={notificationCount}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/notifications"
      />

      {loading && (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.stateText}>Loading notifications…</Text>
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadNotifications}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={items}
          style={styles.listContainer}
          contentContainerStyle={[styles.listContent, items.length === 0 && { flex: 1 }]}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>You're all caught up! No notifications.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  listContainer: { flex: 1 },
  listContent: { padding: 16 },
  card: { 
    backgroundColor: '#f9fafb', 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardIcon: { fontSize: 18, width: 22, textAlign: 'center', marginTop: 2 },
  cardBody: { flex: 1, marginLeft: 10 },
  title: { fontWeight: '700', fontSize: 15, color: '#0f172a', marginBottom: 4 },
  message: { fontWeight: '500' },
  time: { color: '#64748b', fontSize: 12, marginTop: 6 },
  stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: '#475569', marginTop: 10 },
  errorText: { color: '#ef4444', fontWeight: '600', marginBottom: 12 },
  retryBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700' }
});