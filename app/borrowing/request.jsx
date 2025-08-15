import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Dummy book data for demonstration
const dummyBook = {
  title: 'Example Book 2',
  author: 'Author 1',
  available: '2 copies',
};

export default function RequestBorrowScreen() {
  const router = useRouter();
  const [notes, setNotes] = React.useState('');

  // You can get book info from params if you pass it via navigation
  // const { bookId } = useLocalSearchParams();

  const handleConfirm = () => {
    // Here you would send the request to your backend
    router.replace('/borrowing/request-confirm');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Borrow Request</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{dummyBook.title}</Text>
        <Text>Author: {dummyBook.author}</Text>
        <Text style={styles.available}>{dummyBook.available}</Text>
      </View>
      <Text style={styles.label}>Notes (Optional):</Text>
      <TextInput
        style={styles.input}
        placeholder="Add a note (optional)"
        value={notes}
        onChangeText={setNotes}
      />
      <TouchableOpacity style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Confirm Request</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 20 },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  available: { color: 'green', marginTop: 4 },
  label: { marginBottom: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 20 },
  button: { backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});