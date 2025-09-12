import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import ApiService from '../../services/ApiService';

export default function ReportBookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookId = params.bookId || params.id;
  const bookTitle = params.title || 'Book';
  const bookAuthor = params.author || 'Unknown Author';
  const copyId = params.copyId || '';
  const copyNumber = params.copyNumber || '';
  const shelfLocation = params.shelfLocation || '';
  const dueDate = params.dueDate || '';

  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Using shared Header for consistent size/position

  const handleSubmitReport = async () => {
    if (!reportType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    try {
      setSubmitting(true);
      if (!bookId) {
        Alert.alert('Error', 'Missing book ID for report.');
        return;
      }
      
      const currentUser = await ApiService.getCurrentUser();
      if (!currentUser?.id) {
        Alert.alert('Error', 'You must be logged in to report a book.');
        return;
      }

      // First attempt: if we can resolve both IDs from borrowed list, use direct endpoint
      let attemptedDirect = false;
      try {
        const ub = await ApiService.getUserBooks(null, { status: 'borrowed', includeHistory: true });
        const items = ub?.data?.borrowedBooks || ub?.data?.books || ub?.data || [];
        const desiredBookId = String(bookId);
        const match = (items || []).find(b => String(b.bookId || (b.book && b.book.id) || b.id) === desiredBookId);
        if (match) {
          const copyIdResolved = String(
            match.copyId || match.copy_id || (match.copy && match.copy.id) || match.qrCode || match.qr_code || ''
          );
          const txnResolved = String(
            match.transactionId ||
            match.borrowTransactionId ||
            (match.borrowTransaction && match.borrowTransaction.id) ||
            match.id ||
            ''
          );
          if (copyIdResolved && txnResolved) {
            attemptedDirect = true;
            const payload = {
              reportType: reportType.toUpperCase(),
              bookId: desiredBookId,
              bookCopyId: copyIdResolved,
              userId: String(currentUser.id),
              transactionId: txnResolved,
              reportedBy: 'BORROWER',
              description: description.trim() || undefined,
              replacementCost: 0,
              fineAmount: 0,
            };
            const direct = await ApiService.createLostDamagedReport(payload);
            // Treat any 2xx JSON as success (backend returns plain object without success flag)
            if (direct) {
              Alert.alert('Report Submitted', 'Your report has been submitted successfully. The librarian will review it.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
              return;
            }
          }
        }
      } catch (ignore) {}

      // Fallback/secondary: mobile endpoint that infers copy/transaction from active borrow
      const resp = await ApiService.reportBook(currentUser.id, String(bookId), {
        reportType: reportType.toUpperCase(),
        description: description.trim() || undefined,
        reportDate: new Date().toISOString()
      });

      if (resp?.success) {
        Alert.alert(
          'Report Submitted',
          'Your report has been submitted successfully. The librarian will review it.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        const msg = String(resp?.message || '').toUpperCase();
        if (msg.includes('ONLY REPORT') || msg.includes('BORROW')) {
          Alert.alert('Not Borrowed', 'You can only report books you have actively borrowed.');
        } else if (attemptedDirect) {
          Alert.alert('Error', resp?.message || 'Failed to submit report. Please try again later.');
        } else {
          Alert.alert('Error', resp?.message || 'Failed to submit report');
        }
      }
    } catch (error) {
      console.error('Error submitting report (mobile endpoint):', error);
      const errMsg = String(error?.message || '').toUpperCase();
      // Fallback: try direct lost-damaged report creation per backend guide
      try {
        const currentUser = await ApiService.getCurrentUser();
        const userIdStr = String(currentUser?.id || '');
        if (!userIdStr) throw new Error('AUTH_REQUIRED');
        // Resolve copy/transaction via borrowed list
        const ub = await ApiService.getUserBooks(null, { status: 'borrowed', includeHistory: true });
        const items = ub?.data?.borrowedBooks || ub?.data?.books || ub?.data || [];
        const desiredBookId = String(bookId);
        const match = (items || []).find(b => String(b.bookId || (b.book && b.book.id) || b.id) === desiredBookId);
        if (!match) {
          Alert.alert('Not Borrowed', 'You can only report books you have actively borrowed.');
          return;
        }
        
        console.log('Found borrowed book match:', JSON.stringify(match, null, 2));
        
        const copyIdResolved = String(
          match.copyId || match.copy_id || (match.copy && match.copy.id) || match.qrCode || match.qr_code || ''
        );
        const txnResolved = String(
          match.transactionId ||
          match.borrowTransactionId ||
          (match.borrowTransaction && match.borrowTransaction.id) ||
          match.id ||
          ''
        );
        
        console.log('Resolved IDs - copyId:', copyIdResolved, 'transactionId:', txnResolved);
        
        if (!copyIdResolved || !txnResolved) {
          console.log('Missing required IDs - copyId:', copyIdResolved, 'transactionId:', txnResolved);
          Alert.alert('Missing Info', 'Could not resolve copy/transaction for this book. Please open My Books and try again from there.');
          return;
        }
        const payload = {
          reportType: reportType.toUpperCase(),
          bookId: desiredBookId,
          bookCopyId: copyIdResolved,
          userId: userIdStr,
          transactionId: txnResolved,
          reportedBy: 'BORROWER',
          description: description.trim() || undefined,
          replacementCost: 0,
          fineAmount: 0,
        };
        const direct = await ApiService.createLostDamagedReport(payload);
        if (direct) {
          Alert.alert('Report Submitted', 'Your report has been submitted successfully. The librarian will review it.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
          return;
        }
        Alert.alert('Error', direct?.message || 'Failed to submit report');
      } catch (fbErr) {
        console.error('Report fallback failed:', fbErr);
        if (errMsg.includes('NOT BORROWED') || String(fbErr?.message || '').toUpperCase().includes('NOT BORROWED')) {
          Alert.alert('Not Borrowed', 'You can only report books you have actively borrowed.');
        } else {
          Alert.alert('Error', error?.message || 'Failed to submit report. Please try again.');
        }
      }
    }
    finally { setSubmitting(false); }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Report Book Issue"
        showMenuButton={false}
        showBackButton={true}
        showNotificationButton={false}
        showProfileButton={false}
      />
      <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.card}>
        <Text style={styles.bookTitle}>{bookTitle}</Text>
        <Text style={styles.bookAuthor}>by {bookAuthor}</Text>
        <View style={styles.row}>
          {!!copyNumber && <Text style={styles.meta}>Copy #: {copyNumber}</Text>}
          {!!shelfLocation && <Text style={styles.meta}>Shelf: {shelfLocation}</Text>}
          {!!dueDate && <Text style={styles.meta}>Due: {new Date(dueDate).toLocaleDateString()}</Text>}
        </View>
        {!!copyId && <Text style={styles.meta}>Copy ID: {copyId}</Text>}
      </View>

      <View style={styles.reportTypeContainer}>
        <Text style={styles.label}>Report Type:</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, reportType === 'lost' && styles.typeBtnActive]}
            onPress={() => setReportType('lost')}
          >
            <Text style={[styles.typeBtnText, reportType === 'lost' && styles.typeBtnTextActive]}>Lost Book</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, reportType === 'damaged' && styles.typeBtnActive]}
            onPress={() => setReportType('damaged')}
          >
            <Text style={[styles.typeBtnText, reportType === 'damaged' && styles.typeBtnTextActive]}>Damaged Book</Text>
          </TouchableOpacity>
        </View>
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

      <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.7 }]} onPress={handleSubmitReport} disabled={submitting}>
        <Text style={styles.submitButtonText}>{submitting ? 'Submitting…' : 'Submit Report'}</Text>
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
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#1e293b'
  },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 0, borderColor: 'transparent', marginBottom: 16, marginTop: 12 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  meta: { color: '#6b7280', fontSize: 12 },
  reportTypeContainer: {
    marginBottom: 20
  },
  label: { 
    marginBottom: 12, 
    fontWeight: '600',
    fontSize: 16,
    color: '#374151'
  },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, backgroundColor: '#ffffff', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  typeBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  typeBtnText: { fontSize: 16, color: '#374151', fontWeight: '700' },
  typeBtnTextActive: { color: '#ffffff' },
  descriptionInput: { 
    borderWidth: 1, 
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