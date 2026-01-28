import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  href: string;
  color: string;
}

function QuickAction({ icon, title, description, href, color }: QuickActionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Link href={href as any} asChild>
      <TouchableOpacity
        style={[
          styles.actionCard,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.actionTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
          {title}
        </Text>
        <Text style={[styles.actionDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          {description}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          CroweLM Biotech
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          AI-Powered Drug Discovery Platform
        </Text>
      </View>

      {/* Status Card */}
      <View
        style={[
          styles.statusCard,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[styles.statusText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              API Connected
            </Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={[styles.statusText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              NVIDIA NIMs
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
        Quick Actions
      </Text>

      <View style={styles.actionsGrid}>
        <QuickAction
          icon="flask-outline"
          title="Target Analysis"
          description="Analyze drug targets"
          href="/target/P15056"
          color="#8b5cf6"
        />
        <QuickAction
          icon="chatbubble-outline"
          title="Research Chat"
          description="Ask biotech questions"
          href="/(tabs)/research"
          color="#3b82f6"
        />
        <QuickAction
          icon="git-branch-outline"
          title="Drug Pipeline"
          description="Run discovery workflow"
          href="/(tabs)/pipeline"
          color="#22c55e"
        />
        <QuickAction
          icon="cube-outline"
          title="Molecules"
          description="Generate compounds"
          href="/molecule/CCO"
          color="#f59e0b"
        />
      </View>

      {/* Recent Activity */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
        Recent Activity
      </Text>

      <View
        style={[
          styles.activityCard,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <View style={styles.activityItem}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              BRAF Analysis Complete
            </Text>
            <Text style={[styles.activityTime, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              2 hours ago
            </Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <Ionicons name="flask" size={20} color="#8b5cf6" />
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              10 molecules generated
            </Text>
            <Text style={[styles.activityTime, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              5 hours ago
            </Text>
          </View>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  actionCard: {
    width: '50%',
    padding: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    marginTop: 2,
  },
});
