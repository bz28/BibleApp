import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from "react-native";
import { initDatabase, getRandomVerse } from './database/database';
import { Verse } from './database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_GUESSES = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Wordle() {
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(""));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [revealedBoxes, setRevealedBoxes] = useState<number>(-1);

  useEffect(() => {
    const setupGame = async () => {
      try {
        await initDatabase();

        // Check if we can play today
        const canPlay = await checkIfCanPlay();
        if (!canPlay) {
          setGameCompleted(true);
          setIsLoading(false);
          Alert.alert(
            "Wait until tomorrow",
            "You can play again tomorrow",
            [
              {
                text: "OK",
                onPress: async () => {
                  // Load their last game state to show them
                  const savedState = await AsyncStorage.getItem('gameState');
                  if (savedState) {
                    const gameState = JSON.parse(savedState);
                    setGuesses(gameState.guesses);
                    setCurrentRow(gameState.currentRow);
                    setCurrentVerse(gameState.currentVerse);
                    setGameCompleted(true);
                    setIsLoading(false);
                  }
                }
              },
              {
                text: "Pay to play again (Ad)",
                onPress: async () => {
                  await AsyncStorage.removeItem('lastPlayed');
                  await loadNewVerse();
                  setGameCompleted(false);
                }
              }
            ]
          );
          return;
        }

        // If we can play, try to load saved state
        const hasLoadedState = await loadGameState();
        if (hasLoadedState) {
          return;
        }

        console.log('Debug - Loading new verse: No restrictions');
        await loadNewVerse();
      } catch (error) {
        console.error('Error setting up game:', error);
        Alert.alert('Error', 'Failed to load game data');
      }
    };

    setupGame();
  }, []);

  useEffect(() => {
    saveGameState();
  }, [guesses, currentRow, currentVerse, gameCompleted]);

  const checkIfCanPlay = async () => {
    const lastPlayed = await AsyncStorage.getItem('lastPlayed');
    console.log('Debug - Last Played:', lastPlayed ? new Date(parseInt(lastPlayed)).toString() : 'never played');

    if (lastPlayed) {
      const lastPlayedDate = new Date(parseInt(lastPlayed));
      const now = new Date();

      const isSameDay = lastPlayedDate.getDate() === now.getDate() &&
        lastPlayedDate.getMonth() === now.getMonth() &&
        lastPlayedDate.getFullYear() === now.getFullYear();

      console.log('Debug - Time Check:', {
        lastPlayedDate: lastPlayedDate.toString(),
        now: now.toString(),
        isSameDay,
        lastPlayedDay: lastPlayedDate.getDate(),
        currentDay: now.getDate()
      });

      if (isSameDay) {
        console.log('Debug - Still waiting for next day');
        return false;
      }
    }

    return true;
  };

  const loadNewVerse = async () => {
    try {
      setIsLoading(true);
      const verse = await getRandomVerse();
      setCurrentVerse(verse);
      setGuesses(Array(MAX_GUESSES).fill(""));
      setCurrentRow(0);
    } catch (error) {
      console.error('Error loading new verse:', error);
      Alert.alert('Error', 'Failed to load new verse');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = async (key: string) => {
    if (!currentVerse || gameCompleted) return;

    const currentGuess = guesses[currentRow];
    //if the key pressed is backspace, remove the last letter from the current guess
    if (key === "BACKSPACE") {
      setGuesses((prev) => {
        const updatedGuesses = [...prev];
        updatedGuesses[currentRow] = currentGuess.slice(0, -1);
        return updatedGuesses;
      });
    } else if (key === "ENTER") {
      if (currentGuess.length !== currentVerse.answer.length) {
        Alert.alert("Invalid Guess", "Must fill in every box.");
        return;
      }

      //check if the guess is correct
      if (currentGuess.toUpperCase() === currentVerse.answer.toUpperCase()) {
        await revealRow(currentRow);
        setCurrentRow(currentRow + 1);
        setGameCompleted(true);
        Alert.alert(
          "Congratulations!",
          "You guessed the Figure! Come back at midnight EST for a new verse.",
          [
            {
              text: "OK",
              onPress: () => {
                AsyncStorage.setItem('lastPlayed', new Date().getTime().toString());
              }
            },
            {
              text: "Pay to play again (Ad)",
              onPress: async () => {
                await AsyncStorage.removeItem('gameState');
                await AsyncStorage.removeItem('lastPlayed');
                await loadNewVerse();
                setGameCompleted(false);
              }
            }
          ]
        );
        return;
      }

      //if the guess is incorrect and the user has used all their guesses
      if (currentRow === MAX_GUESSES - 1) {
        await revealRow(currentRow);
        setCurrentRow(currentRow + 1);
        setGameCompleted(true);
        Alert.alert(
          "Game Over",
          `The correct answer was: ${currentVerse.answer}\nCome back at midnight EST for a new verse.`,
          [
            { text: "OK" },
            {
              text: "Pay to play again (Ad)",
              onPress: async () => {
                await AsyncStorage.removeItem('gameState');
                await AsyncStorage.removeItem('lastPlayed');
                await loadNewVerse();
                setGameCompleted(false);
              }
            }
          ]
        );
        return;
      }

      await revealRow(currentRow);
      setCurrentRow(currentRow + 1);
    } else if (currentGuess.length < currentVerse.answer.length) {
      setGuesses((prev) => {
        const updatedGuesses = [...prev];
        updatedGuesses[currentRow] = currentGuess + key;
        return updatedGuesses;
      });
    }
  };

  const getLetterColor = (guess: string, index: number, answer: string): string => {
    if (!guess[index]) return "#fff";

    const guessLetter = guess[index].toUpperCase();
    const answerLetter = answer[index].toUpperCase();

    // If exact match, it's green
    if (guessLetter === answerLetter) {
      return "#6aaa64";
    }

    // Create frequency map of letters in answer ONCE
    const letterFreq: { [key: string]: number } = {};
    const usedYellow: { [key: number]: boolean } = {};  // Track which positions got yellow

    // Build initial frequencies
    for (let letter of answer.toUpperCase()) {
      letterFreq[letter] = (letterFreq[letter] || 0) + 1;
    }

    // First pass: decrease frequencies for exact matches
    for (let i = 0; i < guess.length; i++) {
      const currentGuessLetter = guess[i].toUpperCase();
      const currentAnswerLetter = answer[i].toUpperCase();
      if (currentGuessLetter === currentAnswerLetter) {
        letterFreq[currentGuessLetter]--;
      }
    }

    // Second pass: handle yellows in order
    for (let i = 0; i < guess.length; i++) {
      const currentGuessLetter = guess[i].toUpperCase();
      const currentAnswerLetter = answer[i].toUpperCase();

      if (currentGuessLetter !== currentAnswerLetter &&
        letterFreq[currentGuessLetter] &&
        letterFreq[currentGuessLetter] > 0) {
        letterFreq[currentGuessLetter]--;
        usedYellow[i] = true;
      }
    }

    // Now check if this specific position got a yellow
    if (usedYellow[index]) {
      return "#c9b458";
    }

    return "red";
  };

  const renderGrid = () => {
    if (!currentVerse) return null;

    return guesses.map((guess, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {Array(currentVerse.answer.length)
          .fill("")
          .map((_, colIndex) => {
            const backgroundColor = rowIndex === currentRow  // Changed from currentRow - 1
              ? colIndex <= revealedBoxes  // Currently revealing row
                ? getLetterColor(guess, colIndex, currentVerse.answer)
                : "#fff"
              : rowIndex < currentRow  // Previously completed rows
                ? getLetterColor(guess, colIndex, currentVerse.answer)
                : "#fff";  // Future rows

            return (
              <View
                key={colIndex}
                style={[
                  styles.letterBox,
                  { backgroundColor }
                ]}
              >
                <Text style={[
                  styles.letterText,
                  backgroundColor !== "#fff" && { color: "#fff" }
                ]}>
                  {guess[colIndex] || ""}
                </Text>
              </View>
            );
          })}
      </View>
    ));
  };

  const renderKeyboard = () => {
    const keys = [
      "QWERTYUIOP",
      "ASDFGHJKL",
      "ZXCVBNM",
    ];

    const keyWidth = (SCREEN_WIDTH - 40) / 10;
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

  const saveGameState = async () => {
    if (!currentVerse) return;

    const gameState = {
      guesses,
      currentRow,
      currentVerse,
      gameCompleted,
    };

    try {
      await AsyncStorage.setItem('gameState', JSON.stringify(gameState));
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  };

  const loadGameState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('gameState');
      if (savedState) {
        const gameState = JSON.parse(savedState);

        // Only consider it a "loaded state" if the game wasn't completed
        if (!gameState.gameCompleted) {
          setGuesses(gameState.guesses);
          setCurrentRow(gameState.currentRow);
          setCurrentVerse(gameState.currentVerse);
          setGameCompleted(false);
          setIsLoading(false);
          return true;  // Yes, we loaded an active game
        }
        else {

          return false;
        }
      }
      return false;  // No saved state
    } catch (error) {
      console.error('Error loading game state:', error);
      return false;
    }
  };

  const revealRow = async (rowIndex: number) => {
    if (!currentVerse) return;

    for (let i = 0; i < currentVerse.answer.length; i++) {
      setRevealedBoxes(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setRevealedBoxes(-1);
  };

  if (isLoading || !currentVerse) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bible Wordle</Text>
      <Text style={styles.title}>{currentVerse.hint}</Text>
      <Text style={styles.title}>{"Guess the Character"}</Text>
      <View style={styles.grid}>{renderGrid()}</View>
      <View style={styles.keyboard}>{renderKeyboard()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f3f3f3",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  letterBox: {
    width: 40,
    height: 40,
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});










