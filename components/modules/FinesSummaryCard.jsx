import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function FinesSummaryCard({ summary }) {
  const total = Number(summary?.totalFines || 0);
  const paid = Number(summary?.paidAmount || 0);
  const remaining = Number(summary?.remainingAmount || (total - paid));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Fines Summary</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.total}>₱{total.toFixed(2)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Paid</Text>
          <Text style={styles.paid}>₱{paid.toFixed(2)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Remaining</Text>
          <Text style={styles.remaining}>₱{remaining.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Overdue: {summary?.overdueCount || 0}</Text>
        <Text style={styles.meta}>Unpaid fines: {summary?.unpaidFinesCount || 0}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0b1220', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1f2937' },
  title: { color: '#e2e8f0', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', flex: 1 },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  total: { color: '#f59e0b', fontSize: 24, fontWeight: '800' },
  paid: { color: '#22c55e', fontSize: 20, fontWeight: '700' },
  remaining: { color: '#ef4444', fontSize: 20, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  meta: { color: '#94a3b8', fontSize: 12 }
});


