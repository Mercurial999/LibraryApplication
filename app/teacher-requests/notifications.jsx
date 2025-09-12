import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import ApiService from '../../services/ApiService';

export default function TeacherRequestNotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getRecentActivity(null, 20);
      const activities = res?.data?.activities || res?.activities || res?.data || [];
      // Prefer request-related items
      const requestItems = activities.filter(a => {
        const t = String(a.type || '').toLowerCase();
        const title = String(a.title || '').toLowerCase();
        return t.includes('request') || title.includes('request');
      });
      setItems(requestItems.length ? requestItems : activities);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} />}
    >
      <Text style={styles.header}>Notifications</Text>
      {loading ? (
        <View style={styles.loading}> 
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}> 
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>Updates about your book requests will appear here.</Text>
        </View>
      ) : (
        items.map((n, idx) => (
          <View key={n.id || idx} style={[styles.card, (String(n.type||'').toLowerCase().includes('approved')) && styles.highlight]}>
            <Text style={styles.title}>{n.title || 'Request Update'}</Text>
            <Text>{n.subtitle || n.message || n.description || 'Your request status has been updated.'}</Text>
            <Text style={styles.time}>{new Date(n.createdAt || n.time || n.date || Date.now()).toLocaleString()}</Text>
          </View>
        ))
      )}
      <View style={styles.settingsBtn}>
        <Text style={styles.settingsText}>Settings</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  highlight: { backgroundColor: '#eaf6ff', borderColor: '#3498db', borderWidth: 1 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  time: { color: '#888', fontSize: 12, marginTop: 4 },
  settingsBtn: { alignItems: 'flex-end', marginTop: 10 },
  settingsText: { color: '#3498db', fontWeight: 'bold' },
  loading: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { marginTop: 8, color: '#64748b' },
  empty: { alignItems: 'center', paddingVertical: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  emptySub: { fontSize: 14, color: '#64748b' },
});