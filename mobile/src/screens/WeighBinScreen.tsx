import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { formatWeight } from '../utils/format';

export default function WeighBinScreen({ route, navigation }: any) {
  const { bin } = route.params;

  function handleStartWeighing() {
    navigation.navigate('CameraCapture', {
      mode: 'weigh',
      binId: bin.id,
      binName: bin.name,
      tareWeight: bin.empty_weight,
      tareUnit: bin.unit,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.binName}>{bin.name}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Registered Empty Weight</Text>
        <Text style={styles.weight}>{formatWeight(bin.empty_weight_grams, bin.unit)}</Text>
        <Text style={styles.sublabel}>
          This weight will be subtracted from the gross reading
        </Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>How to Weigh</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>Place the filled bin on the weighing machine</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>Point your camera at the weight display</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>The app will automatically read and calculate</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.weighButton} onPress={handleStartWeighing}>
        <Text style={styles.weighButtonText}>Start Weighing</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  binName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#0f3460',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  weight: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
  },
  weighButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  weighButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
