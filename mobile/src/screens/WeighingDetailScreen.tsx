import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { formatWeight, formatDateTime } from '../utils/format';

export default function WeighingDetailScreen({ route }: any) {
  const { weighing } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weighing Details</Text>
        <Text style={styles.timestamp}>{formatDateTime(weighing.created_at)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weight Information</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Gross Weight</Text>
          <Text style={styles.value}>
            {formatWeight(weighing.gross_weight_grams, weighing.unit)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Empty Bin (Tare)</Text>
          <Text style={[styles.value, styles.tare]}>
            {formatWeight(weighing.tare_weight_grams, weighing.unit)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Net Weight</Text>
          <Text style={[styles.value, styles.net]}>
            {formatWeight(weighing.net_weight_grams, weighing.unit)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>OCR Information</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Confidence</Text>
          <Text style={styles.value}>
            {weighing.ocr_confidence
              ? `${Math.round(weighing.ocr_confidence * 100)}%`
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Engine</Text>
          <Text style={styles.value}>{weighing.ocr_engine || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Processing Time</Text>
          <Text style={styles.value}>
            {weighing.processing_time_ms
              ? `${weighing.processing_time_ms}ms`
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{weighing.validation_status}</Text>
        </View>

        {weighing.ocr_raw_result && (
          <View style={styles.rawResultContainer}>
            <Text style={styles.label}>Raw OCR Result</Text>
            <Text style={styles.rawResult}>{weighing.ocr_raw_result}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bin Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Bin Name</Text>
          <Text style={styles.value}>{weighing.bin_name || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Bin ID</Text>
          <Text style={[styles.value, styles.small]}>{weighing.bin_id}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#16213e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#aaa',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  small: {
    fontSize: 12,
    color: '#888',
  },
  tare: {
    color: '#FFC107',
  },
  net: {
    color: '#e94560',
    fontSize: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#0f3460',
    marginVertical: 8,
  },
  rawResultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
  },
  rawResult: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontFamily: 'monospace',
  },
});
