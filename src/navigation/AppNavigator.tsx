import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import DashboardScreen from '../screens/DashboardScreen';
import TasksScreen from '../screens/TasksScreen';
import StoreScreen from '../screens/StoreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import TimerOverlay from '../components/TimerOverlay';
import ErrorBoundary from '../components/ErrorBoundary';
import CheckInModal from '../components/CheckInModal';
import AuthModal from '../components/AuthModal';
import { useEconomyStore, CheckInResult } from '../store/economyStore';
import { useAuthStore } from '../store/authStore';
import { useCloudSync } from '../store/syncEngine';
import { hapticSuccess } from '../utils/haptics';
import { useConfettiStore } from '../store/confettiStore';

const Tab = createBottomTabNavigator();

const DashboardWithBoundary = () => (
  <ErrorBoundary><DashboardScreen /></ErrorBoundary>
);
const TasksWithBoundary = () => (
  <ErrorBoundary><TasksScreen /></ErrorBoundary>
);
const StoreWithBoundary = () => (
  <ErrorBoundary><StoreScreen /></ErrorBoundary>
);
const ProfileWithBoundary = () => (
  <ErrorBoundary><ProfileScreen /></ErrorBoundary>
);
const CollectionsWithBoundary = () => (
  <ErrorBoundary><CollectionsScreen /></ErrorBoundary>
);

// ─── Desktop Sidebar Component ────────────────────────────────────────────────
interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabName: string) => void;
}

function DesktopSidebar({ currentTab, onSelectTab }: SidebarProps) {
  const { dollarBalance, streak, debt } = useEconomyStore();
  const { user, openModal } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', label: 'Summary', icon: 'home-outline', activeIcon: 'home' },
    { name: 'Tasks', label: 'Tasks & Icebox', icon: 'list-outline', activeIcon: 'list' },
    { name: 'Collections', label: 'Journeys', icon: 'map-outline', activeIcon: 'map' },
    { name: 'Store', label: 'Reward Store', icon: 'cart-outline', activeIcon: 'cart' },
    { name: 'Profile', label: 'Profile & Credit', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={styles.sidebarContainer}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandBadge}>
          <Ionicons name="flash" size={16} color="#BF5AF2" />
        </View>
        <View>
          <Text style={styles.brandTitle}>EARNED</Text>
          <Text style={styles.brandSubtitle}>FOCUS ECONOMY</Text>
        </View>
      </View>

      {/* Cloud Devices Sync Pill Button */}
      <Pressable onPress={openModal} style={styles.cloudSyncPill}>
        <Ionicons
          name={user ? 'person-circle' : 'log-in-outline'}
          size={20}
          color={user ? '#30D158' : '#BF5AF2'}
        />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={styles.cloudSyncTitle}>
            {user ? user.user_metadata?.name || user.user_metadata?.full_name || 'Logged In' : 'Login'}
          </Text>
          <Text style={styles.cloudSyncSub} numberOfLines={1}>
            {user ? user.email : 'Sign in to sync your progress'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#8E8E93" />
      </Pressable>

      {/* Mini Economy Status Card */}
      <View style={styles.economyCard}>
        <View style={styles.economyRow}>
          <Text style={styles.economyLabel}>CASH BALANCE</Text>
          <View style={styles.cashContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <Text style={styles.cashAmount}>{dollarBalance.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.economyRow}>
          <Text style={styles.economyLabel}>STREAK</Text>
          <Text style={styles.streakText}>🔥 {streak} Days</Text>
        </View>

        {debt > 0 && (
          <View style={styles.debtBanner}>
            <Text style={styles.debtText}>Tab: ${debt.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Navigation Links */}
      <View style={styles.navGroup}>
        <Text style={styles.navHeader}>NAVIGATION</Text>
        {navItems.map((item) => {
          const isActive = currentTab === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => onSelectTab(item.name)}
              style={({ pressed }) => [
                styles.navItem,
                isActive && styles.navItemActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={20}
                color={isActive ? '#BF5AF2' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.navItemLabel,
                  isActive && styles.navItemLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Footer Tagline */}
      <View style={styles.sidebarFooter}>
        <Text style={styles.footerText}>Work hard. Spend guilt-free.</Text>
      </View>
    </View>
  );
}

// ─── Main Navigator ──────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Initialize Real-time Cloud Sync
  useCloudSync();

  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [navRef, setNavRef] = useState<any>(null);

  // Removed automatic daily check-in popup
  useEffect(() => {
    // Just handling hydration if needed elsewhere, but auto check-in is removed
  }, []);

  const handleSelectTab = (tabName: string) => {
    setActiveTab(tabName);
    if (navRef) {
      navRef.navigate(tabName);
    }
  };

  const linking = {
    prefixes: [],
    config: {
      screens: {
        Dashboard: '',
        Tasks: 'tasks',
        Collections: 'collections',
        Store: 'store',
        Profile: 'profile',
      },
    },
  };

  return (
    <NavigationContainer linking={linking} ref={(ref) => setNavRef(ref)}>
      <View style={[styles.appWrapper, isDesktop && styles.appWrapperDesktop]}>
        {/* Desktop Sidebar (Only rendered on desktop) */}
        {isDesktop && (
          <DesktopSidebar
            currentTab={activeTab}
            onSelectTab={handleSelectTab}
          />
        )}

        {/* Screen Area */}
        <View style={styles.screenContainer}>
          <Tab.Navigator
            screenListeners={{
              state: (e: any) => {
                const routeName = e.data.state.routes[e.data.state.index]?.name;
                if (routeName) setActiveTab(routeName);
              },
            }}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: isDesktop
                ? { display: 'none' }
                : {
                    backgroundColor: '#000000',
                    borderTopColor: 'rgba(255,255,255,0.08)',
                    paddingBottom: 20,
                    height: 80,
                  },
              tabBarActiveTintColor: '#BF5AF2',
              tabBarInactiveTintColor: '#8E8E93',
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: any = 'help';
                if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
                if (route.name === 'Tasks') iconName = focused ? 'list' : 'list-outline';
                if (route.name === 'Collections') iconName = focused ? 'map' : 'map-outline';
                if (route.name === 'Store') iconName = focused ? 'cart' : 'cart-outline';
                if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Dashboard" component={DashboardWithBoundary} />
            <Tab.Screen name="Tasks" component={TasksWithBoundary} />
            <Tab.Screen name="Collections" component={CollectionsWithBoundary} />
            <Tab.Screen name="Store" component={StoreWithBoundary} />
            <Tab.Screen name="Profile" component={ProfileWithBoundary} />
          </Tab.Navigator>
        </View>
      </View>

      <TimerOverlay />

      <CheckInModal
        visible={!!checkInResult}
        checkInResult={checkInResult}
        onClose={() => setCheckInResult(null)}
      />

      <AuthModal />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  appWrapperDesktop: {
    flexDirection: 'row',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  sidebarContainer: {
    width: 250,
    backgroundColor: '#0E0E10',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(191,90,242,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  cloudSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  cloudSyncTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cloudSyncSub: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '500',
  },
  economyCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  economyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  economyLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cashContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dollarSign: {
    color: '#30D158',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 2,
  },
  cashAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  debtBanner: {
    backgroundColor: 'rgba(10,132,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.3)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  debtText: {
    color: '#0A84FF',
    fontSize: 10,
    fontWeight: '700',
  },
  navGroup: {
    flex: 1,
    gap: 6,
  },
  navHeader: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(191,90,242,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.3)',
  },
  navItemLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  navItemLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sidebarFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
