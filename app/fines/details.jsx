import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Dummy fine details
const fineDetails = {
  bookTitle: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  callNumber: 'FIC/FIT',
  checkOut: 'Apr 1, 2025',
  due: 'Apr 10, 2025',
  returned: 'Not returned',
  overdueDays: 10,
  perDay: 1.00,
  total: 10.00,
};

export default function FineDetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Fine Details</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Book Information</Text>
        <Text>{fineDetails.bookTitle}</Text>
        <Text>Author: {fineDetails.author}</Text>
        <Text>Call Number: {fineDetails.callNumber}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Fine Breakdown</Text>
        <Text>Check-Out Date: {fineDetails.checkOut}</Text>
        <Text>Due Date: {fineDetails.due}</Text>
        <Text>Return Date: {fineDetails.returned}</Text>
        <Text>Days Overdue: {fineDetails.overdueDays}</Text>
        <Text>Fine per Day: ₱{fineDetails.perDay}.00</Text>
        <Text style={styles.total}>Total Fine: ₱{fineDetails.total}.00</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  total: { color: '#e74c3c', fontWeight: 'bold', marginTop: 8 },
});