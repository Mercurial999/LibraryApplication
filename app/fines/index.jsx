import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function FinesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Overdue Fines</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Total Outstanding</Text>
        <Text style={styles.amount}>₱15.00</Text>
        <Text style={styles.subLabel}>2 fines unpaid</Text>
      </View>
      <TouchableOpacity style={styles.row} onPress={() => router.push('/fines/outstanding')}>
        <Text style={styles.link}>Fine Details</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={() => router.push('/fines/payment-history')}>
        <Text style={styles.link}>Payment History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.link}>Dispute a Fine</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
  label: { fontSize: 16, color: '#555' },
  amount: { fontSize: 24, fontWeight: 'bold', color: '#e74c3c' },
  subLabel: { color: '#888', marginTop: 4 },
  row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  link: { color: '#3498db', fontWeight: 'bold' },
});