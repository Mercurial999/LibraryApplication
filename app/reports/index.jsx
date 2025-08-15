import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const borrowedBooks = [
  { id: 1, title: 'Book 1', author: 'Author 1', due: 'mm/dd/yyyy' },
  { id: 2, title: 'Book 2', author: 'Author 2', due: '1 day remaining' },
  { id: 3, title: 'Book 3', author: 'Author 3', due: '2 days remaining' },
];

export default function ReportsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Books</Text>
      {borrowedBooks.map(book => (
        <View key={book.id} style={styles.card}>
          <Text style={styles.title}>{book.title}</Text>
          <Text>Author: {book.author}</Text>
          <Text>Due: {book.due}</Text>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => router.push({ pathname: '/reports/report', params: { id: book.id } })}
          >
            <Text style={{ color: '#e74c3c' }}>Report</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.note}>Note: If books are lost or damaged, please report it immediately.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  reportBtn: { marginTop: 10, alignItems: 'flex-end' },
  note: { margin: 10, color: '#888', fontSize: 12 },
});