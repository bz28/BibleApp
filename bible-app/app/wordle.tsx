import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Animated } from "react-native";
import { initDatabase, getRandomVerse } from './database/database';
import { Verse } from './database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_GUESSES = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MIN_BOX_SIZE = 35;
const MAX_BOX_SIZE = 45;

type LetterState = 'correct' | 'present' | 'absent' | 'unused';

export default function Wordle() {
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(""));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [revealedBoxes, setRevealedBoxes] = useState<number>(-1);
  const [flipAnimations, setFlipAnimations] = useState<Animated.Value[][]>([]);

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

  useEffect(() => {
    if (currentVerse) {
      setFlipAnimations(
        Array(MAX_GUESSES).fill(null).map(() =>
          Array(currentVerse.answer.length).fill(null).map(() => new Animated.Value(0))
        )
      );
    }
  }, [currentVerse]);

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
                setRevealedBoxes(-1);
                setFlipAnimations([]);
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
                setRevealedBoxes(-1);
                setFlipAnimations([]);
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
      return "#5B8A51";  // Muted green, still clearly green
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
      return "#B59F3B";  // Muted gold/yellow
    }

    return "#A94442";  // Muted red
  };

  const renderGrid = () => {
    if (!currentVerse) return null;

    // Calculate box size based on verse length and screen width
    const maxBoxesPerRow = currentVerse.answer.length;
    const availableWidth = SCREEN_WIDTH - 40; // Account for padding
    const calculatedBoxSize = Math.min(
      Math.max(availableWidth / maxBoxesPerRow - 6, MIN_BOX_SIZE), // -6 for margins
      MAX_BOX_SIZE
    );

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
              <Animated.View
                key={colIndex}
                style={[
                  styles.letterBox,
                  {
                    width: calculatedBoxSize,
                    height: calculatedBoxSize,
                    backgroundColor,
                    transform: [{
                      rotateX: flipAnimations[rowIndex]?.[colIndex]?.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: ['0deg', '90deg', '180deg'],
                      }) || '0deg'
                    }]
                  }
                ]}
              >
                <Animated.Text
                  style={[
                    styles.letterText,
                    {
                      fontSize: calculatedBoxSize * 0.6, // Dynamic font size
                    },
                    backgroundColor !== "#fff" && { color: "#fff" },
                    {
                      transform: [{
                        rotateX: flipAnimations[rowIndex]?.[colIndex]?.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: ['0deg', '-90deg', '-180deg'],  // Counter-rotate the text
                        }) || '0deg'
                      }]
                    }
                  ]}
                >
                  {guess[colIndex] || ""}
                </Animated.Text>
              </Animated.View>
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

    const keyWidth = (SCREEN_WIDTH - 80) / 10;
    const keyHeight = keyWidth * 1.2;
    const letterStates = getKeyboardLetterStates();

    const getKeyBackground = (key: string) => {
      switch (letterStates[key]) {
        case 'correct':
          return "#5B8A51";  // Muted green
        case 'present':
          return "#B59F3B";  // Muted gold/yellow
        case 'absent':
          return "#A94442";  // Muted red
        default:
          return "#e8d5c4";  // Light parchment
      }
    };

    return keys.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.keyboardRow}>
        {row.split("").map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.key,
              {
                width: keyWidth,
                height: keyHeight,
                backgroundColor: getKeyBackground(key)
              }
            ]}
            onPress={() => handleKeyPress(key)}
          >
            <Text style={[
              styles.keyText,
              letterStates[key] !== 'unused' && { color: '#fff' }
            ]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
        {rowIndex === 2 && (
          <>
            <TouchableOpacity
              style={[
                styles.keyWide,
                {
                  width: keyWidth * 1.5,
                  height: keyHeight,
                  paddingHorizontal: 2,
                }
              ]}
              onPress={() => handleKeyPress("ENTER")}
            >
              <Text style={[styles.keyText, { fontSize: 11 }]}>ENTER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.keyWide,
                {
                  width: keyWidth * 1.5,
                  height: keyHeight
                }
              ]}
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
      // Use the existing animation value for this box
      Animated.timing(flipAnimations[rowIndex][i], {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      setRevealedBoxes(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setRevealedBoxes(-1);
  };

  const getKeyboardLetterStates = (): Record<string, LetterState> => {
    if (!currentVerse) return {};

    const states: Record<string, LetterState> = {};

    // Initialize all letters as unused
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
      states[letter] = 'unused';
    });

    // Go through all guessed rows
    for (let rowIndex = 0; rowIndex < currentRow; rowIndex++) {
      const guess = guesses[rowIndex];

      // For each letter in the guess
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i].toUpperCase();
        const currentState = states[letter];

        // If exact match, always set to correct
        if (letter === currentVerse.answer[i].toUpperCase()) {
          states[letter] = 'correct';
        }
        // If letter exists but not exact match and not already correct
        else if (currentVerse.answer.toUpperCase().includes(letter) && currentState !== 'correct') {
          states[letter] = 'present';
        }
        // If letter doesn't exist and hasn't been marked as correct or present
        else if (currentState === 'unused') {
          states[letter] = 'absent';
        }
      }
    }

    return states;
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
      <Text style={styles.mainTitle}>Bible Wordle</Text>
      <Text style={styles.verseHint}>{currentVerse.hint}</Text>
      <Text style={styles.subtitle}>{"Guess the Figure"}</Text>
      <View style={[styles.grid, { zIndex: 1 }]}>{renderGrid()}</View>
      <View style={[styles.keyboard, { zIndex: 2 }]}>{renderKeyboard()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5e6d3",
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: 'center',
    color: '#2c1810',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  verseHint: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: 'center',
    color: '#2c1810',
    padding: 10,
    backgroundColor: '#e8d5c4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8b4513',
    marginHorizontal: 20,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "500",
    marginBottom: 40,
    textAlign: 'center',
    color: '#5c2c1d',
    fontStyle: 'italic',
  },
  grid: {
    height: SCREEN_HEIGHT * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 'auto',
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  letterBox: {
    margin: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#8b4513",
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  letterText: {
    fontSize: 28,
    fontWeight: "800",
    color: '#1a1a1a',
  },
  keyboard: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 10,
  },
  keyboardRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    width: '100%',
  },
  key: {
    margin: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#8b4513',
    borderRadius: 4,
    backgroundColor: "#e8d5c4",
    minWidth: 30,
    paddingHorizontal: 8,
  },
  keyWide: {
    margin: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#8b4513',
    borderRadius: 4,
    backgroundColor: "#e8d5c4",
    paddingHorizontal: 4,
  },
  keyText: {
    fontSize: 14,
    fontWeight: "700",
    color: '#2c1810',
    textAlign: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "600",
    color: '#1a1a1a',
    fontStyle: 'italic',
  },
});










