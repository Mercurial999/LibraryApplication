import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Dummy renewal requests data
const renewalRequests = [
  { id: 1, bookTitle: 'Example Book 1', requestDate: '04/27/2025', status: 'Pending Approval' },
  { id: 2, bookTitle: 'Example Book 3', requestDate: '04/25/2025', status: 'Pending Renew' },
  { id: 3, bookTitle: 'Example Book 3', requestDate: '04/25/2025', status: 'Renew Cancelled' },
];

export default function RenewalRequestsScreen() {
  const [tab, setTab] = useState('pending');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Requests</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('pending')} style={[styles.tab, tab === 'pending' && styles.activeTab]}>
          <Text style={tab === 'pending' ? styles.activeTabText : styles.tabText}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('history')} style={[styles.tab, tab === 'history' && styles.activeTab]}>
          <Text style={tab === 'history' ? styles.activeTabText : styles.tabText}>History</Text>
        </TouchableOpacity>
      </View>
      {renewalRequests
        .filter(r => tab === 'pending' ? r.status !== 'Renew Cancelled' : r.status === 'Renew Cancelled')
        .map(r => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.title}>{r.bookTitle}</Text>
            <Text>Request Date: {r.requestDate}</Text>
            <Text style={
              r.status === 'Pending Renew' ? styles.pending :
              r.status === 'Renew Cancelled' ? styles.cancelled :
              styles.status
            }>
              Status: {r.status}
            </Text>
            {tab === 'pending' && (
              <TouchableOpacity style={styles.cancelBtn}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  tabRow: { flexDirection: 'row', marginBottom: 10 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#eee' },
  activeTab: { borderColor: '#3498db' },
  tabText: { color: '#888' },
  activeTabText: { color: '#3498db', fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  status: { color: '#555', marginTop: 4 },
  pending: { color: '#f1c40f', marginTop: 4 },
  cancelled: { color: '#e74c3c', marginTop: 4 },
  cancelBtn: { marginTop: 10, backgroundColor: '#e74c3c', padding: 8, borderRadius: 5, alignItems: 'center' },
});