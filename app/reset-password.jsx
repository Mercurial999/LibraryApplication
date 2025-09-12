import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const ResetPasswordScreen = () => {
  const { token, email } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!password || !confirm) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('http://192.168.1.4:3001/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', data.message || 'Password reset successful!');
        router.push('/login');
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Image
            source={require('../assets/images/kcmi-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>KCMI LIBRARY</Text>
          <Text style={styles.subtitle}>Reset Your Password</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.stepContainer}>
            <MaterialCommunityIcons name="shield-key" size={48} color="#3b82f6" />
            <Text style={styles.stepTitle}>Create New Password</Text>
            <Text style={styles.stepSubtitle}>
              Enter your new password below
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="key" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="key" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirementItem}>• At least 6 characters long</Text>
            <Text style={styles.requirementItem}>• Must match confirmation</Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, submitting && styles.buttonDisabled]} 
            onPress={handleReset} 
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Reset Password</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push("/login")}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color="#3b82f6" style={{ marginRight: 6 }} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>© 2024 KCMI Library</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingTop: height * 0.12,
    paddingBottom: 24,
    paddingHorizontal: 20
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 12
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center'
  },

  // Form Section
  formSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },

  // Step Container
  stepContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center'
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 2
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
    marginLeft: 8
  },

  // Button
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af'
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: '700'
  },

  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  backText: { 
    color: '#3b82f6', 
    fontSize: 14,
    fontWeight: '600'
  },

  // Requirements
  requirementsContainer: {
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

  // Footer
  footerSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4
  }
});

export default ResetPasswordScreen;