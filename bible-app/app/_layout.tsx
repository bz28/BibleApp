import { Stack } from "expo-router";
import { useEffect } from "react";
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  useEffect(() => {
    // Hide the splash screen after the app is ready
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };

    // Small delay to ensure everything is loaded
    const timer = setTimeout(hideSplash, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Bible Word Games',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="wordle"
        options={{
          title: 'Bible Wordle'
        }}
      />
      <Stack.Screen
        name="kahoot"
        options={{
          title: 'Bible Kahoot'
        }}
      />
      <Stack.Screen
        name="verseguess"
        options={{
          title: 'Verse Guess'
        }}
      />
      <Stack.Screen
        name="hotcoldverseguess"
        options={{
          title: 'Hot & Cold Verse Guess'
        }}
      />
      <Stack.Screen
        name="versele"
        options={{
          title: 'Versele'
        }}
      />
    </Stack>
  );
}