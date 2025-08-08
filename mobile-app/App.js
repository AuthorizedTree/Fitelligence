// mobile-app/App.js

import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Welcome      from './screens/Welcome';
import SignIn       from './screens/SignIn';
import Exercises    from './screens/Exercises';
import Diary        from './screens/Diary';
import ChatAI       from './screens/ChatAI';
import MuscleGainer from './screens/MuscleGainer';
import MealPlanner  from './screens/MealPlanner';
import Routines     from './screens/Routines';
import Profile      from './screens/Profile';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  const { logout } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle:      { backgroundColor: '#467fd0' },
        headerTintColor:  '#fff',
        tabBarActiveTintColor:   '#467fd0',
        tabBarInactiveTintColor: '#bbb',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Exercises': return <Ionicons name="barbell-outline" size={size} color={color} />;
            case 'Diary':     return <Ionicons name="book-outline"     size={size} color={color} />;
            case 'Chat':      return <Ionicons name="chatbubbles-outline" size={size} color={color} />;
            case 'Muscle':    return <Ionicons name="fitness-outline"  size={size} color={color} />;
            case 'Meals':     return <Ionicons name="restaurant-outline" size={size} color={color} />;
            case 'Routines':  return <Ionicons name="list-outline"     size={size} color={color} />;
            case 'Profile':   return <Ionicons name="person-circle-outline" size={size} color={color} />;
            default:          return null;
          }
        },
        headerRight: () => (
          <Ionicons
            name="log-out-outline"
            size={24}
            color="#fff"
            style={{ marginRight: 16 }}
            onPress={logout}
          />
        ),
      })}
    >
      <Tab.Screen name="Exercises" component={Exercises} />
      <Tab.Screen name="Diary"      component={Diary} />
      <Tab.Screen name="Chat"       component={ChatAI} />
      <Tab.Screen
        name="Muscle"
        component={MuscleGainer}
        options={{ title: 'Muscle Gainer' }}
      />
      <Tab.Screen name="Meals"      component={MealPlanner} />
      <Tab.Screen name="Routines"   component={Routines} />
      <Tab.Screen name="Profile"    component={Profile} />
    </Tab.Navigator>
  );
}

function AppRoutes() {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'MainTabs' : 'Welcome'}
        screenOptions={{ headerShown: false }}
      >
        {!user && <Stack.Screen name="Welcome" component={Welcome} />}
        {!user && <Stack.Screen name="SignIn"  component={SignIn} />}
        { user && <Stack.Screen name="MainTabs" component={MainTabs} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
