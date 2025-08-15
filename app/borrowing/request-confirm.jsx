import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function RequestConfirmScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.header}>Request Successful!</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Example Book 2</Text>
        <Text>Your request has been received.</Text>
        <Text>Location: Main Library</Text>
        <Text>Request ID: BRW-0251-0424</Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/borrowing')}
      >
        <Text style={styles.buttonText}>View My Requests</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.replace('/book-catalog')}
      >
        <Text style={styles.secondaryButtonText}>Back to Catalog</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 24, width: '100%', alignItems: 'center' },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  button: { backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center', width: '100%', marginBottom: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { padding: 14, borderRadius: 8, alignItems: 'center', width: '100%' },
  secondaryButtonText: { color: '#3498db', fontWeight: 'bold', fontSize: 16 },
});