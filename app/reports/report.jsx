import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ReportBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  // Dummy book data for demonstration
  const book = { title: 'Book 1', author: 'Author 1', due: 'May 2, 2025', status: 'Currently Borrowed', id };

  const [type, setType] = useState('Lost');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    // Here you would send the report to your backend
    router.replace('/reports/status');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Report Book</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{book.title}</Text>
        <Text>Author: {book.author}</Text>
        <Text>Due Date: {book.due}</Text>
        <Text>Status: {book.status}</Text>
      </View>
      <Text style={styles.label}>Report Type:</Text>
      <View style={styles.radioRow}>
        <TouchableOpacity style={styles.radioBtn} onPress={() => setType('Lost')}>
          <View style={[styles.radioCircle, type === 'Lost' && styles.radioSelected]} />
          <Text style={styles.radioText}>Book is Lost</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.radioBtn} onPress={() => setType('Damaged')}>
          <View style={[styles.radioCircle, type === 'Damaged' && styles.radioSelected]} />
          <Text style={styles.radioText}>Book is Damaged</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>Describe the {type === 'Lost' ? 'loss' : 'damage'}:</Text>
      <TextInput
        style={styles.input}
        placeholder={type === 'Lost' ? 'Describe how the book was lost...' : 'Describe the damage...'}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  label: { marginTop: 10, marginBottom: 4, fontWeight: 'bold' },
  radioRow: { flexDirection: 'row', marginBottom: 10 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#3498db', marginRight: 6 },
  radioSelected: { backgroundColor: '#3498db' },
  radioText: { fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, minHeight: 60, marginBottom: 20 },
  submitBtn: { backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});