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
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DEMO_EMAIL = 'demo@smartweigh.com';
const DEMO_PASSWORD = 'Demo@123456';
const DEMO_NAME = 'Demo User';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignup && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let session;
      if (isSignup) {
        session = await api.signup(name.trim(), email, password);
      } else {
        session = await api.login(email, password);
      }
      await login(session);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    try {
      // Try signup first (will fail if already exists, that's fine)
      try {
        await api.signup(DEMO_NAME, DEMO_EMAIL, DEMO_PASSWORD);
      } catch (_) {
        // User likely already exists — ignore signup error
      }
      // Now login
      const session = await api.login(DEMO_EMAIL, DEMO_PASSWORD);
      await login(session);
    } catch (error: any) {
      Alert.alert('Demo Login Failed', error.message || 'Could not login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Smart Weigh</Text>
          <Text style={styles.subtitle}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignup && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignup ? 'Sign Up' : 'Log In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsSignup(!isSignup)}
          >
            <Text style={styles.toggleText}>
              {isSignup
                ? 'Already have an account? Log In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.demoButton, loading && styles.buttonDisabled]}
            onPress={handleDemoLogin}
            disabled={loading}
          >
            <Text style={styles.demoButtonText}>Quick Demo Login</Text>
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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
  },
  form: {
    gap: 16,
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
  button: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleText: {
    color: '#e94560',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0f3460',
  },
  dividerText: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 12,
  },
  demoButton: {
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
});
