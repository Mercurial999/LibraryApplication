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
  isReturn = false,
  readOnly = false, // New prop to disable condition selection
  reviewMode = false // New prop for review mode (shows condition but allows confirmation)
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
    if (!readOnly && !reviewMode && !selectedCondition) {
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
            {!readOnly && !reviewMode && (
              <Text style={styles.requiredText}>* Required before {isReturn ? 'return' : 'borrowing'}</Text>
            )}
            {readOnly && (
              <Text style={styles.readOnlyText}>View only - Condition provided by backend</Text>
            )}
            {reviewMode && (
              <Text style={styles.reviewText}>Review condition and confirm your request</Text>
            )}
          </View>

          {/* Condition Selection */}
          <View style={styles.conditionSection}>
            <Text style={styles.sectionTitle}>
              {readOnly ? 'Book Condition:' : reviewMode ? 'Book Condition (Backend Assessment):' : 'Select Book Condition:'}
            </Text>
            
            <View style={styles.conditionGrid}>
              {conditions.map((condition) => (
                <TouchableOpacity
                  key={condition.value}
                  style={[
                    styles.conditionOption,
                    selectedCondition === condition.value && styles.selectedCondition,
                    { borderColor: condition.color },
                    readOnly && styles.conditionOptionReadOnly,
                    reviewMode && selectedCondition === condition.value && styles.reviewModeSelected
                  ]}
                  onPress={() => !readOnly && setSelectedCondition(condition.value)}
                  disabled={readOnly || reviewMode}
                >
                  <Text style={styles.conditionIcon}>{condition.icon}</Text>
                  <Text style={[
                    styles.conditionLabel,
                    selectedCondition === condition.value && styles.selectedConditionText,
                    readOnly && styles.conditionLabelReadOnly,
                    reviewMode && selectedCondition === condition.value && styles.reviewModeSelectedText
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
              style={[styles.notesInput, readOnly && styles.notesInputReadOnly]}
              placeholder={readOnly ? 'No notes available' : reviewMode ? 'Add any additional notes...' : `Describe any damage or condition changes...`}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
              editable={!readOnly}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>
                {readOnly ? 'Close' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            
            {(!readOnly || reviewMode) && (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  !readOnly && !reviewMode && !selectedCondition && styles.submitButtonDisabled
                ]} 
                onPress={handleSubmit}
                disabled={!readOnly && !reviewMode && !selectedCondition}
              >
                <Text style={styles.submitButtonText}>{submitText}</Text>
              </TouchableOpacity>
            )}
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
  readOnlyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  reviewText: {
    fontSize: 14,
    color: '#3B82F6',
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
  conditionOptionReadOnly: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  conditionLabelReadOnly: {
    color: '#9CA3AF',
  },
  reviewModeSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  reviewModeSelectedText: {
    color: '#1E40AF',
    fontWeight: '700',
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
  notesInputReadOnly: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
    borderColor: '#E5E7EB',
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
