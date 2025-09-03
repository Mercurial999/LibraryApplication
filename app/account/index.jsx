import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ApiService from '../../services/ApiService';

const { width } = Dimensions.get('window');

const AccountScreen = () => {
  const [name, setName] = useState('User1');
  const [email, setEmail] = useState('user1@email.com');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  
  // Account Options Modal States
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [notificationSettingsModalVisible, setNotificationSettingsModalVisible] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  
  // Change Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Notification Settings States
  const [notificationSettings, setNotificationSettings] = useState({
    dueDateReminders: true,
    reservationUpdates: true,
    fineNotifications: true,
    systemUpdates: false,
    emailNotifications: true,
    pushNotifications: true
  });

  useEffect(() => {
    loadUserData();
    loadAccountSettings();
  }, []);

  const loadAccountSettings = async () => {
    try {
      // Load dark mode setting
      const darkModeValue = await AsyncStorage.getItem('darkModeEnabled');
      if (darkModeValue !== null) {
        setDarkModeEnabled(JSON.parse(darkModeValue));
      }
      
      // Load notification settings
      const notificationSettingsValue = await AsyncStorage.getItem('notificationSettings');
      if (notificationSettingsValue) {
        setNotificationSettings(JSON.parse(notificationSettingsValue));
      }
    } catch (error) {
      console.error('Error loading account settings:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setProfileLoading(true);
      
      // Load local user data
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        setUserData(parsed);
        setName(parsed.fullName || parsed.firstName + ' ' + parsed.lastName || 'User1');
        setEmail(parsed.email || 'user1@email.com');
      }

      // Load user profile with QR code from backend
      try {
        const profileResponse = await ApiService.getUserProfile();
        if (profileResponse.success && profileResponse.data) {
                  // Backend returns qrCodeImage and qrCodeData at top level
        if (profileResponse.data.qrCodeImage || profileResponse.data.qrCodeData) {
          setQrCodeImage(profileResponse.data.qrCodeImage);
          setQrCodeData(profileResponse.data.qrCodeData);
        }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue without QR code if backend is not available
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const pickImage = async () => {
    try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
        quality: 0.8,
        base64: true,
    });

    if (!result.canceled) {
        setImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
    // Here you would typically send the updated info to your backend/server
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      Alert.alert('Success', 'Your profile has been updated successfully!');
      
      // Update local storage
      if (userData) {
        const updatedUserData = {
          ...userData,
          fullName: name,
          email: email
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      // Call the backend API to change password
      const response = await ApiService.changePassword(currentPassword, newPassword);
      
      if (response.success) {
        Alert.alert('Success', 'Your password has been changed successfully!');
        
        // Clear form and close modal
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordModalVisible(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to change password. Please check your current password and try again.');
      }
      
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Dark Mode Toggle
  const handleDarkModeToggle = async () => {
    const newDarkModeValue = !darkModeEnabled;
    setDarkModeEnabled(newDarkModeValue);
    
    try {
      await AsyncStorage.setItem('darkModeEnabled', JSON.stringify(newDarkModeValue));
      Alert.alert(
        'Dark Mode', 
        `Dark mode has been ${newDarkModeValue ? 'enabled' : 'disabled'}. Please restart the app for full effect.`
      );
    } catch (error) {
      console.error('Error saving dark mode setting:', error);
    }
  };

  // Handle Notification Settings
  const handleNotificationSettingToggle = async (settingKey) => {
    const updatedSettings = {
      ...notificationSettings,
      [settingKey]: !notificationSettings[settingKey]
    };
    
    setNotificationSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      Alert.alert('Success', 'Notification settings have been saved!');
      setNotificationSettingsModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="Account Settings"
        subtitle="Manage your profile information"
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentRoute="/account"
      />

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.qrQuickButton} onPress={() => setQrModalVisible(true)}>
            <Text style={styles.qrQuickIcon}>📱</Text>
            <Text style={styles.qrQuickText}>Show QR</Text>
          </TouchableOpacity>
        </View>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={pickImage}
            disabled={loading}
          >
        <Image
              source={image ? { uri: image.uri } : require('../../assets/profile-placeholder.png')}
          style={styles.avatar}
        />
            <View style={styles.photoOverlay}>
              <Text style={styles.photoIcon}>📷</Text>
            </View>
      </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        {/* QR Code Section */}
        {profileLoading ? (
          <View style={styles.qrSection}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.qrLoadingText}>Loading QR Code...</Text>
          </View>
        ) : (qrCodeImage || qrCodeData) ? (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>📱 Your Library QR Code</Text>
            <Text style={styles.qrSubtitle}>Show this to librarians for quick identification</Text>
            <View style={styles.qrContainer}>
              {qrCodeImage ? (
                <Image 
                  source={{ uri: qrCodeImage }} 
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              ) : qrCodeData ? (
                <View style={styles.qrFallback}>
                  <Text style={styles.qrFallbackText}>QR Code Data Available</Text>
                  <Text style={styles.qrFallbackSubtext}>Image generation pending</Text>
                </View>
              ) : null}
            </View>
            {qrCodeData && (
              <View style={styles.qrInfo}>
                <Text style={styles.qrInfoText}>
                  <Text style={styles.qrInfoLabel}>User ID:</Text> {qrCodeData.userId || 'N/A'}
                </Text>
                <Text style={styles.qrInfoText}>
                  <Text style={styles.qrInfoLabel}>Type:</Text> {qrCodeData.userType || 'N/A'}
                </Text>
                <Text style={styles.qrInfoText}>
                  <Text style={styles.qrInfoLabel}>Name:</Text> {qrCodeData.firstName || ''} {qrCodeData.lastName || ''}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📧</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
        keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* User Role Display */}
          {userData && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'User'}
                </Text>
              </View>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Additional Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Account Options</Text>
          
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <Text style={styles.optionIcon}>🔒</Text>
            <Text style={styles.optionText}>Change Password</Text>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => setNotificationSettingsModalVisible(true)}
          >
            <Text style={styles.optionIcon}>🔔</Text>
            <Text style={styles.optionText}>Notification Settings</Text>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleDarkModeToggle}
          >
            <Text style={styles.optionIcon}>🌙</Text>
            <Text style={styles.optionText}>Dark Mode</Text>
            <View style={styles.toggleContainer}>
              <View style={[
                styles.toggleSwitch,
                darkModeEnabled && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleButton,
                  darkModeEnabled && styles.toggleButtonActive
                ]} />
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionItem}>
            <Text style={styles.optionIcon}>❓</Text>
            <Text style={styles.optionText}>Help & Support</Text>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Library QR</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {qrCodeImage ? (
              <View style={styles.modalBody}>
                <Image source={{ uri: qrCodeImage }} style={styles.modalQrImage} resizeMode="contain" />
                {qrCodeData && (
                  <Text style={styles.modalCaption}>ID: {qrCodeData.userId} • {qrCodeData.userType}</Text>
                )}
              </View>
            ) : qrCodeData ? (
              <View style={styles.modalBody}>
                <View style={styles.qrFallback}>
                  <Text style={styles.qrFallbackText}>QR Code Data Available</Text>
                  <Text style={styles.qrFallbackSubtext}>Image generation pending</Text>
                </View>
                {qrCodeData && (
                  <Text style={styles.modalCaption}>ID: {qrCodeData.userId} • {qrCodeData.userType}</Text>
                )}
              </View>
            ) : (
              <View style={styles.modalBody}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.qrLoadingText}>Loading QR...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setChangePasswordModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.passwordFormContainer}>
                {/* Current Password */}
                <View style={styles.passwordInputContainer}>
                  <Text style={styles.passwordInputLabel}>Current Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.passwordInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* New Password */}
                <View style={styles.passwordInputContainer}>
                  <Text style={styles.passwordInputLabel}>New Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <Text style={styles.inputIcon}>🔑</Text>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.passwordInputContainer}>
                  <Text style={styles.passwordInputLabel}>Confirm New Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <Text style={styles.inputIcon}>🔑</Text>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Requirements */}
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                  <Text style={styles.requirementItem}>• At least 6 characters long</Text>
                  <Text style={styles.requirementItem}>• Must match confirmation</Text>
                </View>

                {/* Buttons */}
                <View style={styles.passwordButtonContainer}>
                  <TouchableOpacity
                    style={styles.passwordCancelButton}
                    onPress={() => setChangePasswordModalVisible(false)}
                  >
                    <Text style={styles.passwordCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.passwordSaveButton, passwordLoading && styles.passwordSaveButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.passwordSaveButtonText}>Change Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={notificationSettingsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotificationSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setNotificationSettingsModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.notificationModalBody}>
              <Text style={styles.notificationSectionTitle}>Library Notifications</Text>
              
              {/* Due Date Reminders */}
              <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => handleNotificationSettingToggle('dueDateReminders')}
              >
                <View style={styles.notificationItemLeft}>
                  <Text style={styles.notificationItemIcon}>📅</Text>
                  <View>
                    <Text style={styles.notificationItemTitle}>Due Date Reminders</Text>
                    <Text style={styles.notificationItemSubtitle}>Get reminded when books are due</Text>
                  </View>
                </View>
                <View style={[
                  styles.notificationToggle,
                  notificationSettings.dueDateReminders && styles.notificationToggleActive
                ]}>
                  <View style={[
                    styles.notificationToggleButton,
                    notificationSettings.dueDateReminders && styles.notificationToggleButtonActive
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Reservation Updates */}
              <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => handleNotificationSettingToggle('reservationUpdates')}
              >
                <View style={styles.notificationItemLeft}>
                  <Text style={styles.notificationItemIcon}>📖</Text>
                  <View>
                    <Text style={styles.notificationItemTitle}>Reservation Updates</Text>
                    <Text style={styles.notificationItemSubtitle}>Updates on book reservations</Text>
                  </View>
                </View>
                <View style={[
                  styles.notificationToggle,
                  notificationSettings.reservationUpdates && styles.notificationToggleActive
                ]}>
                  <View style={[
                    styles.notificationToggleButton,
                    notificationSettings.reservationUpdates && styles.notificationToggleButtonActive
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Fine Notifications */}
              <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => handleNotificationSettingToggle('fineNotifications')}
              >
                <View style={styles.notificationItemLeft}>
                  <Text style={styles.notificationItemIcon}>💰</Text>
                  <View>
                    <Text style={styles.notificationItemTitle}>Fine Notifications</Text>
                    <Text style={styles.notificationItemSubtitle}>Alerts about overdue fines</Text>
                  </View>
                </View>
                <View style={[
                  styles.notificationToggle,
                  notificationSettings.fineNotifications && styles.notificationToggleActive
                ]}>
                  <View style={[
                    styles.notificationToggleButton,
                    notificationSettings.fineNotifications && styles.notificationToggleButtonActive
                  ]} />
                </View>
              </TouchableOpacity>

              {/* System Updates */}
              <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => handleNotificationSettingToggle('systemUpdates')}
              >
                <View style={styles.notificationItemLeft}>
                  <Text style={styles.notificationItemIcon}>⚙️</Text>
                  <View>
                    <Text style={styles.notificationItemTitle}>System Updates</Text>
                    <Text style={styles.notificationItemSubtitle}>Library system announcements</Text>
                  </View>
                </View>
                <View style={[
                  styles.notificationToggle,
                  notificationSettings.systemUpdates && styles.notificationToggleActive
                ]}>
                  <View style={[
                    styles.notificationToggleButton,
                    notificationSettings.systemUpdates && styles.notificationToggleButtonActive
                  ]} />
                </View>
              </TouchableOpacity>

              <Text style={styles.notificationSectionTitle}>Delivery Methods</Text>

              {/* Email Notifications */}
              <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => handleNotificationSettingToggle('emailNotifications')}
              >
                <View style={styles.notificationItemLeft}>
                  <Text style={styles.notificationItemIcon}>📧</Text>
                  <View>
                    <Text style={styles.notificationItemTitle}>Email Notifications</Text>
                    <Text style={styles.notificationItemSubtitle}>Receive notifications via email</Text>
                  </View>
                </View>
                <View style={[
                  styles.notificationToggle,
                  notificationSettings.emailNotifications && styles.notificationToggleActive
                ]}>
                  <View style={[
                    styles.notificationToggleButton,
                    notificationSettings.emailNotifications && styles.notificationToggleButtonActive
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Push Notifications */}
              <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => handleNotificationSettingToggle('pushNotifications')}
              >
                <View style={styles.notificationItemLeft}>
                  <Text style={styles.notificationItemIcon}>📱</Text>
                  <View>
                    <Text style={styles.notificationItemTitle}>Push Notifications</Text>
                    <Text style={styles.notificationItemSubtitle}>Receive push notifications on device</Text>
                  </View>
                </View>
                <View style={[
                  styles.notificationToggle,
                  notificationSettings.pushNotifications && styles.notificationToggleActive
                ]}>
                  <View style={[
                    styles.notificationToggleButton,
                    notificationSettings.pushNotifications && styles.notificationToggleButtonActive
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.notificationSaveButton}
                onPress={saveNotificationSettings}
              >
                <Text style={styles.notificationSaveButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#1e293b',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b'
  },

  // Scroll Container
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 40
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 8
  },
  qrQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  qrQuickIcon: {
    fontSize: 14,
    marginRight: 8
  },
  qrQuickText: {
    color: '#0e7490',
    fontWeight: '600'
  },

  // Photo Section
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    marginBottom: 16
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    backgroundColor: '#f1f5f9'
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff'
  },
  photoIcon: {
    fontSize: 18,
    color: '#ffffff'
  },
  changePhotoText: { 
    color: '#64748b', 
    fontSize: 14,
    fontWeight: '500'
  },

  // Form Section
  formSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20
  },

  // Input Container
  inputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#6b7280'
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 16
  },

  // Info Container
  infoContainer: {
    marginBottom: 24
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  roleText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600'
  },

  // QR Code Section
  qrSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center'
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20
  },
  qrContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  qrCode: {
    width: 200,
    height: 200
  },
  qrLoadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8
  },
  qrInfo: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    width: '100%'
  },
  qrInfoText: {
    fontSize: 14,
    color: '#0c4a6e',
    marginBottom: 4,
    lineHeight: 20
  },
  qrInfoLabel: {
    fontWeight: '600'
  },

  // QR Fallback
  qrFallback: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  qrFallbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4
  },
  qrFallbackSubtext: {
    fontSize: 14,
    color: '#64748b'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalClose: {
    fontSize: 18
  },
  modalBody: {
    alignItems: 'center',
    padding: 16
  },
  modalQrImage: {
    width: 260,
    height: 260,
    marginBottom: 10
  },
  modalCaption: {
    fontSize: 12,
    color: '#475569'
  },

  // Save Button
  saveButton: { 
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  saveButtonText: { 
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: '700'
  },

  // Options Section
  optionsSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center'
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500'
  },
  optionArrow: {
    fontSize: 20,
    color: '#9ca3af'
  },

  // Logout Section
  logoutSection: {
    marginHorizontal: 16,
    marginTop: 16
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600'
  },

  // Toggle Switch Styles
  toggleContainer: {
    marginLeft: 'auto'
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    padding: 2,
    justifyContent: 'center'
  },
  toggleSwitchActive: {
    backgroundColor: '#3b82f6'
  },
  toggleButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  toggleButtonActive: {
    transform: [{ translateX: 20 }]
  },

  // Password Modal Styles
  passwordFormContainer: {
    width: '100%',
    paddingHorizontal: 16
  },
  passwordInputContainer: {
    marginBottom: 16
  },
  passwordInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12
  },
  passwordRequirements: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4
  },
  requirementItem: {
    fontSize: 12,
    color: '#0369a1',
    marginBottom: 2
  },
  passwordButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  passwordCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  passwordCancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600'
  },
  passwordSaveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  passwordSaveButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  passwordSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },

  // Notification Modal Styles
  notificationModalBody: {
    maxHeight: 500,
    paddingHorizontal: 16
  },
  notificationSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 12
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  notificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  notificationItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center'
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2
  },
  notificationItemSubtitle: {
    fontSize: 14,
    color: '#6b7280'
  },
  notificationToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    padding: 2,
    justifyContent: 'center'
  },
  notificationToggleActive: {
    backgroundColor: '#3b82f6'
  },
  notificationToggleButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  notificationToggleButtonActive: {
    transform: [{ translateX: 20 }]
  },
  notificationSaveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16
  },
  notificationSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  }
});

export default AccountScreen;