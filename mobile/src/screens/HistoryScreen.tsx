import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { WeighingRecord } from '../types';
import { formatWeight, formatDate, formatTime } from '../utils/format';

export default function HistoryScreen({ navigation }: any) {
  const [weighings, setWeighings] = useState<WeighingRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadWeighings = useCallback(async () => {
    try {
      const response = await api.getWeighings(100);
      setWeighings(response.weighings);
    } catch (error) {
      console.error('Failed to load weighings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWeighings();
    }, [loadWeighings])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadWeighings();
    setRefreshing(false);
  }

  function groupByDate(records: WeighingRecord[]) {
    const groups: { [key: string]: WeighingRecord[] } = {};
    records.forEach((record) => {
      const dateKey = formatDate(record.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });
    return groups;
  }

  const grouped = groupByDate(weighings);
  const sections = Object.entries(grouped).map(([date, records]) => ({
    date,
    data: records,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weighing History</Text>
        <Text style={styles.count}>{weighings.length} records</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No weighing records yet</Text>
              <Text style={styles.emptySubtext}>Your weighing history will appear here</Text>
            </View>
          ) : null
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionDate}>{section.date}</Text>
            {section.data.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.item}
                onPress={() => navigation.navigate('WeighingDetail', { weighing: record })}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemWeight}>
                    {formatWeight(record.net_weight_grams, record.unit)}
                  </Text>
                  <Text style={styles.itemBin}>{record.bin_name || 'Unknown Bin'}</Text>
                  <Text style={styles.itemDetail}>
                    Gross: {formatWeight(record.gross_weight_grams, record.unit)} | Tare: {formatWeight(record.tare_weight_grams, record.unit)}
                  </Text>
                </View>
                <View style={styles.itemTime}>
                  <Text style={styles.timeText}>{formatTime(record.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#16213e',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  count: {
    fontSize: 14,
    color: '#aaa',
  },
  section: {
    padding: 20,
  },
  sectionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemWeight: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  itemBin: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 12,
    color: '#666',
  },
  itemTime: {
    marginLeft: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 13,
  },
});
