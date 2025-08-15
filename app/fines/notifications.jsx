import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const notifications = [
  { id: 1, bookTitle: 'Book 2', message: 'Due tomorrow', subMessage: 'Please return soon!', type: 'warning' },
  { id: 2, bookTitle: 'Book 1', message: 'Due date: March 15', subMessage: 'Overdue by 2 days', type: 'danger' },
];

export default function FineNotificationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notification</Text>
      {notifications.map(n => (
        <View
          key={n.id}
          style={[
            styles.card,
            n.type === 'warning' ? styles.warning : styles.danger,
          ]}
        >
          <Text style={styles.title}>{n.bookTitle}</Text>
          <Text>{n.message}</Text>
          <Text style={n.type === 'danger' ? styles.dangerText : styles.warningText}>
            {n.subMessage}
          </Text>
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
  danger: { backgroundColor: '#fff1f0', borderColor: '#ffa39e', borderWidth: 1 },
  title: { fontWeight: 'bold', fontSize: 16 },
  warningText: { color: '#faad14', fontWeight: 'bold' },
  dangerText: { color: '#e74c3c', fontWeight: 'bold' },
});