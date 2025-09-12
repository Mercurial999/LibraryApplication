import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import ApiService from '../services/ApiService';
import { getUnreadCount } from '../services/NotificationService';

const Header = ({ title, subtitle, onMenuPress, showMenuButton = true, showBackButton = false, onBackPress, notificationCount: externalCount = 0, showNotificationButton = true, showProfileButton = true, contentPaddingHorizontal = 20, dense = false }) => {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [userData, setUserData] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getUnreadCount(25);
        if (mounted) setUnread(c);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, []);

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
      return `https://res.cloudinary.com/dabtmqfym/image/upload/c_thumb,g_auto/w_36/h_36/library_system/${publicId}`;
    }
    
    return null;
  };

  const loadUserProfile = async () => {
    try {
      // Load from local storage first
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const parsed = JSON.parse(userDataString);
        setUserData(parsed);
        
        // Get profile image URL
        const imageUrl = parsed.profileImage || parsed.studentPhoto;
        if (imageUrl) {
          // Convert local file path to Cloudinary URL if needed
          const cloudinaryUrl = imageUrl.includes('cloudinary.com') ? imageUrl : convertToCloudinaryUrl(imageUrl);
          if (cloudinaryUrl) {
            // Apply Cloudinary optimization for header display
            if (cloudinaryUrl.includes('cloudinary.com') && !cloudinaryUrl.includes('?')) {
              setProfileImageUrl(`${cloudinaryUrl}?w_36,h_36,c_fill,g_auto,q_auto,f_auto`);
            } else {
              setProfileImageUrl(cloudinaryUrl);
            }
          }
        }
      }

      // Try to get fresh profile data from API
      try {
        const profileResponse = await ApiService.getUserProfile();
        if (profileResponse.success && profileResponse.data) {
          const imageUrl = profileResponse.data.profileImage || profileResponse.data.studentPhoto;
          if (imageUrl) {
            // Convert local file path to Cloudinary URL if needed
            const cloudinaryUrl = imageUrl.includes('cloudinary.com') ? imageUrl : convertToCloudinaryUrl(imageUrl);
            if (cloudinaryUrl) {
              // Apply Cloudinary optimization for header display
              if (cloudinaryUrl.includes('cloudinary.com') && !cloudinaryUrl.includes('?')) {
                setProfileImageUrl(`${cloudinaryUrl}?w_36,h_36,c_fill,g_auto,q_auto,f_auto`);
              } else {
                setProfileImageUrl(cloudinaryUrl);
              }
            }
          }
        }
      } catch (error) {
        console.log('Header: Could not fetch fresh profile data:', error);
      }
    } catch (error) {
      console.error('Header: Error loading user profile:', error);
    }
  };

  const loadRecent = async () => {
    try {
      setLoadingPreview(true);
      const lastSeen = await (await import('../services/NotificationService')).getLastSeenAt();
      setLastSeenAt(lastSeen);
      const res = await ApiService.getRecentActivity(null, 20);
      const items = res?.data?.activities || res?.data || res?.activities || [];
      setRecentNotifications(items);
    } catch (e) {
      setRecentNotifications([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleNotificationPress = async () => {
    // Toggle preview instead of navigating
    if (!previewVisible) {
      await loadRecent();
    }
    setPreviewVisible(!previewVisible);
  };

  const handleViewAll = () => {
    setPreviewVisible(false);
    router.push('/notifications');
  };

  const markSeenNow = async () => {
    try {
      const { markNotificationsSeenNow } = await import('../services/NotificationService');
      await markNotificationsSeenNow();
      setUnread(0);
      const now = new Date().toISOString();
      setLastSeenAt(now);
    } catch {}
  };

  const handleProfilePress = () => {
    router.push('/account');
  };

  const badgeCount = externalCount || unread;

  return (
    <View style={[styles.header, dense && styles.headerDense, { paddingHorizontal: contentPaddingHorizontal }]}>
      {showBackButton ? (
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onBackPress || router.back}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#e2e8f0" />
        </TouchableOpacity>
      ) : (
        showMenuButton && (
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={onMenuPress}
          >
            <MaterialCommunityIcons name="menu" size={22} color="#e2e8f0" />
          </TouchableOpacity>
        )
      )}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rightContainer}>
        {showNotificationButton && (
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={handleNotificationPress}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color="#e2e8f0" />
            {badgeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {badgeCount > 9 ? '9+' : String(badgeCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {showProfileButton && (
          <TouchableOpacity style={styles.profileContainer} onPress={handleProfilePress}>
            <Image 
              source={
                profileImageUrl 
                  ? { uri: profileImageUrl } 
                  : require('../assets/profile-placeholder.png')
              } 
              style={styles.profileImage}
              onError={() => {
                console.log('Header: Profile image failed to load, using placeholder');
                setProfileImageUrl(null);
              }}
              onLoad={() => {
                console.log('Header: Profile image loaded successfully');
              }}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPreviewVisible(false)}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="bell" size={18} color="#1e293b" />
                    <Text style={styles.previewTitle}>Notifications</Text>
                  </View>
                  <View style={styles.previewActions}>
                    <TouchableOpacity onPress={markSeenNow} style={styles.markSeenBtn}>
                      <Text style={styles.markSeenText}>Mark as seen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
                      <Text style={styles.viewAllText}>View all</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <ScrollView style={{ maxHeight: 360 }}>
                  {loadingPreview ? (
                    <View style={styles.previewEmpty}> 
                      <Text style={styles.previewEmptyText}>Loading…</Text>
                    </View>
                  ) : recentNotifications && recentNotifications.length ? (
                    recentNotifications.slice(0, 8).map((n, idx) => {
                      const ts = new Date(n.createdAt || n.time || n.date || Date.now());
                      const isNew = lastSeenAt ? new Date(n.createdAt || n.time || n.date || 0).getTime() > new Date(lastSeenAt).getTime() : true;
                      return (
                        <View key={String(n.id || idx)} style={styles.notifItem}>
                          <View style={[styles.notifIcon, isNew && { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' }]}>
                            <MaterialCommunityIcons name={isNew ? 'bell-ring' : 'bell-outline'} size={16} color={isNew ? '#2563eb' : '#64748b'} />
                          </View>
                          <View style={styles.notifBody}>
                            <Text style={styles.notifTitle} numberOfLines={2}>{n.title || n.type || 'Update'}</Text>
                            {n.message || n.description ? (
                              <Text style={styles.notifMessage} numberOfLines={2}>{n.message || n.description}</Text>
                            ) : null}
                            <Text style={styles.notifTime}>{ts.toLocaleString()}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.previewEmpty}> 
                      <Text style={styles.previewEmptyText}>No notifications</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    backgroundColor: 'rgba(30, 64, 175, 0.92)',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  headerDense: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  menuButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#ffffff',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(241, 245, 249, 0.8)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  profileContainer: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  profileImage: { 
    width: 36, 
    height: 36, 
    borderRadius: 18
  },

  // Notifications preview styles
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end'
  },
  previewCard: {
    marginTop: 80,
    marginRight: 12,
    width: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden'
  },
  previewHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  previewTitle: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b'
  },
  previewActions: { flexDirection: 'row', alignItems: 'center' },
  markSeenBtn: { paddingHorizontal: 8, paddingVertical: 6, marginRight: 8 },
  markSeenText: { color: '#64748b', fontWeight: '600', fontSize: 12 },
  viewAllBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewAllText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  notifItem: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  notifIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  notifBody: { flex: 1 },
  notifTitle: { color: '#1e293b', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  notifMessage: { color: '#475569', fontSize: 12, marginBottom: 4 },
  notifTime: { color: '#94a3b8', fontSize: 11 }
});

export default Header;
