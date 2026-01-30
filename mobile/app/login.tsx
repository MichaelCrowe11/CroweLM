import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button, Input, Card } from '../components/ui';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  const { login, register, isLoading, error, clearError } = useAuth();

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearError();

    try {
      if (isSignUp) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      router.replace('/(tabs)');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setIsSignUp(!isSignUp);
    clearError();
  };

  const handleDemoLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Skip auth for demo
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.primary[900]]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Header */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.primary[500], colors.accent[600]]}
                style={styles.logoGradient}
              >
                <Ionicons name="flask" size={40} color={colors.text.primary} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>CroweLM Biotech</Text>
            <Text style={styles.subtitle}>
              AI-Powered Drug Discovery Platform
            </Text>
          </Animated.View>

          {/* Auth Card */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={styles.cardWrapper}
          >
            <Card variant="elevated" padding={6} style={styles.authCard}>
              <Text style={styles.cardTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isSignUp
                  ? 'Join the future of drug discovery'
                  : 'Sign in to continue your research'}
              </Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={colors.status.error}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {isSignUp && (
                <Input
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  leftIcon="person-outline"
                  autoCapitalize="words"
                  autoComplete="name"
                />
              )}

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                leftIcon="lock-closed-outline"
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />

              {!isSignUp && (
                <Pressable style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </Pressable>
              )}

              <Button
                title={isSignUp ? 'Create Account' : 'Sign In'}
                variant="gradient"
                size="lg"
                fullWidth
                loading={isLoading}
                onPress={handleSubmit}
                style={styles.submitButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Continue as Guest"
                variant="outline"
                size="lg"
                fullWidth
                onPress={handleDemoLogin}
                icon={
                  <Ionicons
                    name="rocket-outline"
                    size={20}
                    color={colors.primary[400]}
                  />
                }
              />

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <Pressable onPress={toggleMode}>
                  <Text style={styles.toggleLink}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>

          {/* Features Preview */}
          <Animated.View
            entering={FadeInUp.delay(600).duration(600)}
            style={styles.features}
          >
            <View style={styles.featureItem}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={colors.secondary[400]}
              />
              <Text style={styles.featureText}>Secure & HIPAA Compliant</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="cloud-done"
                size={20}
                color={colors.primary[400]}
              />
              <Text style={styles.featureText}>Cloud-Powered AI</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="hardware-chip"
                size={20}
                color={colors.accent[400]}
              />
              <Text style={styles.featureText}>NVIDIA NIMs Integration</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logoContainer: {
    marginBottom: spacing[4],
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  cardWrapper: {
    marginBottom: spacing[6],
  },
  authCard: {
    backgroundColor: colors.background.card,
  },
  cardTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  cardSubtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing[5],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.status.error}20`,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing[4],
    marginTop: -spacing[2],
  },
  forgotPasswordText: {
    color: colors.primary[400],
    fontSize: typography.sizes.sm,
  },
  submitButton: {
    marginTop: spacing[2],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[5],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    color: colors.text.tertiary,
    fontSize: typography.sizes.sm,
    marginHorizontal: spacing[3],
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[5],
  },
  toggleText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
  },
  toggleLink: {
    color: colors.primary[400],
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginLeft: spacing[1],
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[2],
  },
  featureText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.xs,
    marginLeft: spacing[2],
  },
});
