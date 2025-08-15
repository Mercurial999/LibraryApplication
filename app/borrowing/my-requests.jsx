import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const dummyRequests = [
  { id: 1, bookTitle: 'Example Book 1', requestDate: '04/17/2025', status: 'Pending Approval' },
  { id: 2, bookTitle: 'Example Book 2', requestDate: '04/18/2025', status: 'Ready for Pickup' },
];

export default function MyRequests() {
  const [requests, setRequests] = useState(dummyRequests);
  const [tab, setTab] = useState('pending');

  const handleCancel = (id) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No' },
      {
        text: 'Yes',
        onPress: () => {
          setRequests(reqs => reqs.filter(r => r.id !== id));
        }
      }
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('pending')} style={[styles.tab, tab === 'pending' && styles.activeTab]}>
          <Text style={tab === 'pending' ? styles.activeTabText : styles.tabText}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('history')} style={[styles.tab, tab === 'history' && styles.activeTab]}>
          <Text style={tab === 'history' ? styles.activeTabText : styles.tabText}>History</Text>
        </TouchableOpacity>
      </View>
      {requests.filter(r => tab === 'pending' ? r.status !== 'Cancelled' : r.status === 'Cancelled').map(r => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.title}>{r.bookTitle}</Text>
          <Text>Request Date: {r.requestDate}</Text>
          <Text>Status: {r.status}</Text>
          {tab === 'pending' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(r.id)}>
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', margin: 10 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#eee' },
  activeTab: { borderColor: '#e74c3c' },
  tabText: { color: '#888' },
  activeTabText: { color: '#e74c3c', fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', margin: 10, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 10, backgroundColor: '#e74c3c', padding: 8, borderRadius: 5, alignItems: 'center' },
});