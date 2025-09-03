import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';

const NotificationsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const router = useRouter();

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

  return (
    <View style={styles.container}>
      <Header 
        title="Notifications"
        subtitle="Stay updated with library alerts"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/notifications"
      />
      <FlatList
        data={notifications}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            key={item.id}
            style={[
              styles.card,
              item.type === 'due' && styles.due,
              item.type === 'overdue' && styles.overdue,
              item.type === 'info' && styles.info,
            ]}
          >
            <Text style={styles.title}>{item.bookTitle}</Text>
            <Text>{item.message}</Text>
            <Text
              style={
                item.type === 'overdue'
                  ? styles.overdueText
                  : item.type === 'due'
                  ? styles.dueText
                  : styles.infoText
              }
            >
              {item.subMessage}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContainer: { flex: 1 },
  listContent: { padding: 20 },
  card: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  due: { borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  overdue: { borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
  info: { borderLeftWidth: 4, borderLeftColor: '#3498db' },
  dueText: { color: '#f39c12', fontWeight: 'bold' },
  overdueText: { color: '#e74c3c', fontWeight: 'bold' },
  infoText: { color: '#3498db', fontWeight: 'bold' },
});