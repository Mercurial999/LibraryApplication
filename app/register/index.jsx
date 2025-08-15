import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Borrower from '../../models/Borrower';
import ApiService from '../../services/ApiService';

import { useRouter } from 'expo-router';

const RegistrationScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName || !email || !role || !gradeLevel || !password) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    const borrower = new Borrower(fullName, email, role, gradeLevel, password);
    await ApiService.registerBorrower(borrower);

    router.push('/registration-complete');
  };

  return (
    <View style={styles.container}>
      <InputField label="Full Name" value={fullName} onChangeText={setFullName} />
      <InputField label="Email Address" value={email} onChangeText={setEmail} />
      <InputField label="Role" value={role} onChangeText={setRole} />
      <InputField label="Grade Level" value={gradeLevel} onChangeText={setGradeLevel} />
      <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <Button title="Register" onPress={handleRegister} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center',
    backgroundColor: '#fff' // <-- add this line
  }
});

export default RegistrationScreen;
