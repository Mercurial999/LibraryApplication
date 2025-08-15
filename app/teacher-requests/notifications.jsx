import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const notifications = [
  {
    id: 1,
    title: 'Book Request Approved',
    message: 'Your request for "Teaching Mathematics" has been approved.',
    time: 'Today, 10:32 AM',
    highlight: true,
  },
  {
    id: 2,
    title: 'Book Ready for Pickup',
    message: '"Teaching Physics" is now available at the library.',
    time: 'Yesterday, 2:15 PM',
    highlight: false,
  },
  {
    id: 3,
    title: 'Request Status Changed',
    message: '"History of Science" request status changed to "In Progress".',
    time: 'Yesterday, 11:20 AM',
    highlight: false,
  },
];

export default function TeacherRequestNotificationsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {notifications.map(n => (
        <View key={n.id} style={[styles.card, n.highlight && styles.highlight]}>
          <Text style={styles.title}>{n.title}</Text>
          <Text>{n.message}</Text>
          <Text style={styles.time}>{n.time}</Text>
        </View>
      ))}
      <View style={styles.settingsBtn}>
        <Text style={styles.settingsText}>Settings</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#f9f9f9', marginBottom: 12, padding: 15, borderRadius: 8 },
  highlight: { backgroundColor: '#eaf6ff', borderColor: '#3498db', borderWidth: 1 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  time: { color: '#888', fontSize: 12, marginTop: 4 },
  settingsBtn: { alignItems: 'flex-end', marginTop: 10 },
  settingsText: { color: '#3498db', fontWeight: 'bold' },
});