import { Stack } from "expo-router";

export default function Layout() {
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
