import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ApiService from '../../services/ApiService';

export default function PaymentScreen({ route }) {
  const { fineId } = route?.params || {};
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const submit = async () => {
    try {
      if (!fineId) {
        Alert.alert('Error', 'Missing fine ID');
        return;
      }
      const userId = await ApiService.getCurrentUserId();
      setSubmitting(true);
      const res = await fetch(`${ApiService.API_BASE}/api/mobile/users/${userId}/fines/${fineId}/pay`, {
        method: 'POST',
        headers: await ApiService.getAuthHeaders(),
        body: JSON.stringify({ amount: Number(amount), paymentMethod: method, notes: 'Payment via mobile app' })
      });
      const data = await ApiService.handleApiResponse(res, 'pay-fine');
      Alert.alert('Success', data?.data?.message || 'Payment processed', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to overdue-fines page to refresh the data
            router.replace('/overdue-fines');
          }
        }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Payment failed (backend pending)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Process Payment</Text>
      <Text style={styles.label}>Fine ID</Text>
      <Text style={styles.value}>{fineId || '-'}</Text>

      <Text style={styles.label}>Amount</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#64748b" value={amount} onChangeText={setAmount} />

      <Text style={styles.label}>Method</Text>
      <TextInput style={styles.input} value={method} onChangeText={setMethod} />

      <TouchableOpacity style={[styles.btn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
        <Text style={styles.btnText}>{submitting ? 'Processing...' : 'Pay Now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title: { color: '#e2e8f0', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  value: { color: '#e2e8f0', fontSize: 14 },
  input: { backgroundColor: '#111827', color: '#e2e8f0', borderWidth: 1, borderColor: '#1f2937', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  btn: { backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#052e16', fontWeight: '800' }
});


