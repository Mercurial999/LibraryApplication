import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Header = ({ title, subtitle, onMenuPress, showMenuButton = true }) => {
  const router = useRouter();

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    router.push('/account');
  };

  return (
    <View style={styles.header}>
      {showMenuButton && (
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onMenuPress}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rightContainer}>
        <TouchableOpacity 
          style={styles.notificationButton} 
          onPress={handleNotificationPress}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileContainer} onPress={handleProfilePress}>
          <Image 
            source={require('../assets/profile-placeholder.png')} 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9'
  },
  menuIcon: { 
    fontSize: 24, 
    color: '#475569' 
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1e293b',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400'
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  notificationIcon: {
    fontSize: 20,
    color: '#475569'
  },
  profileContainer: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9'
  },
  profileImage: { 
    width: 36, 
    height: 36, 
    borderRadius: 18
  }
});

export default Header;
