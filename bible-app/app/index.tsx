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
        <Text style={styles.buttonText}>Play Wordle</Text>
      </Link>
      <Link href="/kahoot" style={styles.button}>
        <Text style={styles.buttonText}>Play Kahoot</Text>
      </Link>
      <Link href="/verseguess" style={styles.button}>
        <Text style={styles.buttonText}>Verse Guess</Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  link: {
    fontSize: 18,
    color: "blue",
    marginVertical: 10,
  },


  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugButton: {
    marginTop: 20,
    color: 'red',
    textDecorationLine: 'underline',
  },
});