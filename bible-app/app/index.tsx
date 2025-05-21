import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "react-native";
import { useEffect } from 'react';
import { initDatabase } from './database/database';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const router = useRouter();

  const clearStorage = async () => {
    try {
      await AsyncStorage.clear(); // Clear AsyncStorage
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
      <View style={styles.mainContent}>
        <Text style={styles.title}>BIBLE WORD GAMES</Text>

        <Link href="/versele" style={styles.gameButton}>
          <Text style={styles.gameButtonText}>SCRIPTURLE</Text>
        </Link>

        <Link href="/verseguess" style={styles.gameButton}>
          <Text style={styles.gameButtonText}>SPEED VERSE</Text>
        </Link>

        <Link href="/hotcoldverseguess" style={styles.gameButton}>
          <Text style={styles.gameButtonText}>PIN THE PASSAGE</Text>
        </Link>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => router.push('stats' as any)}
        >
          <Ionicons name="stats-chart" size={24} color="white" />
          <Text style={styles.footerButtonText}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => router.push('settings' as any)}
        >
          <Ionicons name="person" size={24} color="white" />
          <Text style={styles.footerButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Only show in development */}
      {__DEV__ && (
        <TouchableOpacity onPress={clearStorage} style={styles.debugButton}>
          <Text style={styles.debugButtonText}>Clear Storage (Debug)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 60,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  gameButton: {
    width: '100%',
    marginBottom: 40,
  },
  gameButtonText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  footerButton: {
    alignItems: 'center',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 5,
  },
  debugButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
  debugButtonText: {
    color: '#a94442',
    textDecorationLine: 'underline',
    fontSize: 14,
  }
});