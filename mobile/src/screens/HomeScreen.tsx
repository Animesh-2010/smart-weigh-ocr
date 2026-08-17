import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Bin, WeighingRecord } from '../types';
import { formatWeight, formatDate, formatTime } from '../utils/format';

export default function HomeScreen({ navigation }: any) {
  const { user, logout, getValidToken } = useAuth();
  const [bins, setBins] = useState<Bin[]>([]);
  const [recentWeighings, setRecentWeighings] = useState<WeighingRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await getValidToken();
      const [binsResponse, weighingsResponse] = await Promise.all([
        api.getBins(token),
        api.getWeighings(token, 5),
      ]);
      setBins(binsResponse.bins);
      setRecentWeighings(weighingsResponse.weighings);
    } catch (error: any) {
      if (error.message?.includes('expired') || error.message?.includes('Not signed in')) {
        logout();
      }
    }
  }, [getValidToken, logout]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
        }
        ListHeaderComponent={
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Bins</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => navigation.navigate('AddBin')}
                >
                  <Text style={styles.addButtonText}>+ Add New Bin</Text>
                </TouchableOpacity>
              </View>

              {bins.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No bins registered yet</Text>
                  <Text style={styles.emptySubtext}>Add your first bin to get started</Text>
                </View>
              ) : (
                bins.map((bin) => (
                  <TouchableOpacity
                    key={bin.id}
                    style={styles.binCard}
                    onPress={() => navigation.navigate('WeighBin', { bin })}
                  >
                    <View style={styles.binInfo}>
                      <Text style={styles.binName}>{bin.name}</Text>
                      <Text style={styles.binWeight}>
                        Empty: {formatWeight(bin.empty_weight_grams, bin.unit)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.weighButton}
                      onPress={() => navigation.navigate('WeighBin', { bin })}
                    >
                      <Text style={styles.weighButtonText}>Weigh</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Weighings</Text>

              {recentWeighings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No weighings yet</Text>
                  <Text style={styles.emptySubtext}>Start weighing to see history</Text>
                </View>
              ) : (
                recentWeighings.map((weighing) => (
                  <TouchableOpacity
                    key={weighing.id}
                    style={styles.weighingCard}
                    onPress={() => navigation.navigate('WeighingDetail', { weighing })}
                  >
                    <View style={styles.weighingInfo}>
                      <Text style={styles.weighingWeight}>
                        {formatWeight(weighing.net_weight_grams, weighing.unit)}
                      </Text>
                      <Text style={styles.weighingBin}>{weighing.bin_name || 'Unknown Bin'}</Text>
                    </View>
                    <View style={styles.weighingTime}>
                      <Text style={styles.weighingDateText}>{formatDate(weighing.created_at)}</Text>
                      <Text style={styles.weighingTimeText}>{formatTime(weighing.created_at)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        }
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
  greeting: {
    fontSize: 14,
    color: '#aaa',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutText: {
    color: '#e94560',
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#16213e',
    borderRadius: 12,
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
  binCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  binInfo: {
    flex: 1,
  },
  binName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  binWeight: {
    fontSize: 14,
    color: '#aaa',
  },
  weighButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  weighButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  weighingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  weighingInfo: {
    flex: 1,
  },
  weighingWeight: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 4,
  },
  weighingBin: {
    fontSize: 14,
    color: '#aaa',
  },
  weighingTime: {
    alignItems: 'flex-end',
  },
  weighingDateText: {
    fontSize: 12,
    color: '#888',
  },
  weighingTimeText: {
    fontSize: 14,
    color: '#aaa',
  },
});
