import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../components/Button';
import { useRouter } from 'expo-router';

const RegistrationCompleteScreen = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registration Complete</Text>
      <Text style={styles.message}>
        Your registration has been submitted and is pending approval. You will be notified by email when your account is activated.
      </Text>

      <Button title="Return to Login" onPress={() => router.push('/login')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  message: { fontSize: 16, marginBottom: 40, textAlign: 'center' }
});

export default RegistrationCompleteScreen;
