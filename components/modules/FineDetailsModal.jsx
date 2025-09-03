import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FineDetailsModal({ visible, onClose, fine }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Fine Details</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            <Text style={styles.amount}>₱{Number(fine?.amountDue ?? fine?.amount ?? 0).toFixed(2)}</Text>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{fine?.fineType || 'Overdue fine'}</Text>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{fine?.status}</Text>

            <Text style={styles.section}>Book</Text>
            <Text style={styles.value}>{fine?.book?.title} — {fine?.book?.author}</Text>

            <Text style={styles.section}>Borrow Transaction</Text>
            <Text style={styles.value}>Borrowed: {fine?.borrowTransaction?.borrowDate ? new Date(fine.borrowTransaction.borrowDate).toLocaleDateString() : '-'}</Text>
            <Text style={styles.value}>Due: {fine?.borrowTransaction?.dueDate ? new Date(fine.borrowTransaction.dueDate).toLocaleDateString() : '-'}</Text>

            <Text style={styles.section}>Payment History</Text>
            {fine?.paymentHistory?.length ? fine.paymentHistory.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={styles.value}>₱{Number(p.amount).toFixed(2)} — {p.paymentMethod || 'N/A'}</Text>
                <Text style={styles.meta}>{new Date(p.datePaid).toLocaleString()}</Text>
              </View>
            )) : (
              <Text style={styles.meta}>No payments yet</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', backgroundColor: '#0b1220', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  close: { color: '#94a3b8', fontSize: 20 },
  amount: { color: '#f59e0b', fontSize: 28, fontWeight: '800', marginVertical: 8 },
  label: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  value: { color: '#e2e8f0', fontSize: 14 },
  section: { color: '#93c5fd', fontSize: 14, fontWeight: '700', marginTop: 16 },
  paymentRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  meta: { color: '#94a3b8', fontSize: 12 }
});


