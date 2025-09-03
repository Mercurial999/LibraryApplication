import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

const API_BASE = "https://kcmi-library-system.vercel.app/api/auth";

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
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerText}>KCMI LIBRARY</Text>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Password Reset</Text>

        {step === "email" ? (
          <>
            <Text style={styles.label}>Enter your email address</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.infoText}>
              We'll send a 6-digit code to your registered email.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={sendOTP}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="numeric"
              maxLength={6}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={verifyAndReset}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <TouchableOpacity
                onPress={resendOTP}
                disabled={countdown > 0 || sending}
              >
                <Text style={[styles.forgotText, countdown > 0 && { opacity: 0.5 }]}>
                  Resend OTP
                </Text>
              </TouchableOpacity>
              {countdown > 0 && (
                <Text style={{ marginLeft: 10, color: "#666" }}>
                  ({countdown}s)
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={() => { setStep("email"); setOtp(""); }}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7f7" },
  header: {
    backgroundColor: "#2196f3",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  headerText: { color: "#fff", fontWeight: "bold", fontSize: 20, letterSpacing: 1 },
  container: {
    backgroundColor: "#fff",
    margin: 24,
    marginTop: 32,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 18, color: "#222" },
  label: { alignSelf: "flex-start", marginBottom: 6, color: "#222", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginBottom: 12,
    backgroundColor: "#f7f7f7",
  },
  infoText: { fontSize: 13, color: "#666", marginBottom: 18, textAlign: "center" },
  button: {
    backgroundColor: "#2196f3",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
    width: "100%",
    marginBottom: 18,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backText: { color: "#2196f3", textAlign: "center", textDecorationLine: "underline", fontSize: 14 },
  forgotText: { marginTop: 10, color: "#2176d2", textAlign: "center" },
});

export default ForgotPasswordScreen;