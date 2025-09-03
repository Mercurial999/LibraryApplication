import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';

const requests = [
  { id: 1, title: 'Teaching Mathematics', date: 'Apr 15, 2025', status: 'Approved' },
  { id: 2, title: 'History of Science', date: 'Apr 22, 2025', status: 'Pending' },
  { id: 3, title: 'Modern Literature', date: 'Apr 24, 2025', status: 'Pending' },
];

const TeacherRequestsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const router = useRouter();

  const [filter, setFilter] = useState('All');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        const role = String(userData?.role || '').toUpperCase();
        if (role === 'TEACHER') {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          router.replace('/dashboard');
        }
      } catch {
        setAuthorized(false);
        router.replace('/dashboard');
      }
    };
    checkRole();
  }, [router]);

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);

  if (!authorized) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Teacher Requests"
        subtitle="Manage your book requests for the library"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/teacher-requests"
      />
      <View style={styles.content}>
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => setFilter('All')} style={[styles.filterBtn, filter === 'All' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'All' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('Pending')} style={[styles.filterBtn, filter === 'Pending' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'Pending' && styles.filterTextActive]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('Approved')} style={[styles.filterBtn, filter === 'Approved' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'Approved' && styles.filterTextActive]}>Approved</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={filtered}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.author}>by {item.author || 'Unknown Author'}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
              <Text style={styles.date}>Requested: {item.date}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
        />
        
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/teacher-requests/new')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  filterRow: { flexDirection: 'row', marginBottom: 20 },
  filterBtn: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#eee' },
  filterActive: { borderBottomColor: '#3498db' },
  filterText: { color: '#666' },
  filterTextActive: { color: '#3498db', fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  author: { fontSize: 14, color: '#666', marginBottom: 4 },
  status: { fontSize: 14, color: '#888', marginBottom: 4 },
  date: { fontSize: 14, color: '#888' },
  fab: { position: 'absolute', right: 24, bottom: 24, backgroundColor: '#3498db', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
});

export default TeacherRequestsScreen;