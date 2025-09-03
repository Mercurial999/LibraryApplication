import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const Sidebar = ({ visible, onClose, currentRoute }) => {
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-280)).current;

  // Load user data
  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        setUserData(JSON.parse(userDataString));
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const baseItems = [
    { label: 'Dashboard', route: '/dashboard', icon: '🏠' },
    { label: 'Book Catalog', route: '/book-catalog', icon: '📚' },
    { label: 'My Books', route: '/borrowing/my-books', icon: '📖' },
    { label: 'My Requests', route: '/borrowing/my-requests', icon: '📋' },
    { label: 'Book Reservation', route: '/borrowing/reserve', icon: '🔖' },
    { label: 'Overdue & Fines', route: '/overdue-fines', icon: '⚠️' },
    { label: 'Recommendations', route: '/recommendations', icon: '⭐' },
    { label: 'Reports', route: '/reports', icon: '📊' },
    { label: 'Account', route: '/account', icon: '👤' },
    { label: 'Logout', route: '/login', icon: '🚪' },
  ];

  const menuItems = React.useMemo(() => {
    const items = [...baseItems];
    const role = String(userData?.role || '').toUpperCase();
    if (role === 'TEACHER') {
      items.splice(8, 0, { label: 'Teacher Requests', route: '/teacher-requests', icon: '👨‍🏫' });
    }
    return items;
  }, [userData]);

  const handleNavigation = (route) => {
    // Don't close sidebar - keep it open for faster navigation
    router.push(route);
  };

  const isCurrentRoute = (route) => {
    return currentRoute === route;
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.menuHeader}>
            <Image 
              source={require('../assets/profile-placeholder.png')} 
              style={styles.menuProfileImage} 
            />
            <View style={styles.menuUserInfo}>
              <Text style={styles.menuUserName}>
                {userData?.fullName || userData?.firstName || 'User Name'}
              </Text>
              <Text style={styles.menuUserId}>
                ID: {userData?.id || '000000'}
              </Text>
              <Text style={styles.menuUserRole}>
                {userData?.role || 'Student'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.menuCloseButton}
              onPress={onClose}
            >
              <Text style={styles.menuCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.menuHint}>
            <Text style={styles.menuHintText}>💡 Tap menu items to navigate</Text>
          </View>
          
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  isCurrentRoute(item.route) && styles.activeMenuItem
                ]}
                onPress={() => handleNavigation(item.route)}
              >
                <Text style={[
                  styles.menuItemIcon,
                  isCurrentRoute(item.route) && styles.activeMenuItemIcon
                ]}>
                  {item.icon}
                </Text>
                <Text style={[
                  styles.menuItemText,
                  isCurrentRoute(item.route) && styles.activeMenuItemText
                ]}>
                  {item.label}
                </Text>
                {isCurrentRoute(item.route) && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
        <Pressable style={styles.overlayPressable} onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    flexDirection: 'row' 
  },
  overlayPressable: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  menu: { 
    width: 280, 
    backgroundColor: '#1e293b', 
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  menuHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center'
  },
  menuProfileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16
  },
  menuUserInfo: {
    alignItems: 'center'
  },
  menuUserName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  menuUserId: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 2
  },
  menuUserRole: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  menuCloseButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155'
  },
  menuCloseIcon: {
    fontSize: 20,
    color: '#ffffff'
  },
  menuHint: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#262626',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  menuHintText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic'
  },
  menuScroll: {
    flex: 1,
    paddingTop: 16
  },
  menuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: 'transparent'
  },
  activeMenuItem: {
    backgroundColor: '#3b82f6',
    borderLeftWidth: 4,
    borderLeftColor: '#ffffff'
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
    color: '#e2e8f0'
  },
  activeMenuItemIcon: {
    color: '#ffffff'
  },
  menuItemText: { 
    color: '#e2e8f0', 
    fontSize: 16,
    fontWeight: '500',
    flex: 1
  },
  activeMenuItemText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginLeft: 8
  }
});

export default Sidebar;
