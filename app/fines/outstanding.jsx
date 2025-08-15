import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const fines = [
  { id: 1, bookTitle: 'The Great Gatsby', amount: 10, dueDate: 'Apr 10, 2025', perDay: 1.00 },
  { id: 2, bookTitle: '1984', amount: 5, dueDate: 'Apr 15, 2025', perDay: 1.00 },
];

export default function OutstandingFinesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Outstanding Fines</Text>
      <Text style={styles.amount}>Total Outstanding: ₱15.00</Text>
      {fines.map(fine => (
        <View key={fine.id} style={styles.card}>
          <Text style={styles.title}>{fine.bookTitle}</Text>
          <Text>Due Date: {fine.dueDate}</Text>
          <Text>Fine: ₱{fine.amount}.00</Text>
          <Text>Per Day: ₱{fine.perDay}.00</Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push({ pathname: '/fines/details', params: { id: fine.id } })}
          >
            <Text style={{ color: '#fff' }}>View</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.note}>Note: show receipt to the librarian</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  amount: { fontSize: 16, color: '#e74c3c', marginBottom: 10 },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  viewBtn: { marginTop: 8, backgroundColor: '#3498db', padding: 8, borderRadius: 5, alignItems: 'center' },
  note: { marginTop: 20, color: '#888', fontSize: 12, textAlign: 'center' },
});