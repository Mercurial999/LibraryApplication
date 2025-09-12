import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [edition, setEdition] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [availableBooks, setAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
        book.title.toLowerCase().includes(bookTitle.toLowerCase()) &&
        book.author.toLowerCase().includes(author.toLowerCase()) &&
        book.availableCopies > 0
    );
  };

  // Submit book request
  const handleSubmitRequest = async () => {
    const nextErrors = {};
    if (!bookTitle.trim()) nextErrors.bookTitle = 'Book title is required';
    if (!author.trim()) nextErrors.author = 'Author is required';
    if (!publisher.trim()) nextErrors.publisher = 'Publisher is required';
    if (!justification.trim()) nextErrors.justification = 'Justification is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
      // Get current user data
      const userData = await ApiService.getCurrentUser();
      
      const response = await ApiService.createBookRequest({
        userId: userData.id,
        bookTitle: bookTitle.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        publisher: publisher.trim(),
        edition: edition.trim() || undefined,
        estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : 0,
        justification: justification.trim(),
        priority: priority
      });

      if (response.success) {
        // Check if it's a duplicate request
        const responseMessage = response.data?.message || response.message || '';
        if (responseMessage.includes('Duplicate')) {
          Alert.alert(
            'Duplicate Request',
            'A similar request was recently submitted. Please wait before submitting another request for the same book.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Request Submitted',
            'Your book request has been submitted successfully. The librarian will review it.',
            [{ text: 'OK', onPress: () => router.replace('/teacher-requests') }]
          );
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting book request:', error);
      Alert.alert('Error', error.message || 'Failed to submit request. Please try again.');
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
        showBackButton
        onBackPress={() => router.replace('/teacher-requests')}
      />
      
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/teacher-requests/new"
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Request New Book</Text>
          <Text style={styles.subtitle}>Request books to be added to the library</Text>

          {/* Required Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="book-open-variant" size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Required Information</Text>
            </View>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Book Title <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={[styles.input, errors.bookTitle && styles.inputError]} 
                placeholder="Enter book title"
                value={bookTitle} 
                onChangeText={(t) => { setBookTitle(t); if (errors.bookTitle) setErrors(p=>({ ...p, bookTitle: undefined })); }} 
              />
              {errors.bookTitle && <Text style={styles.errorText}>{errors.bookTitle}</Text>}

              <Text style={styles.fieldLabel}>Author <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={[styles.input, errors.author && styles.inputError]} 
                placeholder="Enter author name"
                value={author} 
                onChangeText={(t) => { setAuthor(t); if (errors.author) setErrors(p=>({ ...p, author: undefined })); }} 
              />
              {errors.author && <Text style={styles.errorText}>{errors.author}</Text>}

              <Text style={styles.fieldLabel}>Publisher <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={[styles.input, errors.publisher && styles.inputError]} 
                placeholder="Enter publisher name"
                value={publisher} 
                onChangeText={(t) => { setPublisher(t); if (errors.publisher) setErrors(p=>({ ...p, publisher: undefined })); }} 
              />
              {errors.publisher && <Text style={styles.errorText}>{errors.publisher}</Text>}

              <Text style={styles.fieldLabel}>Justification <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={[styles.input, styles.textArea, errors.justification && styles.inputError]} 
                placeholder="Explain why this book is needed for your course or research"
                value={justification} 
                onChangeText={(t) => { setJustification(t); if (errors.justification) setErrors(p=>({ ...p, justification: undefined })); }} 
                multiline 
                numberOfLines={4}
              />
              {errors.justification && <Text style={styles.errorText}>{errors.justification}</Text>}
            </View>
          </View>

          {/* Optional Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information" size={20} color="#6b7280" />
              <Text style={styles.sectionTitle}>Additional Information (Optional)</Text>
            </View>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ISBN</Text>
              <TextInput 
                style={styles.input} 
                placeholder="978-1234567890"
                value={isbn} 
                onChangeText={setIsbn} 
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Edition</Text>
              <TextInput 
                style={styles.input} 
                placeholder="1st Edition, 2nd Edition, etc."
                value={edition} 
                onChangeText={setEdition} 
              />

              <Text style={styles.fieldLabel}>Estimated Price (₱)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0"
                value={estimatedPrice} 
                onChangeText={setEstimatedPrice} 
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Priority Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="flag" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Priority Level</Text>
            </View>
            
            <View style={styles.priorityContainer}>
              {[
                { value: 'LOW', label: 'Low', icon: 'check-circle-outline', color: '#10B981' },
                { value: 'MEDIUM', label: 'Medium', icon: 'minus-circle', color: '#F59E0B' },
                { value: 'HIGH', label: 'High', icon: 'alert-circle', color: '#DC2626' }
              ].map(level => (
                <TouchableOpacity
                  key={level.value}
                  style={[styles.priorityOption, priority === level.value && styles.priorityOptionActive]}
                  onPress={() => setPriority(level.value)}
                >
                  <MaterialCommunityIcons 
                    name={level.icon} 
                    size={20} 
                    color={priority === level.value ? '#ffffff' : level.color} 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={[styles.priorityText, priority === level.value && styles.priorityTextActive]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isBookAvailable() && (
            <View style={styles.availabilityWarning}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={styles.warningText}>
                This book appears to be available in the library. Check the catalog first.
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
              <>
                <MaterialCommunityIcons name="send" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollView: {
    flex: 1
  },
  scrollContent: { 
    paddingBottom: 24
  },
  formContainer: {
    padding: 20
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 8, 
    textAlign: 'center',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center'
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8
  },
  fieldGroup: {
    marginTop: 8
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  required: {
    color: '#ef4444'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#ffffff'
  },
  inputError: {
    borderColor: '#ef4444'
  },
  errorText: {
    color: '#ef4444',
    marginTop: -12,
    marginBottom: 8,
    fontSize: 12
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff'
  },
  priorityOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  priorityTextActive: {
    color: '#ffffff'
  },
  availabilityWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    flex: 1
  },
  submitButton: { 
    backgroundColor: '#3b82f6', 
    paddingVertical: 16, 
    paddingHorizontal: 24,
    borderRadius: 12, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8
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