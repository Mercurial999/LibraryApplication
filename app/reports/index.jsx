import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const ReportsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [borrowed, setBorrowed] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await ApiService.getUserBooks(null, { status: 'borrowed', includeHistory: false });
        // Some implementations return envelope at resp.data; others direct array
        const items = resp?.data?.borrowedBooks || resp?.data?.books || resp?.data || [];
        const normalized = (items || []).filter(b => (b.status || '').toLowerCase() === 'borrowed');
        if (isMounted) setBorrowed(normalized);
      } catch (e) {
        if (isMounted) setError(e?.message || 'Failed to load borrowed books');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <Header 
        title="Book Reports"
        subtitle="Report issues with borrowed books"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/reports"
      />
      <View style={styles.content}>
        {loading && (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={{ marginLeft: 8, color: '#666' }}>Loading your borrowed books…</Text>
          </View>
        )}
        {!!error && !loading && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        {!loading && !error && borrowed.length === 0 && (
          <Text style={styles.note}>You have no currently borrowed books to report.</Text>
        )}
        {!loading && !error && borrowed.map(book => (
          <View key={book.id} style={styles.bookCard}>
            <Text style={styles.bookTitle}>{book.bookTitle || book.title}</Text>
            <Text style={styles.bookAuthor}>by {book.bookAuthor || book.author}</Text>
            {book.dueDate && (
              <Text style={styles.borrowDate}>Due: {new Date(book.dueDate).toLocaleDateString()}</Text>
            )}
            <TouchableOpacity 
              style={styles.reportBtn}
              onPress={() => router.push({ pathname: '/reports/report', params: { bookId: book.bookId || book.id, title: book.bookTitle || book.title, author: book.bookAuthor || book.author, dueDate: book.dueDate || '' } })}
            >
              <Text style={styles.reportText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Text style={styles.note}>Note: You can only report books you have currently borrowed.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  bookCard: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 },
  bookTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#666', marginBottom: 4 },
  borrowDate: { fontSize: 14, color: '#888', marginBottom: 8 },
  reportBtn: { marginTop: 10, alignItems: 'flex-end' },
  reportText: { color: '#e74c3c', fontWeight: 'bold' },
  note: { margin: 10, color: '#888', fontSize: 12 },
});

export default ReportsScreen;