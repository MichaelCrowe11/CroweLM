import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button, Input, Card } from '../../components/ui';
import { colors, typography, spacing, borderRadius } from '../../theme';

const EXAMPLE_TARGETS = [
  { id: 'P15056', name: 'BRAF', description: 'Serine/threonine-protein kinase B-raf' },
  { id: 'P00533', name: 'EGFR', description: 'Epidermal growth factor receptor' },
  { id: 'P04637', name: 'TP53', description: 'Cellular tumor antigen p53' },
  { id: 'P38398', name: 'BRCA1', description: 'Breast cancer type 1 susceptibility protein' },
];

export default function NewTargetScreen() {
  const [targetId, setTargetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!targetId.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    // Navigate to target analysis page
    router.push(`/target/${targetId.trim().toUpperCase()}`);
  };

  const handleExamplePress = (id: string) => {
    Haptics.selectionAsync();
    setTargetId(id);
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
            <Ionicons name="flask" size={32} color={colors.primary[400]} />
          </View>
          <Text style={styles.title}>Analyze Drug Target</Text>
          <Text style={styles.description}>
            Enter a UniProt ID to analyze protein structure, function, and potential drug interactions
          </Text>
        </Animated.View>

        {/* Input */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Input
            label="UniProt Target ID"
            value={targetId}
            onChangeText={setTargetId}
            placeholder="e.g., P15056"
            leftIcon="search"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Button
            title="Analyze Target"
            variant="gradient"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!targetId.trim()}
            onPress={handleAnalyze}
            icon={<Ionicons name="arrow-forward" size={20} color={colors.text.primary} />}
            iconPosition="right"
            style={styles.analyzeButton}
          />
        </Animated.View>

        {/* Examples */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Text style={styles.sectionTitle}>Example Targets</Text>
          <View style={styles.examplesGrid}>
            {EXAMPLE_TARGETS.map((target, index) => (
              <Card
                key={target.id}
                variant="outlined"
                onPress={() => handleExamplePress(target.id)}
                padding={3}
                style={styles.exampleCard}
              >
                <View style={styles.exampleHeader}>
                  <Text style={styles.exampleId}>{target.id}</Text>
                  <Text style={styles.exampleName}>{target.name}</Text>
                </View>
                <Text style={styles.exampleDescription} numberOfLines={2}>
                  {target.description}
                </Text>
              </Card>
            ))}
          </View>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <Card variant="elevated" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={24} color={colors.primary[400]} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>What is a UniProt ID?</Text>
                <Text style={styles.infoText}>
                  UniProt IDs are unique identifiers for proteins in the Universal Protein
                  Resource database. They help us retrieve comprehensive protein information
                  including sequence, structure, and function data.
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
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
    backgroundColor: `${colors.primary[500]}20`,
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
  analyzeButton: {
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[2],
    marginBottom: spacing[6],
  },
  exampleCard: {
    width: '50%',
    padding: spacing[2],
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  exampleId: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary[400],
    marginRight: spacing[2],
  },
  exampleName: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.text.primary,
  },
  exampleDescription: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    lineHeight: 16,
  },
  infoCard: {
    marginBottom: spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  infoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
