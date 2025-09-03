import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const getOverdueColor = (days) => {
  if (days >= 30) return '#ef4444';
  if (days >= 15) return '#f97316';
  if (days >= 7) return '#f59e0b';
  return '#10b981';
};

export default function OverdueBookCard({ book, onPayFine, onViewDetails }) {
  const overdueColor = getOverdueColor(book.daysOverdue || 0);

  return (
    <View style={[styles.card, { borderLeftColor: overdueColor }]}> 
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.subtitle}>{book.author}</Text>
          <Text style={styles.meta}>QR: {book.qrCode}</Text>
          <Text style={styles.meta}>Due: {new Date(book.dueDate).toLocaleDateString()}</Text>
        </View>
        <View>
          <Text style={[styles.daysOverdue, { color: overdueColor }]}>{book.daysOverdue} days overdue</Text>
          <Text style={styles.fine}>₱{Number(book?.fine?.amountDue || 0).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.payBtn} onPress={onPayFine}>
          <Text style={styles.payText}>Pay Fine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailsBtn} onPress={onViewDetails}>
          <Text style={styles.detailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981'
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 },
  meta: { color: '#94a3b8', fontSize: 12 },
  daysOverdue: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  fine: { color: '#f59e0b', fontSize: 20, fontWeight: '800', textAlign: 'right', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  payBtn: { backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  payText: { color: '#052e16', fontWeight: '700' },
  detailsBtn: { backgroundColor: '#334155', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  detailsText: { color: '#e2e8f0', fontWeight: '600' }
});


