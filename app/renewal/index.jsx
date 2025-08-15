import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// Dummy borrowed books data
const borrowedBooks = [
  { id: 1, title: 'Book 2', author: 'Author 2', due: '1 day', status: 'Pending Renew', eligible: false },
  { id: 2, title: 'Book 6', author: 'Author 6', due: '3 days', status: 'Renewal Pending', eligible: false },
  { id: 3, title: 'Book 7', author: 'Author 7', due: '2 days', status: 'Available for renew', eligible: true },
  { id: 4, title: 'Book 4', author: 'Author 4', due: 'Overdue! 10 days', status: 'Overdue', eligible: false },
];

export default function RenewalScreen() {
  const router = useRouter();

  const handleRenew = (book) => {
    // Here you would send a renewal request to your backend
    // For now, just navigate to the requests page
    router.push('/renewal/requests');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Books</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>Borrowed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Returned</Text>
        </TouchableOpacity>
      </View>
      {borrowedBooks.map(book => (
        <View key={book.id} style={styles.card}>
          <Text style={styles.title}>{book.title}</Text>
          <Text>Author: {book.author}</Text>
          <Text style={book.status === 'Overdue' ? styles.overdue : styles.due}>
            Due: {book.due}
          </Text>
          {book.eligible && (
            <>
              <Text style={styles.eligible}>Available for renew</Text>
              <TouchableOpacity style={styles.renewBtn} onPress={() => handleRenew(book)}>
                <Text style={{ color: '#fff' }}>Renew</Text>
              </TouchableOpacity>
            </>
          )}
          {book.status === 'Pending Renew' && (
            <Text style={styles.pending}>Pending Renew</Text>
          )}
          {book.status === 'Renewal Pending' && (
            <Text style={styles.pending}>Renewal Pending</Text>
          )}
          {book.status === 'Overdue' && (
            <Text style={styles.overdue}>Returned 10 days Overdue!</Text>
          )}
          {book.status === 'Book in reserve' && (
            <Text style={styles.reserve}>Book in reserve</Text>
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
  due: { color: '#555', marginTop: 4 },
  overdue: { color: '#e74c3c', fontWeight: 'bold', marginTop: 4 },
  eligible: { color: 'green', marginTop: 4 },
  pending: { color: '#f1c40f', marginTop: 4 },
  reserve: { color: '#e67e22', marginTop: 4 },
  renewBtn: { marginTop: 8, backgroundColor: '#3498db', padding: 8, borderRadius: 5, alignItems: 'center' },
});