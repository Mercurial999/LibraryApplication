import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [userData, setUserData] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Account Options Modal States
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  
  // Change Password Form States
  const [passwordStep, setPasswordStep] = useState('request'); // 'request' | 'verify'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  
  // Edit Form States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [hasValidImageUrl, setHasValidImageUrl] = useState(false);
  const [profileImageModalVisible, setProfileImageModalVisible] = useState(false);

  useEffect(() => {
    loadUserData();
    loadAccountSettings();
  }, []);

  // OTP countdown effect
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

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
      let parsed = null;
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        parsed = JSON.parse(storedUserData);
        
        // Map studentPhoto to profileImage for consistency
        const mappedUserData = {
          ...parsed,
          profileImage: parsed.profileImage || parsed.studentPhoto
        };
        
        setUserData(mappedUserData);
        setEditName(parsed.fullName || parsed.firstName + ' ' + parsed.lastName || 'User1');
        setEditEmail(parsed.email || 'user1@email.com');
        setUserEmail(parsed.email || '');
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
          
          // Update email and profile image if available from profile
          console.log('Profile response data:', profileResponse.data);
          
          if (profileResponse.data.email) {
            setUserEmail(profileResponse.data.email);
            setEditEmail(profileResponse.data.email);
          }
          
          // Helper function to check if URL is a valid Cloudinary URL
          const isValidImageUrl = (url) => {
            if (!url) return false;
            // Check if it's a Cloudinary URL or a proper HTTP/HTTPS URL
            return url.startsWith('http://') || url.startsWith('https://') || url.includes('cloudinary.com');
          };

          // Helper function to convert local file path to Cloudinary URL
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
              return `https://res.cloudinary.com/dabtmqfym/image/upload/c_thumb,g_auto/w_128/h_128/library_system/${publicId}`;
            }
            
            return null;
          };

          // Helper function to optimize Cloudinary URL for mobile display
          const optimizeCloudinaryUrl = (url) => {
            if (!url || !url.includes('cloudinary.com')) return url;
            
            // If URL already has transformations, return as is
            if (url.includes('?')) return url;
            
            // Add mobile-optimized transformations for profile images
            return `${url}?w_128,h_128,c_fill,g_auto,q_auto,f_auto`;
          };

          // Get profile image URL and validate it
          const rawProfileImage = profileResponse.data.profileImage || profileResponse.data.studentPhoto;
          const validProfileImage = isValidImageUrl(rawProfileImage) ? rawProfileImage : convertToCloudinaryUrl(rawProfileImage);
          const optimizedProfileImage = validProfileImage ? optimizeCloudinaryUrl(validProfileImage) : null;

          // Update userData with profile information
          const updatedUserData = {
            ...(parsed || {}),
            email: profileResponse.data.email || (parsed?.email),
            firstName: profileResponse.data.firstName || (parsed?.firstName),
            lastName: profileResponse.data.lastName || (parsed?.lastName),
            role: profileResponse.data.role || (parsed?.role),
            department: profileResponse.data.teacherInfo?.department || (parsed?.department),
            // Use optimized Cloudinary URL for better mobile performance
            profileImage: optimizedProfileImage || (isValidImageUrl(parsed?.profileImage) ? optimizeCloudinaryUrl(parsed.profileImage) : null) || (isValidImageUrl(parsed?.studentPhoto) ? optimizeCloudinaryUrl(parsed.studentPhoto) : null) || null
          };
          
          console.log('🔍 Profile API Response:', profileResponse.data);
          console.log('📸 Profile Image URL:', profileResponse.data.profileImage);
          console.log('📸 Student Photo URL:', profileResponse.data.studentPhoto);
          console.log('📸 Raw Profile Image:', rawProfileImage);
          console.log('📸 Converted to Cloudinary:', convertToCloudinaryUrl(rawProfileImage));
          console.log('📸 Valid Profile Image:', validProfileImage);
          console.log('📸 Optimized Profile Image:', optimizedProfileImage);
          console.log('📸 Final Profile Image:', updatedUserData.profileImage);
          console.log('📸 Will show placeholder:', !validProfileImage);
          console.log('Updated user data:', updatedUserData);
          setUserData(updatedUserData);
          setImageLoadError(false); // Reset image error state when new data is loaded
          setHasValidImageUrl(!!validProfileImage); // Track if we have a valid URL
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
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

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original values
      setEditName(userData?.fullName || userData?.firstName + ' ' + userData?.lastName || 'User1');
      setEditEmail(userData?.email || 'user1@email.com');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setEditLoading(true);
    try {
      // Here you would typically send the updated info to your backend/server
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      Alert.alert('Success', 'Your profile has been updated successfully!');
      
      // Update local storage
      if (userData) {
        const updatedUserData = {
          ...userData,
          fullName: editName,
          email: editEmail
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
        setIsEditing(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // Send OTP for password change
  const handleSendOTP = async () => {
    setPasswordLoading(true);
    try {
      const response = await ApiService.sendPasswordChangeOTP(userEmail);
      
      if (response.success) {
        // Update userEmail with the email that was actually used
        if (response.data?.email) {
          setUserEmail(response.data.email);
        }
        Alert.alert('OTP Sent', `A 6-digit code has been sent to ${response.data?.email || 'your email address'}.`);
        setPasswordStep('verify');
        setOtpCountdown(60); // 60 seconds countdown
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Verify OTP and change password
  const handleVerifyOTPAndChangePassword = async () => {
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Validation Error', 'OTP must be 6 digits.');
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
      const response = await ApiService.verifyOTPAndChangePassword(otp, newPassword, userEmail);
      
      if (response.success) {
        Alert.alert('Success', 'Your password has been changed successfully!');
        
        // Clear form and close modal
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStep('request');
        setChangePasswordModalVisible(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to change password. Please check your OTP and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = () => {
    if (otpCountdown > 0) return;
    handleSendOTP();
  };

  // Reset password modal
  const handleClosePasswordModal = () => {
    setPasswordStep('request');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpCountdown(0);
    setUserEmail(userData?.email || '');
    setChangePasswordModalVisible(false);
  };

  // Handle Dark Mode Toggle
  const handleDarkModeToggle = async () => {
    const newDarkModeValue = !darkModeEnabled;
    setDarkModeEnabled(newDarkModeValue);
    
    try {
      await AsyncStorage.setItem('darkModeEnabled', JSON.stringify(newDarkModeValue));
      // Apply dark mode immediately
      // You can add theme context here if needed
      Alert.alert(
        'Dark Mode', 
        `Dark mode has been ${newDarkModeValue ? 'enabled' : 'disabled'}.`
      );
    } catch (error) {
      console.error('Error saving dark mode setting:', error);
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
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={() => setProfileImageModalVisible(true)}
            activeOpacity={0.8}
          >
            {profileLoading ? (
              <View style={[styles.profileImage, styles.profileImageLoading]}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <Image
                source={
                  hasValidImageUrl && !imageLoadError && userData?.profileImage
                    ? { 
                        uri: userData.profileImage,
                        cache: 'force-cache' // Cache the image for better performance
                      } 
                    : require('../../assets/profile-placeholder.png')
                }
                style={styles.profileImage}
                onError={(error) => {
                  console.log('❌ Image load error:', error.nativeEvent.error);
                  console.log('📸 Failed URL:', userData?.profileImage);
                  setImageLoadError(true);
                  setHasValidImageUrl(false); // Mark as invalid to prevent retries
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully');
                  console.log('📸 Loaded URL:', userData?.profileImage);
                  setImageLoadError(false);
                }}
                defaultSource={require('../../assets/profile-placeholder.png')}
                onLoadStart={() => {
                  console.log('🔄 Starting to load image:', userData?.profileImage);
                }}
                // Add Cloudinary-specific optimizations
                resizeMode="cover"
                fadeDuration={200}
              />
            )}
            <View style={styles.profileImageOverlay}>
              <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>
            {userData?.fullName || userData?.firstName + ' ' + userData?.lastName || 'User'}
          </Text>
          <Text style={styles.profileEmail}>{userData?.email || 'user@email.com'}</Text>
          {userData && (
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons 
                name={userData.role === 'TEACHER' ? 'school' : 'account'} 
                size={16} 
                color="#1e40af" 
                style={{ marginRight: 6 }} 
              />
              <Text style={styles.roleText}>
                {userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'User'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity 
            style={styles.qrButton} 
            onPress={() => setQrModalVisible(true)}
          >
            <MaterialCommunityIcons name="qrcode" size={20} color="#3b82f6" />
            <Text style={styles.qrButtonText}>Show QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Account Information Section */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Account Information</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleEditToggle} style={styles.editButton}>
                <MaterialCommunityIcons name="pencil" size={16} color="#3b82f6" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {userData?.fullName || userData?.firstName + ' ' + userData?.lastName || 'Not provided'}
              </Text>
            )}
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.fieldValue}>{userData?.email || 'Not provided'}</Text>
            )}
          </View>

          {/* User ID Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>User ID</Text>
            <Text style={styles.fieldValue}>{userData?.id || 'Not available'}</Text>
          </View>

          {/* Edit Actions */}
          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleEditToggle}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, editLoading && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Options */}
        <View style={styles.optionsSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Account Options</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <MaterialCommunityIcons name="lock" size={20} color="#6b7280" />
            <Text style={styles.optionText}>Change Password</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleDarkModeToggle}
          >
            <MaterialCommunityIcons 
              name={darkModeEnabled ? "weather-night" : "weather-sunny"} 
              size={20} 
              color="#6b7280" 
            />
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
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" size={20} color="#dc2626" />
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
              <MaterialCommunityIcons name="qrcode" size={20} color="#3b82f6" />
              <Text style={styles.modalTitle}>Your Library QR Code</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {profileLoading ? (
                <View style={styles.qrLoadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.qrLoadingText}>Loading QR Code...</Text>
                </View>
              ) : qrCodeImage ? (
                <>
                  <Image source={{ uri: qrCodeImage }} style={styles.modalQrImage} resizeMode="contain" />
                  <Text style={styles.qrModalSubtitle}>Show this to librarians for quick identification</Text>
                  {qrCodeData && (
                    <View style={styles.qrInfoContainer}>
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
                </>
              ) : qrCodeData ? (
                <View style={styles.qrFallback}>
                  <MaterialCommunityIcons name="qrcode" size={48} color="#6b7280" />
                  <Text style={styles.qrFallbackText}>QR Code Data Available</Text>
                  <Text style={styles.qrFallbackSubtext}>Image generation pending</Text>
                  {qrCodeData && (
                    <View style={styles.qrInfoContainer}>
                      <Text style={styles.qrInfoText}>
                        <Text style={styles.qrInfoLabel}>User ID:</Text> {qrCodeData.userId || 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.qrLoadingContainer}>
                  <MaterialCommunityIcons name="qrcode" size={48} color="#d1d5db" />
                  <Text style={styles.qrLoadingText}>QR Code not available</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleClosePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="lock" size={20} color="#3b82f6" />
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={handleClosePasswordModal}>
                <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.passwordFormContainer}>
                {passwordStep === 'request' ? (
                  <>
                    <View style={styles.passwordStepContainer}>
                      <MaterialCommunityIcons name="email" size={48} color="#3b82f6" />
                      <Text style={styles.passwordStepTitle}>Verify Your Email</Text>
                      <Text style={styles.passwordStepSubtitle}>
                        We'll send a 6-digit verification code to your registered email address: {userEmail || userData?.email || 'Loading...'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.passwordSaveButton, passwordLoading && styles.passwordSaveButtonDisabled]}
                      onPress={handleSendOTP}
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="send" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.passwordSaveButtonText}>Send Verification Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.passwordStepContainer}>
                      <MaterialCommunityIcons name="shield-check" size={48} color="#10b981" />
                      <Text style={styles.passwordStepTitle}>Enter Verification Code</Text>
                      <Text style={styles.passwordStepSubtitle}>
                        Enter the 6-digit code sent to {userEmail || userData?.email}
                      </Text>
                    </View>

                    {/* OTP Input */}
                    <View style={styles.passwordInputContainer}>
                      <Text style={styles.passwordInputLabel}>Verification Code</Text>
                      <View style={styles.passwordInputWrapper}>
                        <MaterialCommunityIcons name="shield-key" size={20} color="#6b7280" />
                        <TextInput
                          style={styles.passwordInput}
                          value={otp}
                          onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          maxLength={6}
                        />
                      </View>
                    </View>

                    {/* New Password */}
                    <View style={styles.passwordInputContainer}>
                      <Text style={styles.passwordInputLabel}>New Password</Text>
                      <View style={styles.passwordInputWrapper}>
                        <MaterialCommunityIcons name="key" size={20} color="#6b7280" />
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
                        <MaterialCommunityIcons name="key" size={20} color="#6b7280" />
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

                    {/* Resend OTP */}
                    <View style={styles.resendContainer}>
                      <TouchableOpacity
                        onPress={handleResendOTP}
                        disabled={otpCountdown > 0 || passwordLoading}
                      >
                        <Text style={[styles.resendText, otpCountdown > 0 && styles.resendTextDisabled]}>
                          {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend Code'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Buttons */}
                    <View style={styles.passwordButtonContainer}>
                      <TouchableOpacity
                        style={styles.passwordCancelButton}
                        onPress={() => setPasswordStep('request')}
                      >
                        <Text style={styles.passwordCancelButtonText}>Back</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.passwordSaveButton, passwordLoading && styles.passwordSaveButtonDisabled]}
                        onPress={handleVerifyOTPAndChangePassword}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="check" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.passwordSaveButtonText}>Change Password</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Image Zoom Modal */}
      <Modal
        visible={profileImageModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setProfileImageModalVisible(false)}
      >
        <View style={styles.profileImageModalOverlay}>
          <TouchableOpacity 
            style={styles.profileImageModalContainer}
            activeOpacity={1}
            onPress={() => setProfileImageModalVisible(false)}
          >
            <View style={styles.profileImageModalContent}>
              <View style={styles.profileImageModalHeader}>
                <Text style={styles.profileImageModalTitle}>Profile Photo</Text>
                <TouchableOpacity 
                  onPress={() => setProfileImageModalVisible(false)}
                  style={styles.profileImageModalCloseButton}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.profileImageModalBody}>
                <Image
                  source={
                    hasValidImageUrl && !imageLoadError && userData?.profileImage
                      ? { 
                          uri: userData.profileImage,
                          cache: 'force-cache'
                        } 
                      : require('../../assets/profile-placeholder.png')
                  }
                  style={styles.profileImageModalImage}
                  resizeMode="contain"
                  onError={() => {
                    console.log('Profile zoom modal: Image failed to load');
                  }}
                  onLoad={() => {
                    console.log('Profile zoom modal: Image loaded successfully');
                  }}
                />
                
                <View style={styles.profileImageModalInfo}>
                  <Text style={styles.profileImageModalName}>
                    {userData?.fullName || userData?.firstName + ' ' + userData?.lastName || 'User'}
                  </Text>
                  <Text style={styles.profileImageModalRole}>
                    {userData?.role || 'User'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
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

  // Scroll Container
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 40
  },

  // Profile Header
  profileHeader: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16
  },
  profileImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50,
    backgroundColor: '#f1f5f9'
  },
  profileImageLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff'
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center'
  },
  profileEmail: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center'
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  roleText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600'
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  qrButtonText: {
    color: '#0e7490',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8
  },

  // Info Section
  infoSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 8
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  },
  fieldContainer: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  fieldValue: {
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 8
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff'
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: { 
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  saveButtonText: { 
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: '600'
  },

  // Options Section
  optionsSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 12
  },

  // Logout Section
  logoutSection: {
    marginHorizontal: 16,
    marginTop: 8
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
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginLeft: 8
  },
  modalBody: {
    padding: 20,
    alignItems: 'center'
  },
  qrLoadingContainer: {
    alignItems: 'center',
    padding: 20
  },
  qrLoadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12
  },
  modalQrImage: {
    width: 280,
    height: 280,
    marginBottom: 16
  },
  qrModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16
  },
  qrInfoContainer: {
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
    marginTop: 12,
    marginBottom: 4
  },
  qrFallbackSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16
  },

  // Password Modal Styles
  passwordFormContainer: {
    width: '100%'
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
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
    marginLeft: 8
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  passwordSaveButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  passwordSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },

  // Password Step Styles
  passwordStepContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  passwordStepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center'
  },
  passwordStepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  resendText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600'
  },
  resendTextDisabled: {
    color: '#9ca3af'
  },

  // Profile Image Zoom Modal Styles
  profileImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  profileImageModalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileImageModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  profileImageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e40af',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  profileImageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1
  },
  profileImageModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  profileImageModalBody: {
    padding: 20,
    alignItems: 'center'
  },
  profileImageModalImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#e5e7eb'
  },
  profileImageModalInfo: {
    alignItems: 'center'
  },
  profileImageModalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center'
  },
  profileImageModalRole: {
    fontSize: 16,
    color: '#6b7280',
    textTransform: 'capitalize',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  }
});

export default AccountScreen;