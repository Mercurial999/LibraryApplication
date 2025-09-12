import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const ReportsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [borrowed, setBorrowed] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('REPORT'); // REPORT | STATUS
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [reports, setReports] = useState([]);
  const [reportedIndex, setReportedIndex] = useState({}); // key: transactionId|copyId -> report

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const currentUser = await ApiService.getCurrentUser();
        const [resp, reportsRes] = await Promise.all([
          ApiService.getUserBooks(null, { status: 'borrowed', includeHistory: false }),
          ApiService.listLostDamagedReports({ userId: String(currentUser?.id || ''), status: 'all' }).catch(() => ({ data: [] }))
        ]);
        // Some implementations return envelope at resp.data; others direct array
        const items = resp?.data?.borrowedBooks || resp?.data?.books || resp?.data || [];
        const normalized = (items || []).filter(b => (b.status || '').toLowerCase() === 'borrowed');
        // Build reported index for quick lookup
        const rows = Array.isArray(reportsRes)
          ? reportsRes
          : (Array.isArray(reportsRes?.data) ? reportsRes.data : (reportsRes?.data?.reports || reportsRes?.reports || []));
        const index = {};
        (rows || []).forEach(r => {
          const txn = String(r.transactionId || r.borrowTransactionId || r.transaction_id || '');
          const copy = String(r.bookCopyId || r.copyId || r.copy_id || '');
          if (txn) index[`txn:${txn}`] = r;
          if (copy) index[`copy:${copy}`] = r;
        });
        if (isMounted) setBorrowed(normalized);
        if (isMounted) setReportedIndex(index);
      } catch (e) {
        if (isMounted) setError(e?.message || 'Failed to load borrowed books');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // Load user reports when switching to STATUS tab
  useEffect(() => {
    if (activeTab !== 'STATUS') return;
    let mounted = true;
    (async () => {
      setReportsLoading(true);
      setReportsError('');
      try {
        const currentUser = await ApiService.getCurrentUser();
        const uid = String(currentUser?.id || '');
        const res = await ApiService.listLostDamagedReports({ userId: uid, status: 'all' }).catch(() => ({ success: false, data: [] }));
        const rows = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (res?.data?.reports || res?.reports || []));
        if (mounted) setReports(rows || []);
      } catch (e) {
        if (mounted) setReportsError(e?.message || 'Failed to load reports');
      } finally {
        if (mounted) setReportsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab]);

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
      {/* Tabs like reservations module */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          onPress={() => setActiveTab('REPORT')} 
          style={[styles.tab, activeTab === 'REPORT' && styles.activeTab]}
        >
          <Text style={activeTab === 'REPORT' ? styles.activeTabText : styles.tabText}>Report Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('STATUS')} 
          style={[styles.tab, activeTab === 'STATUS' && styles.activeTab]}
        >
          <Text style={activeTab === 'STATUS' ? styles.activeTabText : styles.tabText}>My Reports</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'REPORT' ? (
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
          {!loading && !error && borrowed.map(item => {
          const bookId = item.bookId || item.id;
          const title = item.bookTitle || item.title;
          const author = item.bookAuthor || item.author;
          const dueDate = item.dueDate || item.borrowDueDate || '';
          const copyId = item.copyId || item.copy_id || (item.copy && item.copy.id) || item.qrCode || item.qr_code || '';
          const copyNumber = item.copyNumber || (item.copy && item.copy.copyNumber) || item.copy_number || item.number || '';
          const shelfLocation = item.shelfLocation || (item.copy && item.copy.shelfLocation) || item.location || '';
          const transactionId = item.transactionId || item.borrowTransactionId || (item.borrowTransaction && item.borrowTransaction.id) || '';
          const reported = reportedIndex[`txn:${String(transactionId)}`] || reportedIndex[`copy:${String(copyId)}`];
          return (
            <View key={`${bookId}_${copyId || copyNumber || 'x'}`} style={styles.bookCard}>
              <Text style={styles.reportIssueBookTitle}>{title}</Text>
              <Text style={styles.bookAuthor}>by {author}</Text>
              <View style={{ marginTop: 6 }}>
                {!!copyNumber && <Text style={styles.meta}>Copy #: {String(copyNumber)}</Text>}
                {!!shelfLocation && <Text style={styles.meta}>Shelf: {shelfLocation}</Text>}
                {!!dueDate && (<Text style={styles.borrowDate}>Due: {new Date(dueDate).toLocaleDateString()}</Text>)}
              </View>
              {reported ? (
                <View style={styles.reportedBanner}>
                  <Text style={styles.reportedText}>
                    {`Reported as ${String(reported.reportType || '').toUpperCase() || 'ISSUE'}. This copy can no longer be renewed or reported again.`}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.reportBtn, !(copyId || copyNumber) && { opacity: 0.6 }]}
                  onPress={() => router.push({ pathname: '/reports/report', params: { bookId, title, author, dueDate: dueDate || '', copyId: copyId || '', copyNumber: String(copyNumber || ''), shelfLocation, transactionId } })}
                  disabled={!(copyId || copyNumber)}
                >
                  <Text style={styles.reportText}>Report Lost / Damaged</Text>
                </TouchableOpacity>
              )}
            </View>
          );
          })}
          <Text style={styles.note}>Note: You can only report books you have currently borrowed.</Text>
        </View>
      ) : (
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ 
            paddingHorizontal: 20, 
            paddingBottom: 24,
            paddingTop: 16
          }}
          showsVerticalScrollIndicator={false}
        >
          {reportsLoading && (
            <View style={styles.centerRow}>
              <ActivityIndicator color="#3b82f6" />
              <Text style={{ marginLeft: 8, color: '#64748b' }}>Loading reports…</Text>
            </View>
          )}
          {!!reportsError && !reportsLoading && (
            <Text style={styles.errorText}>{reportsError}</Text>
          )}
          {!reportsLoading && !reportsError && reports.length === 0 && (
            <Text style={styles.note}>No reports yet.</Text>
          )}
          {!reportsLoading && !reportsError && reports.map(r => {
            const status = String(r.status || 'PENDING');
            const bookTitle = r.bookTitle || (r.book && r.book.title) || 'Book';
            const bookAuthor = r.bookAuthor || (r.book && r.book.author) || 'Unknown Author';
            const submitted = r.reportDate || r.createdAt || r.created_at;
            const resolved = r.resolutionDate || r.resolvedAt || null;
            const reportType = String(r.reportType || 'LOST');
            const copyNumber = r.bookCopyNumber || r.copyNumber || r.copy_number || '';
            
            // Get status display info with enhanced status mapping
            const getStatusDisplay = (status, resolutionType, reportType) => {
              switch (status) {
                case 'PENDING':
                  return { text: 'Under Review', color: '#FFA500', icon: 'clock-outline' };
                case 'PROCESSED':
                  return { text: 'Processed', color: '#6B7280', icon: 'cog-outline' };
                case 'RESOLVED':
                  if (resolutionType === 'FINE_PAID') {
                    return { text: 'Fine Paid', color: '#28A745', icon: 'check-circle' };
                  } else if (resolutionType === 'WAIVED') {
                    return { text: 'Fine Waived', color: '#17A2B8', icon: 'information' };
                  }
                  return { text: 'Resolved', color: '#28A745', icon: 'check-circle' };
                case 'RETURNED_LOST':
                  return { text: 'Returned (Marked as Lost)', color: '#DC2626', icon: 'book-off' };
                case 'RETURNED_DAMAGED':
                  return { text: 'Returned (Marked as Damaged)', color: '#F59E0B', icon: 'wrench' };
                case 'COMPLETED':
                  return { text: 'Report Completed', color: '#10B981', icon: 'check-circle' };
                case 'CANCELLED':
                  return { text: 'Report Cancelled', color: '#6B7280', icon: 'close-circle' };
                default:
                  return { text: 'Reported as ' + reportType, color: '#DC2626', icon: 'alert-circle' };
              }
            };
            
            const statusDisplay = getStatusDisplay(status, r.resolutionType, reportType);
            
            return (
              <View key={r.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{bookTitle}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
                    <MaterialCommunityIcons name={statusDisplay.icon} size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.statusText}>{statusDisplay.text}</Text>
                  </View>
                </View>
                <Text style={styles.bookAuthor}>by {bookAuthor}</Text>
                <View style={styles.reportDetails}>
                  <View style={styles.reportTypeContainer}>
                    <MaterialCommunityIcons 
                      name={reportType === 'LOST' ? 'book-off' : 'wrench'} 
                      size={16} 
                      color="#374151" 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={styles.reportType}>
                      {reportType === 'LOST' ? 'Lost' : 'Damaged'}
                    </Text>
                  </View>
                  {!!copyNumber && <Text style={styles.copyInfo}>Copy #{copyNumber}</Text>}
                  {!!submitted && <Text style={styles.submittedDate}>Submitted: {new Date(submitted).toLocaleDateString()}</Text>}
                  {!!resolved && <Text style={styles.resolvedDate}>Resolved: {new Date(resolved).toLocaleDateString()}</Text>}
                  {!!r.description && <Text style={styles.description}>{r.description}</Text>}
                </View>
                {r.fineAmount > 0 && (
                  <View style={styles.fineInfo}>
                    <Text style={styles.fineAmount}>Fine: ₱{r.fineAmount}</Text>
                    {status === 'PENDING' && (
                      <Text style={styles.fineNote}>Payment required</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 20 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  activeTab: { borderColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  activeTabText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  bookCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  bookTitle: { 
    fontWeight: '700', 
    fontSize: 16, 
    marginBottom: 2, 
    color: '#111827',
    flex: 1,
    marginRight: 12,
    lineHeight: 20
  },
  reportIssueBookTitle: { 
    fontWeight: '700', 
    fontSize: 16, 
    marginBottom: 2, 
    color: '#111827'
  },
  bookAuthor: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  borrowDate: { fontSize: 12, color: '#374151', marginBottom: 8 },
  meta: { fontSize: 12, color: '#6b7280' },
  reportBtn: { marginTop: 10, alignItems: 'flex-end' },
  reportText: { color: '#ef4444', fontWeight: '700' },
  reportedBanner: { marginTop: 10, backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  reportedText: { color: '#92400e', fontWeight: '700', fontSize: 12 },
  note: { margin: 10, color: '#6b7280', fontSize: 12 },
  
  // Report Card Styles
  reportCard: { 
    backgroundColor: '#ffffff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 6, 
    elevation: 2,
    minHeight: 120
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    minHeight: 40
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  reportDetails: {
    marginBottom: 12,
    paddingTop: 4
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  reportType: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600'
  },
  copyInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  submittedDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  resolvedDate: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 4
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4
  },
  fineInfo: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  fineAmount: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 4
  },
  fineNote: {
    fontSize: 12,
    color: '#dc2626'
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginVertical: 20
  }
});

export default ReportsScreen;