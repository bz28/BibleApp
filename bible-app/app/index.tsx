import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "react-native";

export default function Home() {
  const clearStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'Storage cleared');
    } catch (error) {
      console.error('Error clearing storage:', error);
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bible Word Games</Text>
      <Link href="/wordle" style={styles.button}>
        <Text style={styles.buttonText}>Wordle</Text>
      </Link>
      <Link href="/kahoot" style={styles.button}>
        <Text style={styles.buttonText}>Kahoot</Text>
      </Link>
      <Link href="/verseguess" style={styles.button}>
        <Text style={styles.buttonText}>Verse Guess</Text>
      </Link>
      <Link href="/hotcoldverseguess" style={styles.button}>
        <Text style={styles.buttonText}>Hot & Cold</Text>
      </Link>

      {/* Only show in development */}
      {__DEV__ && (
        <Text
          style={styles.debugButton}
          onPress={clearStorage}
        >
          Clear Storage (Debug)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5e6d3", // Matching parchment background
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 30,
    color: '#2c1810',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  button: {
    backgroundColor: '#8b4513', // Brown color matching theme
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#2c1810',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  debugButton: {
    marginTop: 40,
    color: '#a94442', // Matching the red from wordle
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});