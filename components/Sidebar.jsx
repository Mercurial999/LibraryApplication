import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ApiService from '../services/ApiService';

const { width } = Dimensions.get('window');

const Sidebar = ({ visible, onClose, currentRoute }) => {
  const [userData, setUserData] = useState(null);
  const convertToCloudinaryUrl = (localPath) => {
    if (!localPath) return null;
    
    // If it's already a Cloudinary URL, return as is
    if (localPath.includes('cloudinary.com')) return localPath;
    
    // If it's a local file path like "library_system/anonymous_studentPhoto_1757136409412"
    // Convert it to a proper Cloudinary URL
    if (localPath.includes('library_system/')) {
      // Extract the public ID from the local path
      const publicId = localPath.replace('library_system/', '');
      // Construct Cloudinary URL (you may need to adjust the cloud name)
      return `https://res.cloudinary.com/dabtmqfym/image/upload/c_thumb,g_auto/w_72/h_72/library_system/${publicId}`;
    }
    
    return null;
  };

  const resolvePhotoUrl = (ud) => {
    if (!ud) return null;
    const direct = ud.profileImage || ud.profileImageUrl || ud.studentPhoto || ud.studentPhotoUrl || ud.avatarUrl || ud.photoUrl || ud.photo || ud.imageUrl;
    if (direct) {
      // Convert local file path to Cloudinary URL if needed
      const cloudinaryUrl = direct.includes('cloudinary.com') ? direct : convertToCloudinaryUrl(direct);
      if (cloudinaryUrl) {
        // Apply Cloudinary optimization for mobile display
        if (cloudinaryUrl.includes('cloudinary.com') && !cloudinaryUrl.includes('?')) {
          return `${cloudinaryUrl}?w_72,h_72,c_fill,g_auto,q_auto,f_auto`;
        }
        return cloudinaryUrl;
      }
      return direct;
    }
    const nested = (ud.user && (ud.user.profileImage || ud.user.profileImageUrl || ud.user.studentPhoto || ud.user.studentPhotoUrl || ud.user.avatarUrl))
      || (ud.profile && (ud.profile.photoUrl || ud.profile.imageUrl));
    if (nested) {
      // Convert local file path to Cloudinary URL if needed
      const cloudinaryUrl = nested.includes('cloudinary.com') ? nested : convertToCloudinaryUrl(nested);
      if (cloudinaryUrl) {
        // Apply Cloudinary optimization for mobile display
        if (cloudinaryUrl.includes('cloudinary.com') && !cloudinaryUrl.includes('?')) {
          return `${cloudinaryUrl}?w_72,h_72,c_fill,g_auto,q_auto,f_auto`;
        }
        return cloudinaryUrl;
      }
      return nested;
    }
    return null;
  };
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const parsed = JSON.parse(userDataString);
        
        // Map studentPhoto to profileImage for consistency
        const mappedUserData = {
          ...parsed,
          profileImage: parsed.profileImage || parsed.studentPhoto
        };
        
        if (!resolvePhotoUrl(mappedUserData)) {
          try {
            const profile = await ApiService.getUserProfile();
            console.log('Sidebar profile response:', profile?.data);
            const photoUrl = profile?.data?.profileImage || profile?.data?.studentPhoto || profile?.data?.studentPhotoUrl || profile?.data?.profileImageUrl || profile?.data?.photoUrl || profile?.data?.avatarUrl;
            console.log('Sidebar: Profile API response:', profile?.data);
            console.log('Sidebar: Photo URL from API:', photoUrl);
            if (photoUrl) {
              const merged = { ...mappedUserData, profileImage: photoUrl };
              console.log('Sidebar: Merged user data with photo:', merged);
              setUserData(merged);
              await AsyncStorage.setItem('userData', JSON.stringify(merged));
            } else {
              // Update with profile data even if no photo
              const updatedData = {
                ...mappedUserData,
                email: profile?.data?.email || mappedUserData.email,
                firstName: profile?.data?.firstName || mappedUserData.firstName,
                lastName: profile?.data?.lastName || mappedUserData.lastName,
                role: profile?.data?.role || mappedUserData.role
              };
              setUserData(updatedData);
              await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
            }
          } catch {
            setUserData(mappedUserData);
          }
        } else {
          setUserData(mappedUserData);
        }
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
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const baseItems = [
    { label: 'Dashboard', route: '/dashboard', icon: 'view-dashboard-outline', section: 'main' },
    { label: 'Book Catalog', route: '/book-catalog', icon: 'bookshelf', section: 'main' },
    { label: 'My Books', route: '/borrowing/my-books', icon: 'book-open-variant', section: 'borrowing' },
    { label: 'My Requests', route: '/borrowing/my-requests', icon: 'clipboard-text-outline', section: 'borrowing' },
    { label: 'Reservations', route: '/borrowing/reserve', icon: 'bookmark-multiple-outline', section: 'borrowing' },
    { label: 'Fines & Overdue', route: '/overdue-fines', icon: 'credit-card-outline', section: 'borrowing' },
    { label: 'Recommendations', route: '/recommendations', icon: 'star-outline', section: 'features' },
    { label: 'Reports', route: '/reports', icon: 'chart-box-outline', section: 'features' },
    { label: 'Account Settings', route: '/account', icon: 'cog-outline', section: 'account' },
    { label: 'Sign Out', route: '/login', icon: 'logout', section: 'account' },
  ];

  const menuItems = React.useMemo(() => {
    const items = [...baseItems];
    const role = String(userData?.role || '').toUpperCase();
    if (role === 'TEACHER') {
      items.splice(8, 0, { label: 'Teacher Requests', route: '/teacher-requests', icon: 'briefcase-outline', section: 'features' });
    }
    return items;
  }, [userData]);

  const handleNavigation = (route) => {
    router.push(route);
    // Close sidebar after slight delay to allow push animation to begin
    requestAnimationFrame(() => {
      onClose && onClose();
    });
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
            <View style={styles.profileRow}>
              {resolvePhotoUrl(userData) ? (
                <Image 
                  source={{ uri: resolvePhotoUrl(userData) }} 
                  style={styles.menuProfileImage}
                  onError={() => {
                    console.log('Sidebar: Profile image failed to load, using placeholder');
                  }}
                  onLoad={() => {
                    console.log('Sidebar: Profile image loaded successfully:', resolvePhotoUrl(userData));
                  }}
                />
              ) : (
                <Image 
                  source={require('../assets/profile-placeholder.png')} 
                  style={styles.menuProfileImage}
                  onLoad={() => {
                    console.log('Sidebar: Using placeholder image');
                  }}
                />
              )}
              <View style={styles.profileMeta}>
                <Text style={styles.menuUserName} numberOfLines={1}>
                  {userData?.fullName || userData?.firstName || 'User Name'}
                </Text>
                <Text style={styles.menuUserRole}>
                  {userData?.role || 'Student'}
                </Text>
              </View>
            </View>
          </View>
          
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {(() => {
              const sections = { main: [], borrowing: [], features: [], account: [] };
              menuItems.forEach(item => { sections[item.section].push(item); });
              return Object.entries(sections).map(([sectionName, items]) => {
                if (items.length === 0) return null;
                return (
                  <View key={sectionName} style={styles.sectionContainer}>
                    {sectionName !== 'main' && (<View style={styles.sectionDivider} />)}
                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.menuItem,
                          isCurrentRoute(item.route) && styles.activeMenuItem
                        ]}
                        onPress={() => handleNavigation(item.route)}
                      >
                        <MaterialCommunityIcons name={item.icon} size={20} style={[styles.itemIcon, isCurrentRoute(item.route) && styles.itemIconActive]} />
                        <Text style={[
                          styles.menuItemText,
                          isCurrentRoute(item.route) && styles.activeMenuItemText
                        ]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        {isCurrentRoute(item.route) && (
                          <View style={styles.activeIndicator} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              });
            })()}
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
    width: 300, 
    backgroundColor: 'rgba(17, 24, 39, 0.96)', 
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 14,
    paddingBottom: 24
  },
  menuHeader: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  profileMeta: {
    marginLeft: 12,
    flex: 1
  },
  menuProfileImage: {
    width: 72,
    height: 72,
    borderRadius: 36
  },
  menuUserName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2
  },
  menuUserRole: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    alignSelf: 'flex-start'
  },
  menuScroll: {
    flex: 1,
    paddingTop: 8
  },
  sectionContainer: {
    marginBottom: 6
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 18,
    marginVertical: 10
  },
  menuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 10,
    borderRadius: 10
  },
  activeMenuItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6'
  },
  itemIcon: {
    width: 26,
    textAlign: 'center',
    marginRight: 12,
    fontSize: 20,
    color: 'rgba(203, 213, 225, 0.9)'
  },
  itemIconActive: {
    color: '#93c5fd'
  },
  menuItemText: { 
    color: 'rgba(248, 250, 252, 0.95)', 
    fontSize: 15,
    fontWeight: '600',
    flex: 1
  },
  activeMenuItemText: {
    color: '#ffffff'
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginLeft: 8
  }
});

export default Sidebar;
