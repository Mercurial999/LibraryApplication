import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

const API_BASE = "https://kcmi-library-system.vercel.app/api/auth";
const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const [step, setStep] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const sendOTP = async () => {
    if (!email) {
      Alert.alert("Validation", "Please enter your email.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("OTP Sent", data.message || "Check your email for the OTP.");
        setStep("otp");
        setCountdown(60); // 60s cooldown for resend as backend doc
      } else {
        Alert.alert("Error", data.message || data.error || "Failed to send OTP.");
      }
    } catch (err) {
      Alert.alert("Network Error", err.message || "Unable to send OTP.");
    } finally {
      setSending(false);
    }
  };

  const resendOTP = () => {
    if (countdown > 0) return;
    sendOTP();
  };

  const verifyAndReset = async () => {
    if (!otp) {
      Alert.alert("Validation", "Please enter the 6-digit OTP.");
      return;
    }
    if (otp.length !== 6) {
      Alert.alert("Validation", "OTP must be 6 digits.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert("Validation", "Please enter and confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/verify-otp-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", data.message || "Password has been reset.");
        router.push("/login");
      } else {
        Alert.alert("Error", data.message || data.error || "Failed to reset password.");
      }
    } catch (err) {
      Alert.alert("Network Error", err.message || "Unable to verify OTP.");
    } finally {
      setVerifying(false);
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
          <Text style={styles.subtitle}>Password Recovery</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {step === "email" ? (
            <>
              <View style={styles.stepContainer}>
                <MaterialCommunityIcons name="email" size={48} color="#3b82f6" />
                <Text style={styles.stepTitle}>Reset Your Password</Text>
                <Text style={styles.stepSubtitle}>
                  Enter your email address and we'll send you a verification code
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="email" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, sending && styles.buttonDisabled]}
                onPress={sendOTP}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Send Verification Code</Text>
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
            </>
          ) : (
            <>
              <View style={styles.stepContainer}>
                <MaterialCommunityIcons name="shield-check" size={48} color="#10b981" />
                <Text style={styles.stepTitle}>Enter Verification Code</Text>
                <Text style={styles.stepSubtitle}>
                  Enter the 6-digit code sent to {email}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="shield-key" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#9ca3af"
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
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
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="key" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
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
                style={[styles.button, verifying && styles.buttonDisabled]}
                onPress={verifyAndReset}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Reset Password</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <TouchableOpacity
                  onPress={resendOTP}
                  disabled={countdown > 0 || sending}
                >
                  <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => { setStep("email"); setOtp(""); }}
              >
                <MaterialCommunityIcons name="arrow-left" size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
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

  // Resend
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

export default ForgotPasswordScreen;