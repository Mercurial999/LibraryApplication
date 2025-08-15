import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const DashboardScreen = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();


const menuItems = [
  { label: 'Dashboard', route: '/dashboard' },
  { label: 'Book Catalog', route: '/book-catalog' },
  { label: 'My Books', route: '/borrowing/my-books' },
  { label: 'Book Reservation', route: '/borrowing/request' },
  { label: 'Book Requests', route: '/borrowing/my-requests' },
  { label: 'Overdue Fines', route: '/fines' },
  { label: 'Recommendations', route: '/recommendations' },
  { label: 'Reports', route: '/reports' },
  { label: 'Teacher Requests', route: '/teacher-requests' },
  { label: 'Notifications', route: '/notifications' },
  { label: 'Account', route: '/account' }, // Only if you have this folder/file
  { label: 'Logout', route: '/login' },
];


  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Dashboard</Text>
        <View style={styles.profileCircle} />
      </View>

      {/* Sidebar Menu */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuUser}>User1{'\n'}ID: 000000</Text>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push(item.route);
                }}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Main Content */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>My Books</Text>
          <Text style={styles.cardValue}>3 borrowed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Overdue</Text>
          <Text style={styles.cardValue}>1 pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Book Requests</Text>
          <Text style={styles.cardValue}>2 pending</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Recent Activity:</Text>
      <View style={styles.activityCard}>
        <Text style={styles.activityTitle}>Book 1</Text>
        <Text style={styles.activitySubtitle}>Due in 5 days</Text>
      </View>
      <View style={styles.activityCard}>
        <Text style={styles.activityTitle}>Book 2</Text>
        <Text style={styles.activitySubtitle}>Returned</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 10, paddingTop: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#e0e0e0' },
  menuIcon: { fontSize: 28, marginRight: 16, color: '#007aff' },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#2176d2', textAlign: 'center' },
  profileCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0', marginLeft: 16 },
  section: { marginTop: 24 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardValue: { color: '#2176d2', fontWeight: 'bold' },
  sectionTitle: { marginTop: 18, marginBottom: 6, fontWeight: 'bold', fontSize: 16 },
  activityCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 8 },
  activityTitle: { fontWeight: 'bold', fontSize: 15 },
  activitySubtitle: { color: '#888', fontSize: 13 },
  // Sidebar styles
  overlay: { flex: 1, flexDirection: 'row' },
  menu: { width: 220, backgroundColor: '#2176d2', paddingTop: 40, paddingHorizontal: 16, height: '100%' },
  menuUser: { color: '#fff', fontWeight: 'bold', marginBottom: 24, fontSize: 16 },
  menuItem: { paddingVertical: 12 },
  menuItemText: { color: '#fff', fontSize: 16 },
});

export default DashboardScreen;