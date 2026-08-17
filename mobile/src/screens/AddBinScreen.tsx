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
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a bin name');
      return;
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    setLoading(true);
    try {
      const token = await getValidToken();
      await api.createBin(token, user!.id, name.trim(), weightValue, unit);
      Alert.alert('Success', 'Bin created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create bin');
    } finally {
      setLoading(false);
    }
  }

  async function handleCameraCapture() {
    navigation.navigate('CameraCapture', {
      mode: 'tare',
      onWeightDetected: (detectedWeight: number, detectedUnit: string) => {
        setWeight(detectedWeight.toString());
        setUnit(detectedUnit as UnitType);
      },
    });
  }

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
            <Text style={styles.label}>Empty Weight</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={[styles.input, styles.weightInput]}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'kg' && styles.unitButtonActive]}
                  onPress={() => setUnit('kg')}
                >
                  <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'g' && styles.unitButtonActive]}
                  onPress={() => setUnit('g')}
                >
                  <Text style={[styles.unitText, unit === 'g' && styles.unitTextActive]}>g</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.cameraButton} onPress={handleCameraCapture}>
            <Text style={styles.cameraButtonText}>Take Photo of Empty Bin</Text>
            <Text style={styles.cameraSubtext}>
              Place empty bin on scale and capture the display
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
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
  weightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weightInput: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  unitButtonActive: {
    backgroundColor: '#e94560',
  },
  unitText: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '600',
  },
  unitTextActive: {
    color: '#fff',
  },
  cameraButton: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 20,
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
