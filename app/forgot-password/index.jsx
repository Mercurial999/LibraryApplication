import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleSendReset = async () => {
  if (!email) {
    Alert.alert('Validation Error', 'Please enter your email address.');
    return;
  }
  setSending(true);
  try {
    // Replace with your computer's IP if testing on a real device
    const response = await fetch('http://192.168.1.4:3001/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (response.ok) {
      Alert.alert('Success', data.message || 'Password reset link sent!');
    } else {
      Alert.alert('Error', data.message || 'Something went wrong.');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
  setSending(false);
};

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerText}>KCMI LIBRARY</Text>
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Password Reset</Text>
        <Text style={styles.label}>Enter your email address</Text>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.infoText}>
          We will send a password reset link to your registered email address
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSendReset}
          disabled={sending}
        >
          <Text style={styles.buttonText}>
            {sending ? 'Sending...' : 'Send Link'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    backgroundColor: '#2196f3',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  container: {
    backgroundColor: '#fff',
    margin: 24,
    marginTop: 32,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#222',
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    color: '#222',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#f7f7f7',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
    marginBottom: 18,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backText: {
    color: '#2196f3',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;