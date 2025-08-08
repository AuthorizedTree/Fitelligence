// mobile-app/navigation/MainTabs.js

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import Exercises from '../screens/Exercises';
import Diary from '../screens/Diary';
import ChatAI from '../screens/ChatAI';
import MuscleGainer from '../screens/MuscleGainer';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const navigation = useNavigation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#467fd0' },
        headerTintColor: '#fff',
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16 }}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#467fd0',
        tabBarInactiveTintColor: '#bbb',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          height: 80, // Increased from 60
          paddingBottom: 10, // Add padding to lift content
          paddingTop: 10, // Add padding at top
          position: 'absolute', // Allows floating effect
          bottom: 20, // Raise from bottom of screen
          left: 20, // Add horizontal margins
          right: 20,
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          borderTopWidth: 0, // Remove default border
        },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Exercises':
              return (
                <Ionicons name="barbell-outline" size={size} color={color} />
              );
            case 'Diary':
              return <Ionicons name="book-outline" size={size} color={color} />;
            case 'Chat':
              return (
                <Ionicons
                  name="chatbubbles-outline"
                  size={size}
                  color={color}
                />
              );
            case 'Muscle':
              return (
                <Ionicons
                  name="fitness-outline"
                  size={size}
                  color={color}
                />
              );
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen name="Exercises" component={Exercises} />
      <Tab.Screen name="Diary" component={Diary} />
      <Tab.Screen name="Chat" component={ChatAI} />
      <Tab.Screen
        name="Muscle"
        component={MuscleGainer}
        options={{ title: 'Muscle Gainer' }}
      />
    </Tab.Navigator>
  );
}
