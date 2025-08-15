import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const payments = [
  { id: 1, bookTitle: 'To Kill a Mockingbird', amount: 8, date: 'Mar 15, 2025' },
  { id: 2, bookTitle: 'Pride and Prejudice', amount: 12, date: 'Mar 12, 2025' },
  { id: 3, bookTitle: 'The Hobbit', amount: 5, date: 'Mar 10, 2025' },
];

export default function PaymentHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Payment History</Text>
      <Text style={styles.totalPaid}>Total Paid: ₱25.00</Text>
      {payments.map(p => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.title}>{p.bookTitle}</Text>
          <Text>Paid: ₱{p.amount}.00</Text>
          <Text>Date: {p.date}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  totalPaid: { color: '#3498db', fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
});