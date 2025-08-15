import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Dummy data for demonstration
const book = {
  title: 'Book Title 1',
  author: 'Author 1',
  ddc: '000.000',
  shelf: 'A-23-02',
  status: 'Available',
};

export default function RecommendationDetailsScreen() {
  const router = useRouter();
  // You can use useLocalSearchParams() to get the book id and fetch real data

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Book Details</Text>
      <View style={styles.card}>
        <View style={styles.coverPlaceholder} />
        <Text style={styles.title}>{book.title}</Text>
        <Text>Author: {book.author}</Text>
        <Text>DDC: {book.ddc}</Text>
        <Text>Shelf Loc: {book.shelf}</Text>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.status}>{book.status}</Text>
      </View>
      <TouchableOpacity
        style={styles.borrowBtn}
        disabled={book.status !== 'Available'}
        onPress={() => {/* handle borrow action */}}
      >
        <Text style={styles.borrowText}>Request to Borrow</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8, alignItems: 'center' },
  coverPlaceholder: { width: 80, height: 110, backgroundColor: '#ddd', borderRadius: 4, marginBottom: 12 },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  statusLabel: { marginTop: 10, color: '#888' },
  status: { fontWeight: 'bold', color: '#3498db', marginBottom: 10 },
  borrowBtn: { backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10, width: '100%' },
  borrowText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});