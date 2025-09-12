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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: '#1f2937', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 4 },
  meta: { color: '#6b7280', fontSize: 12 },
  daysOverdue: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  fine: { color: '#f59e0b', fontSize: 20, fontWeight: '800', textAlign: 'right', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  payBtn: { backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  payText: { color: '#ffffff', fontWeight: '700' },
  detailsBtn: { backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  detailsText: { color: '#111827', fontWeight: '600' }
});


