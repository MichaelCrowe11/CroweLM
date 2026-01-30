import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button, Input, Card, StatusBadge } from '../../components/ui';
import { MoleculeViewer } from '../../components/molecules/MoleculeViewer';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { api } from '../../services/api';
import { notifications } from '../../services/notifications';

const { width } = Dimensions.get('window');

interface GeneratedMolecule {
  smiles: string;
  score: number;
  properties: {
    molecularWeight: number;
    logP: number;
    hbd: number;
    hba: number;
  };
}

export default function NewMoleculeScreen() {
  const [seedSmiles, setSeedSmiles] = useState('');
  const [count, setCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [molecules, setMolecules] = useState<GeneratedMolecule[]>([]);
  const [selectedMolecule, setSelectedMolecule] = useState<GeneratedMolecule | null>(null);

  const handleGenerate = async () => {
    if (!seedSmiles.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    setMolecules([]);
    setSelectedMolecule(null);

    try {
      // Demo molecules - in production this would call the API
      const demoMolecules: GeneratedMolecule[] = Array.from({ length: parseInt(count) }, (_, i) => ({
        smiles: `${seedSmiles}-variant-${i + 1}`,
        score: Math.random() * 0.4 + 0.6,
        properties: {
          molecularWeight: 200 + Math.random() * 300,
          logP: Math.random() * 5 - 1,
          hbd: Math.floor(Math.random() * 5),
          hba: Math.floor(Math.random() * 10),
        },
      }));

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setMolecules(demoMolecules);
      setSelectedMolecule(demoMolecules[0]);

      // Send notification
      await notifications.notifyMoleculesGenerated(demoMolecules.length, seedSmiles);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMoleculeSelect = (molecule: GeneratedMolecule) => {
    Haptics.selectionAsync();
    setSelectedMolecule(molecule);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={32} color={colors.status.warning} />
          </View>
          <Text style={styles.title}>Generate Molecules</Text>
          <Text style={styles.description}>
            Enter a seed SMILES structure to generate novel molecule candidates
          </Text>
        </Animated.View>

        {/* Input Form */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Input
            label="Seed SMILES"
            value={seedSmiles}
            onChangeText={setSeedSmiles}
            placeholder="e.g., CCO, CC(=O)Oc1ccccc1C(=O)O"
            leftIcon="code"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Number of Molecules"
            value={count}
            onChangeText={setCount}
            placeholder="10"
            leftIcon="apps"
            keyboardType="number-pad"
          />

          <Button
            title={isGenerating ? 'Generating...' : 'Generate Molecules'}
            variant="gradient"
            size="lg"
            fullWidth
            loading={isGenerating}
            disabled={!seedSmiles.trim()}
            onPress={handleGenerate}
            icon={<Ionicons name="sparkles" size={20} color={colors.text.primary} />}
            iconPosition="left"
            style={styles.generateButton}
          />
        </Animated.View>

        {/* 3D Viewer */}
        {selectedMolecule && (
          <Animated.View entering={FadeIn.duration(600)}>
            <Text style={styles.sectionTitle}>3D Molecule Viewer</Text>
            <Card variant="elevated" padding={0} style={styles.viewerCard}>
              <View style={styles.viewerContainer}>
                <MoleculeViewer
                  style="ball-stick"
                  rotationSpeed={0.005}
                />
              </View>
              <View style={styles.viewerInfo}>
                <StatusBadge
                  status="success"
                  label={`Score: ${(selectedMolecule.score * 100).toFixed(1)}%`}
                />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Generated Molecules List */}
        {molecules.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Text style={styles.sectionTitle}>
              Generated Molecules ({molecules.length})
            </Text>
            <View style={styles.moleculesGrid}>
              {molecules.map((molecule, index) => (
                <Card
                  key={index}
                  variant={selectedMolecule === molecule ? 'gradient' : 'outlined'}
                  onPress={() => handleMoleculeSelect(molecule)}
                  padding={3}
                  style={styles.moleculeCard}
                >
                  <View style={styles.moleculeHeader}>
                    <Text style={styles.moleculeIndex}>#{index + 1}</Text>
                    <View
                      style={[
                        styles.scoreBadge,
                        {
                          backgroundColor:
                            molecule.score > 0.8
                              ? `${colors.status.success}20`
                              : molecule.score > 0.6
                              ? `${colors.status.warning}20`
                              : `${colors.status.error}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color:
                              molecule.score > 0.8
                                ? colors.status.success
                                : molecule.score > 0.6
                                ? colors.status.warning
                                : colors.status.error,
                          },
                        ]}
                      >
                        {(molecule.score * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.propertiesRow}>
                    <View style={styles.property}>
                      <Text style={styles.propertyLabel}>MW</Text>
                      <Text style={styles.propertyValue}>
                        {molecule.properties.molecularWeight.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.property}>
                      <Text style={styles.propertyLabel}>logP</Text>
                      <Text style={styles.propertyValue}>
                        {molecule.properties.logP.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.property}>
                      <Text style={styles.propertyLabel}>HBD</Text>
                      <Text style={styles.propertyValue}>
                        {molecule.properties.hbd}
                      </Text>
                    </View>
                    <View style={styles.property}>
                      <Text style={styles.propertyLabel}>HBA</Text>
                      <Text style={styles.propertyValue}>
                        {molecule.properties.hba}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Quick Examples */}
        {molecules.length === 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Text style={styles.sectionTitle}>Example SMILES</Text>
            <Card variant="elevated">
              {[
                { name: 'Ethanol', smiles: 'CCO' },
                { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
                { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C' },
                { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
              ].map((example, index) => (
                <Card
                  key={example.name}
                  variant="outlined"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSeedSmiles(example.smiles);
                  }}
                  padding={3}
                  style={[
                    styles.exampleItem,
                    index < 3 && styles.exampleItemBorder,
                  ]}
                >
                  <Text style={styles.exampleName}>{example.name}</Text>
                  <Text style={styles.exampleSmiles} numberOfLines={1}>
                    {example.smiles}
                  </Text>
                </Card>
              ))}
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.status.warning}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  generateButton: {
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  viewerCard: {
    marginBottom: spacing[6],
    overflow: 'hidden',
  },
  viewerContainer: {
    height: 250,
    backgroundColor: colors.background.primary,
  },
  viewerInfo: {
    padding: spacing[3],
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  moleculesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
    marginBottom: spacing[4],
  },
  moleculeCard: {
    width: '50%',
    padding: spacing[1],
  },
  moleculeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  moleculeIndex: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  scoreBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  scoreText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  propertiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  property: {
    alignItems: 'center',
  },
  propertyLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  propertyValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.text.primary,
  },
  exampleItem: {
    borderRadius: 0,
    borderWidth: 0,
  },
  exampleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  exampleName: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  exampleSmiles: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
