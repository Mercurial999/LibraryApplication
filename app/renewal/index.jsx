import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';

// Dummy borrowed books data
const borrowedBooks = [
  { id: 1, title: 'Book 2', author: 'Author 2', due: '1 day', status: 'Pending Renew', eligible: false },
  { id: 2, title: 'Book 6', author: 'Author 6', due: '3 days', status: 'Renewal Pending', eligible: false },
  { id: 3, title: 'Book 7', author: 'Author 7', due: '2 days', status: 'Available for renew', eligible: true },
  { id: 4, title: 'Book 4', author: 'Author 4', due: 'Overdue! 10 days', status: 'Overdue', eligible: false },
];

const RenewalScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const router = useRouter();

  const handleRenew = (book) => {
    // Here you would send a renewal request to your backend
    // For now, just navigate to the requests page
    router.push('/renewal/requests');
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Book Renewal"
        subtitle="Renew your borrowed books"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/renewal"
      />
      <View style={styles.content}>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={styles.activeTabText}>Borrowed Books</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={borrowedBooks}
          renderItem={({ item }) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>Author: {item.author}</Text>
              <Text style={item.status === 'Overdue' ? styles.overdue : styles.due}>
                Due: {item.due}
              </Text>
              {item.eligible && (
                <>
                  <Text style={styles.eligible}>Available for renew</Text>
                  <TouchableOpacity style={styles.renewBtn} onPress={() => handleRenew(item)}>
                    <Text style={{ color: '#fff' }}>Renew</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.status === 'Pending Renew' && (
                <Text style={styles.pending}>Pending Renew</Text>
              )}
              {item.status === 'Renewal Pending' && (
                <Text style={styles.pending}>Renewal Pending</Text>
              )}
              {item.status === 'Overdue' && (
                <Text style={styles.overdue}>Returned 10 days Overdue!</Text>
              )}
              {item.status === 'Book in reserve' && (
                <Text style={styles.reserve}>Book in reserve</Text>
              )}
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
        />
      </View>
    </View>
  );
};

export default RenewalScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  tabRow: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#eee' },
  activeTab: { borderBottomColor: '#3498db' },
  tabText: { color: '#666' },
  activeTabText: { color: '#3498db', fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  due: { color: '#27ae60' },
  overdue: { color: '#e74c3c' },
  eligible: { color: '#3498db', fontWeight: 'bold', marginTop: 8 },
  renewBtn: { backgroundColor: '#27ae60', padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  pending: { color: '#f39c12', fontWeight: 'bold' },
  reserve: { color: '#9b59b6', fontWeight: 'bold' },
});