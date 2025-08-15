import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const dummyBooks = [
  { id: 1, title: 'Book 1', author: 'Author 1', due: 'mm/dd/yyyy', days: 0 },
  { id: 2, title: 'Book 2', author: 'Author 2', due: '1 day remaining', days: 1 },
  { id: 3, title: 'Book 3', author: 'Author 3', due: '2 days remaining', days: 2 },
];

export default function MyBooks() {
  const [tab, setTab] = useState('borrowed');

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('borrowed')} style={[styles.tab, tab === 'borrowed' && styles.activeTab]}>
          <Text style={tab === 'borrowed' ? styles.activeTabText : styles.tabText}>Borrowed</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('returned')} style={[styles.tab, tab === 'returned' && styles.activeTab]}>
          <Text style={tab === 'returned' ? styles.activeTabText : styles.tabText}>Returned</Text>
        </TouchableOpacity>
      </View>
      {tab === 'borrowed' && dummyBooks.map(b => (
        <View key={b.id} style={styles.card}>
          <Text style={styles.title}>{b.title}</Text>
          <Text>Author: {b.author}</Text>
          <Text style={b.days === 0 ? styles.dueRed : styles.dueYellow}>{b.due}</Text>
          <TouchableOpacity style={styles.reportBtn}>
            <Text style={{ color: '#e74c3c' }}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.returnBtn}>
            <Text style={{ color: '#fff' }}>Request Return</Text>
          </TouchableOpacity>
        </View>
      ))}
      {tab === 'returned' && (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>No returned books yet.</Text>
      )}
      <Text style={styles.note}>Note: If books are lost or damaged, please report it immediately.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', margin: 10 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#eee' },
  activeTab: { borderColor: '#3498db' },
  tabText: { color: '#888' },
  activeTabText: { color: '#3498db', fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', margin: 10, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  dueRed: { color: '#e74c3c', fontWeight: 'bold' },
  dueYellow: { color: '#f1c40f', fontWeight: 'bold' },
  reportBtn: { marginTop: 10, alignItems: 'flex-end' },
  returnBtn: { marginTop: 5, backgroundColor: '#3498db', padding: 8, borderRadius: 5, alignItems: 'center' },
  note: { margin: 10, color: '#888', fontSize: 12 },
});