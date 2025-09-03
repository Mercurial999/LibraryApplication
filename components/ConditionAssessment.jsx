import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const ConditionAssessment = ({ 
  visible, 
  onClose, 
  onSubmit, 
  title = "Book Condition Assessment",
  submitText = "Submit",
  initialCondition = null,
  isReturn = false
}) => {
  const [selectedCondition, setSelectedCondition] = useState(initialCondition || 'GOOD');
  const [notes, setNotes] = useState('');

  const conditions = [
    { value: 'EXCELLENT', label: 'Excellent', color: '#10B981', icon: '⭐' },
    { value: 'GOOD', label: 'Good', color: '#3B82F6', icon: '✅' },
    { value: 'FAIR', label: 'Fair', color: '#F59E0B', icon: '⚠️' },
    { value: 'POOR', label: 'Poor', color: '#EF4444', icon: '❌' },
    { value: 'DAMAGED', label: 'Damaged', color: '#DC2626', icon: '🚨' }
  ];

  const handleSubmit = () => {
    if (!selectedCondition) {
      Alert.alert('Error', 'Please select a book condition');
      return;
    }

    onSubmit({
      condition: selectedCondition,
      notes: notes.trim()
    });

    // Reset form
    setSelectedCondition('GOOD');
    setNotes('');
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setSelectedCondition('GOOD');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.requiredText}>* Required before {isReturn ? 'return' : 'borrowing'}</Text>
          </View>

          {/* Condition Selection */}
          <View style={styles.conditionSection}>
            <Text style={styles.sectionTitle}>Select Book Condition:</Text>
            
            <View style={styles.conditionGrid}>
              {conditions.map((condition) => (
                <TouchableOpacity
                  key={condition.value}
                  style={[
                    styles.conditionOption,
                    selectedCondition === condition.value && styles.selectedCondition,
                    { borderColor: condition.color }
                  ]}
                  onPress={() => setSelectedCondition(condition.value)}
                >
                  <Text style={styles.conditionIcon}>{condition.icon}</Text>
                  <Text style={[
                    styles.conditionLabel,
                    selectedCondition === condition.value && styles.selectedConditionText
                  ]}>
                    {condition.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes Section */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>
              {isReturn ? 'Return' : 'Borrow'} Notes (Optional):
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder={`Describe any damage or condition changes...`}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                !selectedCondition && styles.submitButtonDisabled
              ]} 
              onPress={handleSubmit}
              disabled={!selectedCondition}
            >
              <Text style={styles.submitButtonText}>{submitText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  requiredText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  conditionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  conditionOption: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  selectedCondition: {
    backgroundColor: '#FEF3C7',
    borderWidth: 3,
  },
  conditionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedConditionText: {
    color: '#1F2937',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ConditionAssessment;
