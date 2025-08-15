import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
    <View style={styles.container}>
      <Text style={styles.title}>Reset Your Password</Text>
      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Resetting...' : 'Reset Password'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#2196f3', padding: 14, borderRadius: 6, alignItems: 'center', width: '100%' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ResetPasswordScreen;