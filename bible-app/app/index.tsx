import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "react-native";
import { useEffect } from 'react';
import { initDatabase } from './database/database';

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

  useEffect(() => {
    console.log("Initializing database from index page...");
    initDatabase()
      .then(() => console.log("Database initialized successfully!"))
      .catch(error => console.error("Database initialization failed:", error));
  }, []);

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Bible Word Games</Text>
      <Link href="/wordle" style={styles.button}>
        <Text style={styles.buttonText}>Wordle</Text>
      </Link>
      <Link href="/kahoot" style={styles.button}>
        <Text style={styles.buttonText}>Scripture Blitz</Text>
      </Link>
      <Link href="/verseguess" style={styles.button}>
        <Text style={styles.buttonText}>Verse Guess</Text>
      </Link>
      <Link href="/hotcoldverseguess" style={styles.button}>
        <Text style={styles.buttonText}>Hot & Cold</Text>
      </Link>
      <Link href="/versele" style={styles.button}>
        <Text style={styles.buttonText}>Versele</Text>
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
      {/* Database Fix Button - only in development mode */}
      {__DEV__ && (
        <View style={{ marginTop: 20, marginBottom: 10 }}>
          <Link href="/dbfix" asChild>
            <TouchableOpacity
              style={{
                backgroundColor: '#e74c3c',
                padding: 10,
                borderRadius: 5,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 5,
                borderWidth: 1,
                borderColor: '#c0392b',
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 5 }}>
                Fix Database Issues
              </Text>
            </TouchableOpacity>
          </Link>
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 5 }}>
            Use this if you encounter errors in Versele
          </Text>
        </View>
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