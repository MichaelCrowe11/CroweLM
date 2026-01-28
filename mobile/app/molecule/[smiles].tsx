import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface MoleculeProperty {
  label: string;
  value: string;
  unit?: string;
  status?: 'good' | 'warning' | 'bad';
}

export default function MoleculeScreen() {
  const { smiles } = useLocalSearchParams<{ smiles: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Mock molecular properties - in real app would be calculated
  const properties: MoleculeProperty[] = [
    { label: 'Molecular Weight', value: '180.16', unit: 'g/mol', status: 'good' },
    { label: 'LogP', value: '1.31', status: 'good' },
    { label: 'H-Bond Donors', value: '1', status: 'good' },
    { label: 'H-Bond Acceptors', value: '4', status: 'good' },
    { label: 'Rotatable Bonds', value: '3', status: 'good' },
    { label: 'TPSA', value: '63.6', unit: 'A²', status: 'good' },
    { label: 'QED Score', value: '0.55', status: 'good' },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'bad':
        return '#ef4444';
      default:
        return isDark ? '#94a3b8' : '#64748b';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      contentContainerStyle={styles.content}
    >
      {/* SMILES Display */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          Structure
        </Text>
        <View style={[styles.smilesBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
          <Text style={[styles.smilesText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
            {decodeURIComponent(smiles || 'CCO')}
          </Text>
        </View>
        <View style={styles.structurePlaceholder}>
          <Ionicons name="cube-outline" size={64} color={isDark ? '#334155' : '#e2e8f0'} />
          <Text style={[styles.placeholderText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            3D structure visualization
          </Text>
        </View>
      </View>

      {/* Lipinski Rules */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <View style={styles.ruleHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
            Lipinski's Rule of 5
          </Text>
          <View style={[styles.passedBadge, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={styles.passedText}>Passed</Text>
          </View>
        </View>
        <Text style={[styles.ruleDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          This molecule passes all Lipinski criteria for oral drug-likeness.
        </Text>
      </View>

      {/* Properties */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          Molecular Properties
        </Text>

        {properties.map((prop, index) => (
          <View
            key={prop.label}
            style={[
              styles.propertyRow,
              index < properties.length - 1 && styles.propertyBorder,
            ]}
          >
            <Text style={[styles.propertyLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {prop.label}
            </Text>
            <View style={styles.propertyValueContainer}>
              <Text style={[styles.propertyValue, { color: getStatusColor(prop.status) }]}>
                {prop.value}
              </Text>
              {prop.unit && (
                <Text style={[styles.propertyUnit, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                  {prop.unit}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}
        >
          <Ionicons name="download-outline" size={20} color="#3b82f6" />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}
        >
          <Ionicons name="copy-outline" size={20} color="#3b82f6" />
          <Text style={styles.actionText}>Copy SMILES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}
        >
          <Ionicons name="share-outline" size={20} color="#3b82f6" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  smilesBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  smilesText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  structurePlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 13,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passedText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  ruleDescription: {
    fontSize: 13,
    marginTop: 8,
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  propertyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  propertyLabel: {
    fontSize: 14,
  },
  propertyValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  propertyValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  propertyUnit: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});
