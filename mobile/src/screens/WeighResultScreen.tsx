import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { formatWeight } from '../utils/format';

export default function WeighResultScreen({ route, navigation }: any) {
  const {
    binId,
    binName,
    grossWeight,
    grossUnit,
    tareWeight,
    tareUnit,
    ocrConfidence,
    ocrRawResult,
    processingTimeMs,
  } = route.params;

  const [saving, setSaving] = useState(false);

  const unit = grossUnit || tareUnit || 'kg';
  const grossGrams = unit === 'kg' ? grossWeight * 1000 : grossWeight;
  const tareGrams = unit === 'kg' ? tareWeight * 1000 : tareWeight;
  const netGrams = grossGrams - tareGrams;

  async function handleSave() {
    setSaving(true);
    try {
      await api.createWeighing(
        binId,
        grossWeight,
        unit,
        ocrConfidence,
        ocrRawResult,
        processingTimeMs
      );
      Alert.alert('Saved', 'Weighing record saved successfully', [
        { text: 'OK', onPress: () => navigation.navigate('HomeTabs') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save weighing record');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.completeText}>WEIGHING COMPLETE</Text>
        <Text style={styles.binLabel}>{binName}</Text>
      </View>

      <View style={styles.resultCard}>
        <View style={styles.weightRow}>
          <Text style={styles.weightLabel}>Gross Weight</Text>
          <Text style={styles.weightValue}>
            {formatWeight(grossGrams, unit)}
          </Text>
        </View>

        <View style={styles.weightRow}>
          <Text style={styles.weightLabel}>Empty Bin</Text>
          <Text style={[styles.weightValue, styles.tareWeight]}>
            {formatWeight(tareGrams, unit)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.netSection}>
          <Text style={styles.netLabel}>NET WEIGHT</Text>
          <Text style={styles.netValue}>{formatWeight(netGrams, unit)}</Text>
        </View>

        <View style={styles.confidenceBar}>
          <Text style={styles.confidenceText}>
            OCR Confidence: {Math.round(ocrConfidence * 100)}%
          </Text>
          <View style={styles.confidenceTrack}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${Math.min(ocrConfidence * 100, 100)}%`,
                  backgroundColor:
                    ocrConfidence >= 0.8
                      ? '#4CAF50'
                      : ocrConfidence >= 0.6
                      ? '#FFC107'
                      : '#F44336',
                },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Record</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newWeighingButton}
          onPress={() => navigation.navigate('HomeTabs')}
        >
          <Text style={styles.newWeighingButtonText}>New Weighing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
    gap: 24,
  },
  headerSection: {
    alignItems: 'center',
  },
  completeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e94560',
    letterSpacing: 2,
    marginBottom: 8,
  },
  binLabel: {
    fontSize: 18,
    color: '#aaa',
  },
  resultCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightLabel: {
    fontSize: 16,
    color: '#aaa',
  },
  weightValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  tareWeight: {
    color: '#FFC107',
  },
  divider: {
    height: 1,
    backgroundColor: '#0f3460',
    marginVertical: 16,
  },
  netSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#aaa',
    letterSpacing: 2,
    marginBottom: 8,
  },
  netValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#e94560',
  },
  confidenceBar: {
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  confidenceTrack: {
    height: 4,
    backgroundColor: '#0f3460',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  actions: {
    gap: 12,
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
  newWeighingButton: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  newWeighingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
