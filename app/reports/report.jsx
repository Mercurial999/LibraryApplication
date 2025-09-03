import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ApiService from '../../services/ApiService';

export default function ReportBookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookId = params.bookId || params.id;
  const bookTitle = params.title || 'Book';
  const bookAuthor = params.author || 'Unknown Author';

  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmitReport = async () => {
    if (!reportType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    try {
      if (!bookId) {
        Alert.alert('Error', 'Missing book ID for report.');
        return;
      }
      
      const currentUser = await ApiService.getCurrentUser();
      if (!currentUser?.id) {
        Alert.alert('Error', 'You must be logged in to report a book.');
        return;
      }

      const response = await fetch(
        `${ApiService.API_BASE}/api/mobile/users/${currentUser.id}/books/${bookId}/report`,
        {
          method: 'POST',
          headers: await ApiService.getAuthHeaders(),
          body: JSON.stringify({
            reportType: reportType.toUpperCase(),
            description: description.trim(),
            reportDate: new Date().toISOString(),
          }),
        }
      );

      if (response.ok) {
        Alert.alert(
          'Report Submitted',
          'Your report has been submitted successfully. The librarian will review it.',
          [{ text: 'OK', onPress: () => router.goBack() }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Report Book Issue</Text>
      <Text style={styles.bookTitle}>{bookTitle}</Text>
      <Text style={styles.bookAuthor}>by {bookAuthor}</Text>

      <View style={styles.reportTypeContainer}>
      <Text style={styles.label}>Report Type:</Text>
        <TouchableOpacity
          style={[
            styles.reportTypeButton,
            reportType === 'lost' && styles.selectedButton,
          ]}
          onPress={() => setReportType('lost')}
        >
          <Text style={styles.reportTypeText}>Lost Book</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.reportTypeButton,
            reportType === 'damaged' && styles.selectedButton,
          ]}
          onPress={() => setReportType('damaged')}
        >
          <Text style={styles.reportTypeText}>Damaged Book</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Describe the issue (optional):</Text>
      <TextInput
        style={styles.descriptionInput}
        placeholder="Describe the issue..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitReport}
      >
        <Text style={styles.submitButtonText}>Submit Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f8fafc' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#1e293b'
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
    textAlign: 'center'
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  reportTypeContainer: {
    marginBottom: 20
  },
  label: { 
    marginBottom: 12, 
    fontWeight: '600',
    fontSize: 16,
    color: '#374151'
  },
  reportTypeButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb'
  },
  selectedButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  reportTypeText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500'
  },
  descriptionInput: { 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 12, 
    padding: 16, 
    minHeight: 100, 
    marginBottom: 24,
    backgroundColor: '#ffffff',
    fontSize: 16,
    textAlignVertical: 'top'
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
  submitButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
});