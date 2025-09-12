import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
          <Image
            source={require('../../assets/images/kcmi-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>KCMI LIBRARY</Text>
        </View>

        {/* Login Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Sign in</Text>
          
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
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
          <View style={styles.dividerContainer} />

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
    marginBottom: 0,
    textAlign: 'center'
  },
  subtitle: { fontSize: 0 },

  // Form Section
  formSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center'
  },
  formSubtitle: { fontSize: 0 },

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
    paddingVertical: 12
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  loginButtonText: { 
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: '700'
  },

  // Divider
  dividerContainer: { height: 8 },
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
    marginTop: 20,
    paddingHorizontal: 20
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4
  },
  footerSubtext: { fontSize: 0 }
});

export default LoginScreen;