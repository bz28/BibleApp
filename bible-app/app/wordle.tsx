import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from "react-native";

const TARGET_WORD = "REACT";
const MAX_GUESSES = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Wordle() {
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(""));
  const [currentRow, setCurrentRow] = useState(0);

  const handleKeyPress = (key: string) => {
    const currentGuess = guesses[currentRow];
    if (key === "BACKSPACE") {
      setGuesses((prev) => {
        const updatedGuesses = [...prev];
        updatedGuesses[currentRow] = currentGuess.slice(0, -1);
        return updatedGuesses;
      });
    } else if (key === "ENTER") {
      if (currentGuess.length !== 5) {
        Alert.alert("Invalid Guess", "Must fill in every box.");
        return;
      }

      if (currentGuess === TARGET_WORD) {
        Alert.alert("Congratulations!", "You guessed the word!");
        return;
      }

      if (currentRow === MAX_GUESSES - 1) {
        Alert.alert("Game Over", `The correct verse is: ${TARGET_WORD}`);
        return;
      }

      setCurrentRow(currentRow + 1);
    } else if (currentGuess.length < 5) {
      setGuesses((prev) => {
        const updatedGuesses = [...prev];
        updatedGuesses[currentRow] = currentGuess + key;
        return updatedGuesses;
      });
    }
  };

  const renderGrid = () => {
    return guesses.map((guess, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {Array(5)
          .fill("")
          .map((_, colIndex) => (
            <View key={colIndex} style={styles.letterBox}>
              <Text style={styles.letterText}>
                {guess[colIndex] || ""}
              </Text>
            </View>
          ))}
      </View>
    ));
  };

  const renderKeyboard = () => {
    const keys = [
      "QWERTYUIOP",
      "ASDFGHJKL",
      "ZXCVBNM",
    ];

    // Calculate dynamic key sizes
    const keyWidth = (SCREEN_WIDTH - 40) / 10; // Adjust based on screen width and spacing
    const keyHeight = keyWidth * 1.2;

    return keys.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.keyboardRow}>
        {row.split("").map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.key, { width: keyWidth, height: keyHeight }]}
            onPress={() => handleKeyPress(key)}
          >
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
        {rowIndex === 2 && (
          <>
            <TouchableOpacity
              style={[styles.keyWide, { width: keyWidth * 1.5, height: keyHeight }]}
              onPress={() => handleKeyPress("ENTER")}
            >
              <Text style={styles.keyText}>ENTER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyWide, { width: keyWidth * 1.5, height: keyHeight }]}
              onPress={() => handleKeyPress("BACKSPACE")}
            >
              <Text style={styles.keyText}>⌫</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wordle</Text>
      <View style={styles.grid}>{renderGrid()}</View>
      <View style={styles.keyboard}>{renderKeyboard()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f3f3f3",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  grid: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  letterBox: {
    width: 50,
    height: 50,
    margin: 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  letterText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  keyboard: {
    marginTop: 20,
  },
  keyboardRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  key: {
    margin: 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  keyWide: {
    margin: 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  keyText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});










