import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import ApiService from '../../services/ApiService';
import { formatPeso } from '../../utils/CurrencyUtils';

export default function ReportStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await ApiService.listLostDamagedReports({ userId: 'current' }).catch(async () => {
          // if backend ignores user filter, get all then filter client-side
          const all = await ApiService.listLostDamagedReports({}).catch(() => ({ data: [] }));
          return all;
        });
        const rows = Array.isArray(res) ? res : (res?.data || res?.reports || []);
        const currentUser = await ApiService.getCurrentUser();
        const mine = (rows || []).filter(r => String(r.userId || r.user_id || '') === String(currentUser?.id || ''));
        if (mounted) setReports(mine);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load reports');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <Header title="My Reports" showNotificationButton={false} showProfileButton={false} />
      <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {loading && (
          <View style={styles.centerRow}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={{ marginLeft: 8, color: '#64748b' }}>Loading reports…</Text>
          </View>
        )}
        {!!error && !loading && (
          <Text style={styles.error}>{error}</Text>
        )}
        {!loading && !error && reports.length === 0 && (
          <Text style={styles.note}>No reports yet.</Text>
        )}
        {!loading && !error && reports.map(r => {
          const status = String(r.status || 'PENDING');
          const reportType = String(r.reportType || r.type || 'UNKNOWN');
          const bookTitle = r.bookTitle || (r.book && r.book.title) || 'Book';
          const submitted = r.reportDate || r.createdAt || r.created_at;
          const resolved = r.resolutionDate || r.resolvedAt || null;
          const fineAmount = r.fineAmount || 0;
          const replacementCost = r.replacementCost || 0;
          
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{bookTitle}</Text>
                <View style={styles.statusContainer}>
                  <Text style={[styles.badge, 
                    status === 'PENDING' ? styles.pending : 
                    status === 'PROCESSED' ? styles.processed :
                    (status === 'RESOLVED' || status === 'FULFILLED') ? styles.resolved : 
                    styles.other
                  ]}>
                    {status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.reportInfo}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons 
                    name={reportType === 'LOST' ? 'book-off' : 'book-alert'} 
                    size={16} 
                    color={reportType === 'LOST' ? '#dc2626' : '#f59e0b'} 
                  />
                  <Text style={styles.infoText}>
                    {reportType === 'LOST' ? 'Lost Book' : 'Damaged Book'}
                  </Text>
                </View>
                
                {!!submitted && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#64748b" />
                    <Text style={styles.infoText}>
                      Submitted: {new Date(submitted).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                {!!resolved && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.infoText}>
                      Resolved: {new Date(resolved).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {!!r.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description:</Text>
                  <Text style={styles.description}>{r.description}</Text>
                </View>
              )}

              {/* Show fine information if applicable */}
              {(fineAmount > 0 || replacementCost > 0) && (
                <View style={styles.fineContainer}>
                  <View style={styles.fineHeader}>
                    <MaterialCommunityIcons name="currency-usd" size={16} color="#dc2626" />
                    <Text style={styles.fineLabel}>Fine Information</Text>
                  </View>
                  {fineAmount > 0 && (
                    <Text style={styles.fineAmount}>
                      Fine Amount: {formatPeso(fineAmount)}
                    </Text>
                  )}
                  {replacementCost > 0 && (
                    <Text style={styles.replacementCost}>
                      Replacement Cost: {formatPeso(replacementCost)}
                    </Text>
                  )}
                  {status === 'PROCESSED' && (
                    <Text style={styles.fineNote}>
                      This fine has been added to your overdue & fines module
                    </Text>
                  )}
                </View>
              )}
        </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  error: { color: '#ef4444', padding: 16 },
  note: { color: '#6b7280', padding: 16 },
  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 12
  },
  title: { 
    fontWeight: '700', 
    fontSize: 16, 
    color: '#111827',
    flex: 1,
    marginRight: 8
  },
  statusContainer: {
    alignItems: 'flex-end'
  },
  badge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 999, 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 12,
    textTransform: 'uppercase'
  },
  pending: { backgroundColor: '#f59e0b' },
  processed: { backgroundColor: '#3b82f6' },
  resolved: { backgroundColor: '#10b981' },
  other: { backgroundColor: '#6b7280' },
  reportInfo: {
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  infoText: {
    color: '#6b7280',
    fontSize: 14,
    marginLeft: 8
  },
  descriptionContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  descriptionLabel: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 14,
    marginBottom: 4
  },
  description: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20
  },
  fineContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12
  },
  fineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  fineLabel: {
    fontWeight: '600',
    color: '#dc2626',
    fontSize: 14,
    marginLeft: 6
  },
  fineAmount: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  replacementCost: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 4
  },
  fineNote: {
    color: '#7c2d12',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4
  }
});