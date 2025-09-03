import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import ApiService from "../../services/ApiService";

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Validation Error", "Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.login({ username, password });
      
      if (response.success) {
        // Store user data and token
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        
        // Navigate to dashboard
        router.replace("/dashboard");
      } else {
        Alert.alert("Login Failed", response.message || "Invalid credentials");
      }
    } catch (err) {
      // Only show the modal alert. Suppress any bottom toasts or extra banners.
      Alert.alert("Login Failed", err.message || "Unable to reach server.");
    } finally {
      setLoading(false);
    }
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
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>📚</Text>
            <Text style={styles.logoText}>KCMI</Text>
          </View>
          <Text style={styles.title}>Library Management System</Text>
          <Text style={styles.subtitle}>Access your library account</Text>
        </View>

        {/* Login Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to continue</Text>
          
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
      <TextInput
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
      />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
      <TextInput
                placeholder="Enter your password"
        value={password}
                secureTextEntry={!showPassword}
        onChangeText={setPassword}
        style={styles.input}
                autoComplete="password"
                textContentType="password"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
      </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
      <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.registerLink}>Sign Up</Text>
      </TouchableOpacity>
    </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>© 2024 KCMI Library System</Text>
          <Text style={styles.footerSubtext}>Powered by modern technology</Text>
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
    paddingTop: height * 0.1,
    paddingBottom: 40,
    paddingHorizontal: 20
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  logoIcon: {
    fontSize: 48,
    marginRight: 12
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 2
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1e293b',
    marginBottom: 8,
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
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center'
  },
  formSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center'
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
  eyeIcon: {
    padding: 8
  },
  eyeIconText: {
    fontSize: 20
  },

  // Forgot Password
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24
  },
  forgotPasswordText: { 
    color: '#3b82f6', 
    fontSize: 14,
    fontWeight: '600'
  },

  // Login Button
  loginButton: { 
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  loginButtonText: { 
    color: '#ffffff', 
    fontSize: 18,
    fontWeight: '700'
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb'
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14
  },

  // Register
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  registerText: {
    color: '#6b7280',
    fontSize: 16
  },
  registerLink: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600'
  },

  // Footer
  footerSection: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4
  },
  footerSubtext: {
    color: '#d1d5db',
    fontSize: 12
  }
});

export default LoginScreen;