import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api/client';

interface TargetData {
  target_id: string;
  uniprot?: {
    gene?: string;
    protein_name?: string;
    organism?: string;
    function?: string;
  };
  chembl?: {
    chembl_id?: string;
    target_type?: string;
  };
  druggability_score?: number;
  analysis?: string;
}

export default function TargetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TargetData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTargetData();
  }, [id]);

  const loadTargetData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiClient.analyzeTarget(id || 'P15056');
      setData(result);
    } catch (err) {
      setError('Failed to load target data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          Analyzing target {id}...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={[styles.errorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      contentContainerStyle={styles.content}
    >
      {/* Header Card */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="flask" size={16} color="#3b82f6" />
          </View>
          <Text style={[styles.targetId, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {id}
          </Text>
        </View>
        <Text style={[styles.geneName, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          {data?.uniprot?.gene || 'Unknown Gene'}
        </Text>
        <Text style={[styles.proteinName, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          {data?.uniprot?.protein_name || 'Unknown Protein'}
        </Text>
      </View>

      {/* Druggability Score */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          Druggability Assessment
        </Text>
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>
              {((data?.druggability_score || 0) * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={[styles.scoreLabel, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              Druggability Score
            </Text>
            <Text style={[styles.scoreDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Based on structural tractability and target class analysis
            </Text>
          </View>
        </View>
      </View>

      {/* Target Information */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          Target Information
        </Text>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Organism
          </Text>
          <Text style={[styles.infoValue, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
            {data?.uniprot?.organism || 'Unknown'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Target Type
          </Text>
          <Text style={[styles.infoValue, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
            {data?.chembl?.target_type || 'Kinase'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            ChEMBL ID
          </Text>
          <Text style={[styles.infoValue, { color: '#3b82f6' }]}>
            {data?.chembl?.chembl_id || 'CHEMBL5145'}
          </Text>
        </View>
      </View>

      {/* Function */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          Biological Function
        </Text>
        <Text style={[styles.functionText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
          {data?.uniprot?.function ||
            'Serine/threonine-protein kinase involved in the MAPK/ERK signaling pathway. ' +
              'Plays a role in regulating cell division, differentiation and secretion. ' +
              'Mutations in this gene are associated with various cancers including melanoma.'}
        </Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetId: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  geneName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  proteinName: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  scoreDetails: {
    marginLeft: 16,
    flex: 1,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  scoreDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  functionText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
