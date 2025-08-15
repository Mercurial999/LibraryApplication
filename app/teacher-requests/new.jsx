import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function NewBookRequestScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [ddc, setDdc] = useState('');
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    // Here you would send the request to your backend
    router.replace('/teacher-requests');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>New Book Request</Text>
      <TextInput style={styles.input} placeholder="Book Title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Author" value={author} onChangeText={setAuthor} />
      <TextInput style={styles.input} placeholder="DDC (if known)" value={ddc} onChangeText={setDdc} />
      <TextInput style={styles.input} placeholder="Subject/Category" value={subject} onChangeText={setSubject} />
      <TextInput style={styles.input} placeholder="Reason for Request" value={reason} onChangeText={setReason} multiline />
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit Request</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 14 },
  submitBtn: { backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});