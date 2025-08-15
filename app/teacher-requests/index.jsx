import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';

const requests = [
  { id: 1, title: 'Teaching Mathematics', date: 'Apr 15, 2025', status: 'Approved' },
  { id: 2, title: 'History of Science', date: 'Apr 22, 2025', status: 'Pending' },
  { id: 3, title: 'Modern Literature', date: 'Apr 24, 2025', status: 'Pending' },
];

export default function TeacherRequestsScreen() {
  const [filter, setFilter] = useState('All');
  const router = useRouter();

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Book Requests</Text>
      <View style={styles.filterRow}>
        <TouchableOpacity onPress={() => setFilter('All')} style={[styles.filterBtn, filter === 'All' && styles.filterActive]}>
          <Text style={filter === 'All' ? styles.filterTextActive : styles.filterText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('Pending')} style={[styles.filterBtn, filter === 'Pending' && styles.filterActive]}>
          <Text style={filter === 'Pending' ? styles.filterTextActive : styles.filterText}>Pending</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text>Request date: {item.date}</Text>
            <Text style={item.status === 'Approved' ? styles.approved : styles.pending}>{item.status}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/teacher-requests/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  filterRow: { flexDirection: 'row', marginBottom: 10, justifyContent: 'center' },
  filterBtn: { padding: 8, marginHorizontal: 4, borderRadius: 16, backgroundColor: '#f0f0f0' },
  filterActive: { backgroundColor: '#3498db' },
  filterText: { color: '#555' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  approved: { color: '#27ae60', fontWeight: 'bold' },
  pending: { color: '#f1c40f', fontWeight: 'bold' },
  fab: { position: 'absolute', right: 24, bottom: 24, backgroundColor: '#3498db', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
});