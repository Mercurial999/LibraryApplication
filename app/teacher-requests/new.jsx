import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

export default function NewBookRequestScreen() {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestAuthor, setRequestAuthor] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestPriority, setRequestPriority] = useState('MEDIUM');
  const [availableBooks, setAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check available books
  const checkAvailableBooks = async () => {
    try {
      const response = await fetch(`${ApiService.API_BASE}/api/mobile/books/search`, {
        method: 'GET',
        headers: await ApiService.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableBooks(data.data || data || []);
      }
    } catch (error) {
      console.error('Error checking available books:', error);
    }
  };

  // Check if book is already available
  const isBookAvailable = () => {
    return availableBooks.some(
      (book) =>
        book.title.toLowerCase().includes(requestTitle.toLowerCase()) &&
        book.author.toLowerCase().includes(requestAuthor.toLowerCase()) &&
        book.availableCopies > 0
    );
  };

  // Submit book request
  const handleSubmitRequest = async () => {
    if (!requestTitle.trim() || !requestAuthor.trim() || !requestReason.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check if book is already available
    if (isBookAvailable()) {
      Alert.alert(
        'Book Already Available',
        'This book is already available in the library. You can borrow it directly from the catalog.',
        [
          { text: 'OK' },
          {
            text: 'View in Catalog',
            onPress: () => router.navigate('/book-catalog'),
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${ApiService.API_BASE}/api/book-requests`, {
        method: 'POST',
        headers: await ApiService.getAuthHeaders(),
        body: JSON.stringify({
          title: requestTitle.trim(),
          author: requestAuthor.trim(),
          reason: requestReason.trim(),
          priority: requestPriority,
          requestDate: new Date().toISOString(),
          status: 'PENDING',
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Request Submitted',
          'Your book request has been submitted successfully. The librarian will review it.',
          [{ text: 'OK', onPress: () => router.goBack() }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load available books on component mount & enforce role
  useEffect(() => {
    const init = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        const role = String(userData?.role || '').toUpperCase();
        if (role === 'TEACHER') {
          setAuthorized(true);
          checkAvailableBooks();
        } else {
          setAuthorized(false);
          router.replace('/dashboard');
        }
      } catch {
        setAuthorized(false);
        router.replace('/dashboard');
      }
    };
    init();
  }, []);

  if (!authorized) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Request New Book"
        subtitle="For Teachers Only"
        onMenuPress={() => setSidebarVisible(true)}
      />
      
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/teacher-requests/new"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Request New Book</Text>
        <Text style={styles.subtitle}>For Teachers Only</Text>

        <TextInput 
          style={styles.input} 
          placeholder="Book Title *" 
          value={requestTitle} 
          onChangeText={setRequestTitle} 
        />
        
        <TextInput 
          style={styles.input} 
          placeholder="Author *" 
          value={requestAuthor} 
          onChangeText={setRequestAuthor} 
        />
        
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Reason for Request *" 
          value={requestReason} 
          onChangeText={setRequestReason} 
          multiline 
          numberOfLines={4}
        />

        <View style={styles.priorityContainer}>
          <Text style={styles.label}>Priority:</Text>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              requestPriority === 'HIGH' && styles.selectedPriority,
            ]}
            onPress={() => setRequestPriority('HIGH')}
          >
            <Text style={styles.priorityText}>High</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              requestPriority === 'MEDIUM' && styles.selectedPriority,
            ]}
            onPress={() => setRequestPriority('MEDIUM')}
          >
            <Text style={styles.priorityText}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              requestPriority === 'LOW' && styles.selectedPriority,
            ]}
            onPress={() => setRequestPriority('LOW')}
          >
            <Text style={styles.priorityText}>Low</Text>
          </TouchableOpacity>
        </View>

        {isBookAvailable() && (
          <View style={styles.availabilityWarning}>
            <Text style={styles.warningText}>
              ⚠️ This book appears to be available in the library. Check the catalog first.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmitRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollContent: { 
    padding: 24, 
    backgroundColor: '#fff', 
    flexGrow: 1 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 8, 
    textAlign: 'center',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center'
  },
  input: { 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#ffffff'
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  priorityContainer: {
    marginBottom: 20
  },
  priorityButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb'
  },
  selectedPriority: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  priorityText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500'
  },
  availabilityWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center'
  },
  submitButton: { 
    backgroundColor: '#3b82f6', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  disabledButton: {
    backgroundColor: '#9ca3af'
  },
  submitButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
});