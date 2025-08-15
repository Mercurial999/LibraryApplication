import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const notifications = [
  { id: 1, bookTitle: 'Book 2', message: 'Due tomorrow', subMessage: 'Please return soon!', type: 'warning' },
  { id: 2, bookTitle: 'Book 1', date: 'mm/dd/yyyy', status: 'Pending Report' },
];

export default function ReportStatusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notification</Text>
      {notifications.map(n => (
        <View
          key={n.id}
          style={[
            styles.card,
            n.type === 'warning' ? styles.warning : styles.statusCard,
          ]}
        >
          <Text style={styles.title}>{n.bookTitle}</Text>
          {n.message && <Text>{n.message}</Text>}
          {n.subMessage && (
            <Text style={n.type === 'warning' ? styles.warningText : styles.statusText}>
              {n.subMessage}
            </Text>
          )}
          {n.status && (
            <>
              <Text>Date submitted: {n.date}</Text>
              <Text style={styles.statusText}>{n.status}</Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { marginBottom: 12, padding: 15, borderRadius: 8 },
  warning: { backgroundColor: '#fffbe6', borderColor: '#ffe58f', borderWidth: 1 },
  statusCard: { backgroundColor: '#f4f4f4', borderColor: '#ccc', borderWidth: 1 },
  title: { fontWeight: 'bold', fontSize: 16 },
  warningText: { color: '#faad14', fontWeight: 'bold' },
  statusText: { color: '#888', fontWeight: 'bold' },
});