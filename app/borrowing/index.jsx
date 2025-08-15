import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MyRequests from './my-requests';
import MyBooks from './my-books';

export default function BorrowingScreen() {
  const [tab, setTab] = useState('requests');

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('requests')} style={[styles.tab, tab === 'requests' && styles.activeTab]}>
          <Text style={tab === 'requests' ? styles.activeTabText : styles.tabText}>My Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('books')} style={[styles.tab, tab === 'books' && styles.activeTab]}>
          <Text style={tab === 'books' ? styles.activeTabText : styles.tabText}>My Books</Text>
        </TouchableOpacity>
      </View>
      {tab === 'requests' ? <MyRequests /> : <MyBooks />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabRow: { flexDirection: 'row', margin: 10 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: '#eee' },
  activeTab: { borderColor: '#3498db' },
  tabText: { color: '#888' },
  activeTabText: { color: '#3498db', fontWeight: 'bold' },
});