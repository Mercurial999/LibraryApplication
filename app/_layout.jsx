import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack 
        screenOptions={{
          headerShown: false, // Hide the default header
          gestureEnabled: true, // Enable swipe gestures for navigation
          animation: 'slide_from_right', // Smooth navigation animation
          contentStyle: { backgroundColor: '#f8fafc' }, // Default background color
          headerStyle: { backgroundColor: '#ffffff' }, // Header background (if shown)
          headerTintColor: '#1e293b', // Header text color (if shown)
          headerTitleStyle: { fontWeight: '600' }, // Header title style (if shown)
        }}
      />
    </GestureHandlerRootView>
  );
}