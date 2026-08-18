import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UnitType } from '../types';

export default function AddBinScreen({ navigation }: any) {
  const { user, getValidToken } = useAuth();
  const [name, setName] = useState('');
  const [weight, setWeight] = useState<number | null>(null);
  const [unit, setUnit] = useState<UnitType>('kg');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a bin name');
      return;
    }

    if (weight === null || weight <= 0) {
      Alert.alert('Error', 'Please capture the empty bin weight using the camera');
      return;
    }

    setLoading(true);
    try {
      const token = await getValidToken();
      await api.createBin(token, user!.id, name.trim(), weight, unit);
      Alert.alert('Success', 'Bin created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create bin');
    } finally {
      setLoading(false);
    }
  }

  function handleCameraCapture() {
    navigation.navigate('CameraCapture', {
      mode: 'tare',
      onWeightDetected: (detectedWeight: number, detectedUnit: string) => {
        setWeight(detectedWeight);
        setUnit(detectedUnit as UnitType);
      },
    });
  }

  const hasWeight = weight !== null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Add New Bin</Text>
          <Text style={styles.subtitle}>Register an empty bin</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bin Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Blue Bin 001"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Empty Weight (via Camera)</Text>
            {hasWeight ? (
              <View style={styles.capturedCard}>
                <Text style={styles.capturedWeight}>
                  {unit === 'kg' ? `${weight} kg` : `${weight} g`}
                </Text>
                <Text style={styles.capturedLabel}>Weight captured successfully</Text>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleCameraCapture}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.cameraButton} onPress={handleCameraCapture}>
                <Text style={styles.cameraButtonText}>Capture Empty Bin Weight</Text>
                <Text style={styles.cameraSubtext}>
                  Place empty bin on scale and capture the display
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasWeight || loading) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasWeight || loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Bin'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cameraButton: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e94560',
    borderStyle: 'dashed',
  },
  cameraButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cameraSubtext: {
    color: '#888',
    fontSize: 13,
  },
  capturedCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  capturedWeight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  capturedLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 12,
  },
  retakeButton: {
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retakeButtonText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
