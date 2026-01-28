import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
}

export default function PipelineScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [targetId, setTargetId] = useState('P15056');
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([
    { id: '1', name: 'Target Analysis', status: 'pending' },
    { id: '2', name: 'Structure Prediction', status: 'pending' },
    { id: '3', name: 'Ligand Generation', status: 'pending' },
    { id: '4', name: 'AI Analysis', status: 'pending' },
    { id: '5', name: 'Report Generation', status: 'pending' },
  ]);

  const runPipeline = async () => {
    if (isRunning) return;
    setIsRunning(true);

    // Reset stages
    setStages((prev) =>
      prev.map((s) => ({ ...s, status: 'pending', result: undefined }))
    );

    // Simulate pipeline execution
    for (let i = 0; i < stages.length; i++) {
      setStages((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } : s
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? { ...s, status: 'completed', result: `Stage ${i + 1} completed successfully` }
            : s
        )
      );
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'pending':
        return <Ionicons name="ellipse-outline" size={20} color="#94a3b8" />;
      case 'running':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#22c55e" />;
      case 'error':
        return <Ionicons name="close-circle" size={20} color="#ef4444" />;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      contentContainerStyle={styles.content}
    >
      {/* Input Section */}
      <View
        style={[
          styles.inputSection,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <Text style={[styles.label, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
          UniProt Target ID
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#f1f5f9' : '#1e293b',
            },
          ]}
          placeholder="e.g., P15056 (BRAF)"
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          value={targetId}
          onChangeText={setTargetId}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runPipeline}
          disabled={isRunning}
        >
          <Ionicons
            name={isRunning ? 'hourglass-outline' : 'play'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running...' : 'Run Pipeline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pipeline Stages */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
        Pipeline Stages
      </Text>

      <View
        style={[
          styles.stagesContainer,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        {stages.map((stage, index) => (
          <View key={stage.id}>
            <View style={styles.stageItem}>
              {getStatusIcon(stage.status)}
              <View style={styles.stageContent}>
                <Text
                  style={[
                    styles.stageName,
                    { color: isDark ? '#f1f5f9' : '#1e293b' },
                  ]}
                >
                  {stage.name}
                </Text>
                {stage.result && (
                  <Text
                    style={[
                      styles.stageResult,
                      { color: isDark ? '#94a3b8' : '#64748b' },
                    ]}
                  >
                    {stage.result}
                  </Text>
                )}
              </View>
            </View>
            {index < stages.length - 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      stage.status === 'completed' ? '#22c55e' : '#334155',
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Info Card */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
        <Text style={[styles.infoText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          The drug discovery pipeline uses NVIDIA BioNeMo NIMs for structure
          prediction and molecule generation, combined with CroweLM for
          AI-powered analysis.
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
  inputSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
    fontSize: 16,
    marginBottom: 16,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    height: 48,
    borderRadius: 8,
  },
  runButtonDisabled: {
    backgroundColor: '#64748b',
  },
  runButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  stagesContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stageContent: {
    marginLeft: 12,
    flex: 1,
  },
  stageName: {
    fontSize: 15,
    fontWeight: '500',
  },
  stageResult: {
    fontSize: 13,
    marginTop: 2,
  },
  connector: {
    width: 2,
    height: 20,
    marginLeft: 9,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 12,
  },
});
