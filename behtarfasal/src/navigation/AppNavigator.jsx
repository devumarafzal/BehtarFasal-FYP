import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../constants/theme';
import { subscribeToAuthChanges } from '../firebase/auth';
import { getFarms } from '../firebase/firestore';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import FarmingCalendarScreen from '../screens/calendar/FarmingCalendarScreen';
import ChatbotScreen from '../screens/chat/ChatbotScreen';
import CropRecommendScreen from '../screens/crop/CropRecommendScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DiseaseDetectScreen from '../screens/disease/DiseaseDetectScreen';
import AddFarmScreen from '../screens/farm/AddFarmScreen';
import FarmDetailScreen from '../screens/farm/FarmDetailScreen';
import FarmListScreen from '../screens/farm/FarmListScreen';
import MoreScreen from '../screens/more/MoreScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import WeatherScreen from '../screens/weather/WeatherScreen';

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStackNavigator = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
    </AuthStack.Navigator>
  );
};

const MainTabsNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: theme.fontSize.xl,
          fontWeight: '700',
        },
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';

          if (route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'My Farms') {
            iconName = 'leaf';
          } else if (route.name === 'Chatbot') {
            iconName = 'chatbubbles';
          } else if (route.name === 'Weather') {
            iconName = 'cloudy';
          } else if (route.name === 'More') {
            iconName = 'ellipsis-horizontal';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: 'Dashboard',
          headerRight: () => (
            <Pressable style={styles.headerButton} onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person-circle" size={26} color={theme.colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Tab.Screen
        name="My Farms"
        component={FarmListScreen}
        options={({ navigation }) => ({
          title: 'My Farms',
          headerRight: () => (
            <Pressable style={styles.headerButton} onPress={() => navigation.navigate('AddFarm')}>
              <Ionicons name="add-circle" size={26} color={theme.colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Tab.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'Chatbot' }} />
      <Tab.Screen name="Weather" component={WeatherScreen} options={{ title: 'Weather' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
};

const MainStackNavigator = ({ hasFarmProfile }) => {
  return (
    <MainStack.Navigator
      key={hasFarmProfile ? 'profile-complete' : 'profile-incomplete'}
      initialRouteName={hasFarmProfile ? 'MainTabs' : 'AddFarm'}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabsNavigator} options={{ headerShown: false }} />
      <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <MainStack.Screen
        name="Calendar"
        component={FarmingCalendarScreen}
        options={{ title: 'Farming Calendar' }}
      />
      <MainStack.Screen
        name="DiseaseDetect"
        component={DiseaseDetectScreen}
        options={{ title: 'Disease Detection' }}
      />
      <MainStack.Screen name="AddFarm" component={AddFarmScreen} options={{ title: 'Farm Setup' }} />
      <MainStack.Screen name="FarmDetail" component={FarmDetailScreen} options={{ title: 'Farm Details' }} />
      <MainStack.Screen
        name="CropRecommend"
        component={CropRecommendScreen}
        options={{ title: 'Crop Recommendation' }}
      />
    </MainStack.Navigator>
  );
};

const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasFarmProfile, setHasFarmProfile] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setLoading(true);
      setUser(currentUser);

      if (!currentUser) {
        setHasFarmProfile(true);
        setLoading(false);
        return;
      }

      try {
        const farms = await getFarms(currentUser.uid);
        setHasFarmProfile(farms.length > 0);
      } catch (_error) {
        setHasFarmProfile(true);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main">
            {() => <MainStackNavigator hasFarmProfile={hasFarmProfile} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  headerButton: {
    marginRight: theme.spacing.sm,
  },
});

export default AppNavigator;
