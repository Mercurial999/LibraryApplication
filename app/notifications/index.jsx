import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const notifications = [
  {
    id: 1,
    bookTitle: 'Book 2',
    message: 'Due tomorrow',
    subMessage: 'Please return soon!',
    type: 'due', // due date notification
  },
  {
    id: 2,
    bookTitle: 'Book 1',
    message: 'Date submitted: mm/dd/yyyy',
    subMessage: 'Pending Report',
    type: 'info', // report status
  },
  {
    id: 3,
    bookTitle: 'Book 4',
    message: '5 days Overdue',
    subMessage: 'Please return soon!',
    type: 'overdue', // overdue notification
  },
];

export default function NotificationsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Notification</Text>
      {notifications.map(n => (
        <View
          key={n.id}
          style={[
            styles.card,
            n.type === 'due' && styles.due,
            n.type === 'overdue' && styles.overdue,
            n.type === 'info' && styles.info,
          ]}
        >
          <Text style={styles.title}>{n.bookTitle}</Text>
          <Text>{n.message}</Text>
          <Text
            style={
              n.type === 'overdue'
                ? styles.overdueText
                : n.type === 'due'
                ? styles.dueText
                : styles.infoText
            }
          >
            {n.subMessage}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { marginBottom: 12, padding: 15, borderRadius: 8 },
  due: { backgroundColor: '#fffbe6', borderColor: '#ffe58f', borderWidth: 1 },
  overdue: { backgroundColor: '#fff1f0', borderColor: '#ffa39e', borderWidth: 1 },
  info: { backgroundColor: '#f4f4f4', borderColor: '#ccc', borderWidth: 1 },
  title: { fontWeight: 'bold', fontSize: 16 },
  dueText: { color: '#faad14', fontWeight: 'bold' },
  overdueText: { color: '#e74c3c', fontWeight: 'bold' },
  infoText: { color: '#888', fontWeight: 'bold' },
});