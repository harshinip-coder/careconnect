import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Auth screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { VerifyResetCodeScreen } from '../screens/VerifyResetCodeScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';

// Role Dashboards
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { ResidentDashboardScreen } from '../screens/ResidentDashboardScreen';
import { GuardianDashboardScreen } from '../screens/GuardianDashboardScreen';
import { SocietyDashboardScreen } from '../screens/SocietyDashboardScreen';
import { SecurityDashboardScreen } from '../screens/SecurityDashboardScreen';
import { VolunteerDashboardScreen } from '../screens/VolunteerDashboardScreen';

// Admin Sub-screens
import { AdminReportsScreen } from '../screens/AdminReportsScreen';
import { AdminSOSMapScreen } from '../screens/AdminSOSMapScreen';

// Common screens
import { EmergencyChatScreen } from '../screens/EmergencyChatScreen';
import { GuardianManagerScreen } from '../screens/GuardianManagerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AvatarScreen } from '../screens/AvatarScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ConnectionDiagnosticScreen } from '../screens/ConnectionDiagnosticScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Admin Role Bottom Tab Navigator (NO SETTINGS TAB)
const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#0D9488',
      tabBarInactiveTintColor: '#64748B',
      tabBarStyle: {
        height: 64,
        paddingBottom: 10,
        paddingTop: 8,
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E2E8F0',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
      tabBarIcon: () => {
        let icon = '📱';
        if (route.name === 'AdminDashboard') icon = '📱';
        else if (route.name === 'NotificationsTab') icon = '🔔';
        else if (route.name === 'SOS Map') icon = '📍';
        else if (route.name === 'Reports') icon = '📊';
        return <Text style={{ fontSize: 20 }}>{icon}</Text>;
      },
    })}
  >
    <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
    <Tab.Screen name="NotificationsTab" component={NotificationCenterScreen} options={{ tabBarLabel: 'Notifications' }} />
    <Tab.Screen name="SOS Map" component={AdminSOSMapScreen} />
    <Tab.Screen name="Reports" component={AdminReportsScreen} />
  </Tab.Navigator>
);

export const RootNavigator = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'ADMIN':
        return AdminTabNavigator;
      case 'GUARDIAN':
        return GuardianDashboardScreen;
      case 'SOCIETY_MEMBER':
        return SocietyDashboardScreen;
      case 'SECURITY':
        return SecurityDashboardScreen;
      case 'VOLUNTEER':
        return VolunteerDashboardScreen;
      case 'RESIDENT':
      default:
        return ResidentDashboardScreen;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyResetCode" component={VerifyResetCodeScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ConnectionDiagnostic" component={ConnectionDiagnosticScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={getDashboardComponent()} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Avatar" component={AvatarScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
            <Stack.Screen name="EmergencyChat" component={EmergencyChatScreen} />
            <Stack.Screen name="GuardianManager" component={GuardianManagerScreen} />
            <Stack.Screen name="Reports" component={AdminReportsScreen} />
            <Stack.Screen name="SOS Map" component={AdminSOSMapScreen} />
            <Stack.Screen name="ConnectionDiagnostic" component={ConnectionDiagnosticScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
