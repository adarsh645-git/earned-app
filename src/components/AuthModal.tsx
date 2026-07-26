import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { useSyncStatusStore, isSyncUnhealthy, getFailingChannels } from '../store/syncStatusStore';
import { retrySync } from '../store/syncEngine';

export default function AuthModal() {
  const { isModalOpen, closeModal, user, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuthStore();
  const syncChannels = useSyncStatusStore((s) => s.channels);
  const syncUnhealthy = isSyncUnhealthy(syncChannels);
  const failingChannels = getFailingChannels(syncChannels);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [retrying, setRetrying] = useState(false);

  if (!isModalOpen) return null;

  const handleRetrySync = async () => {
    if (!user) return;
    setRetrying(true);
    await retrySync(user.id);
    setRetrying(false);
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      setErrorMessage(error.message || 'Google sign in failed.');
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signInWithEmail(email.trim(), password);
      setLoading(false);
      if (error) {
        setErrorMessage(error.message || 'Could not sign in. Please check credentials.');
      } else {
        closeModal();
      }
    } else {
      const { error } = await signUpWithEmail(email.trim(), password);
      setLoading(false);
      if (error) {
        setErrorMessage(error.message || 'Could not create account.');
      } else {
        setSuccessMessage('Account created! You are now logged in and synced.');
        setTimeout(() => closeModal(), 1500);
      }
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
    closeModal();
  };

  return (
    <Modal visible={isModalOpen} animationType="fade" transparent statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={closeModal}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="cloud-done-outline" size={24} color="#BF5AF2" />
            </View>
            <Pressable onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          <Text style={styles.title}>Multi-Device Cloud Sync</Text>
          <Text style={styles.subtitle}>
            Synchronize your focus streak, cash balance, tasks, and store items live across your phone, laptop, and desktop.
          </Text>

          {/* User Already Signed In View */}
          {user ? (
            <View style={styles.signedInContainer}>
              <View style={[styles.userInfoBox, syncUnhealthy ? styles.userInfoBoxUnhealthy : null]}>
                <Ionicons
                  name={syncUnhealthy ? 'cloud-offline-outline' : 'person-circle-outline'}
                  size={32}
                  color={syncUnhealthy ? '#FF9F0A' : '#30D158'}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.statusLabel, syncUnhealthy ? styles.statusLabelUnhealthy : null]}>
                    {syncUnhealthy ? 'SYNC PAUSED' : 'SYNC ACTIVE'}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>

              {syncUnhealthy && (
                <View style={styles.syncIssueBox}>
                  <Text style={styles.syncIssueTitle}>
                    Having trouble reaching the cloud for: {failingChannels.map((c) => c.label).join(', ')}
                  </Text>
                  {failingChannels[0]?.error && (
                    <Text style={styles.syncIssueDetail} numberOfLines={2}>
                      {failingChannels[0].error}
                    </Text>
                  )}
                  <Text style={styles.syncIssueNote}>
                    Nothing is lost — changes stay saved on this device and will sync once this clears.
                  </Text>
                  <Pressable
                    onPress={handleRetrySync}
                    disabled={retrying}
                    style={[styles.actionButton, styles.retryButton]}
                  >
                    {retrying ? (
                      <ActivityIndicator color="#FF9F0A" />
                    ) : (
                      <Text style={styles.retryButtonText}>Retry Sync</Text>
                    )}
                  </Pressable>
                </View>
              )}

              <Pressable
                onPress={handleSignOut}
                disabled={loading}
                style={[styles.actionButton, styles.signOutButton]}
              >
                {loading ? (
                  <ActivityIndicator color="#FF453A" />
                ) : (
                  <Text style={styles.signOutButtonText}>Sign Out of Devices</Text>
                )}
              </Pressable>
            </View>
          ) : (
            /* Auth Form (Google & Email) */
            <View style={styles.formContainer}>
              
              {/* Primary Google Auth Button */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                style={styles.googleButton}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.googleButtonContent}>
                    <Ionicons name="logo-google" size={18} color="#EA4335" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR EMAIL</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Tab Switcher */}
              <View style={styles.tabSwitcher}>
                <Pressable
                  onPress={() => { setMode('signin'); setErrorMessage(''); }}
                  style={[styles.tabItem, mode === 'signin' && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign In</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setMode('signup'); setErrorMessage(''); }}
                  style={[styles.tabItem, mode === 'signup' && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create Account</Text>
                </Pressable>
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { outlineStyle: 'none' } as any]}
              />

              {/* Password Input */}
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                style={[styles.input, { outlineStyle: 'none' } as any]}
              />

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.actionButton, styles.submitButton]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {mode === 'signin' ? 'Sign In & Sync Devices' : 'Create Account & Sync'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.3)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#BF5AF2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(191,90,242,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 20,
  },
  googleButton: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  signedInContainer: {
    gap: 16,
  },
  userInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
    borderRadius: 16,
    padding: 16,
  },
  statusLabel: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  userEmail: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  userInfoBoxUnhealthy: {
    borderColor: 'rgba(255,159,10,0.4)',
  },
  statusLabelUnhealthy: {
    color: '#FF9F0A',
  },
  syncIssueBox: {
    backgroundColor: 'rgba(255,159,10,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  syncIssueTitle: {
    color: '#FF9F0A',
    fontSize: 13,
    fontWeight: '700',
  },
  syncIssueDetail: {
    color: '#8E8E93',
    fontSize: 11,
    fontFamily: 'monospace' as any,
  },
  syncIssueNote: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.4)',
  },
  retryButtonText: {
    color: '#FF9F0A',
    fontSize: 14,
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#2C2C2E',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(255,69,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(48,209,88,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#BF5AF2',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  signOutButton: {
    backgroundColor: 'rgba(255,69,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.4)',
  },
  signOutButtonText: {
    color: '#FF453A',
    fontSize: 15,
    fontWeight: '800',
  },
});
