import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [apiUrl, setApiUrl] = useState('http://localhost:12434/v1');
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedUrl = await SecureStore.getItemAsync('api_url');
      const savedKey = await SecureStore.getItemAsync('nvidia_key');

      if (savedUrl) setApiUrl(savedUrl);
      if (savedKey) setNvidiaKey(savedKey);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await SecureStore.setItemAsync('api_url', apiUrl);
      if (nvidiaKey) {
        await SecureStore.setItemAsync('nvidia_key', nvidiaKey);
      }
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${apiUrl}/models`);
      if (response.ok) {
        Alert.alert('Success', 'API connection successful!');
      } else {
        Alert.alert('Error', `API returned status ${response.status}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to API');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      contentContainerStyle={styles.content}
    >
      {/* API Configuration */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
        API Configuration
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <Text style={[styles.label, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
          Model API URL
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#f1f5f9' : '#1e293b',
            },
          ]}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://localhost:12434/v1"
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text
          style={[styles.label, { color: isDark ? '#f1f5f9' : '#1e293b', marginTop: 16 }]}
        >
          NVIDIA API Key
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: isDark ? '#334155' : '#f1f5f9',
                color: isDark ? '#f1f5f9' : '#1e293b',
              },
            ]}
            value={nvidiaKey}
            onChangeText={setNvidiaKey}
            placeholder="nvapi-..."
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            secureTextEntry={!showNvidiaKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNvidiaKey(!showNvidiaKey)}
          >
            <Ionicons
              name={showNvidiaKey ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={isDark ? '#94a3b8' : '#64748b'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={testConnection}>
            <Text style={styles.secondaryButtonText}>Test Connection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={saveSettings}>
            <Text style={styles.primaryButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
        Preferences
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <View style={styles.settingRow}>
          <View>
            <Text style={[styles.settingTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              Push Notifications
            </Text>
            <Text style={[styles.settingDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Get notified when pipelines complete
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* About */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
        About
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Version
          </Text>
          <Text style={[styles.aboutValue, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
            1.0.0
          </Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Developer
          </Text>
          <Text style={[styles.aboutValue, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
            Michael Crowe
          </Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Website
          </Text>
          <Text style={[styles.aboutValue, { color: '#3b82f6' }]}>
            crowelogic.com
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
