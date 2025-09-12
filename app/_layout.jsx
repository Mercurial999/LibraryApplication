import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
          gestureDirection: 'horizontal',
          detachPreviousScreen: false,
          contentStyle: { backgroundColor: '#0f172a' },
          headerStyle: { backgroundColor: 'rgba(30, 64, 175, 0.92)' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </GestureHandlerRootView>
  );
}