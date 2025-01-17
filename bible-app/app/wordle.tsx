import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from "react-native";


const MAX_GUESSES = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;

const verses = [
  {
    hint: "I am the way, and the truth, and the life. No one comes to the Father except through me.",
    answer: "Jesus"
  },
  {
    hint: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    answer: "John"
  },
  {
    hint: "Eye for eye, tooth for tooth, hand for hand, foot for foot, burn for burn, wound for wound, bruise for bruise",
    answer: "Moses"
  },
  {
    hint: "I am the good shepherd. The good shepherd lays down his life for the sheep.",
    answer: "Jesus"
  },
  {
    hint: "I heard thy voice in the garden, and I was afraid, because I was naked; and I hid myself",
    answer: "Adam"
  },
  {
    hint: "Behold the Lamb of God who takes away the sin of the world",
    answer: "John"
  }
  ,
  {
    hint: "From then on ___ watched for an opportunity to hand him over.",
    answer: "Judas"
  }
  ,
  {
    hint: "I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing",
    answer: "John"
  }


  ,
  {
    hint: "I can do all things through Christ who strengthens me",
    answer: "Paul"
  }

  ,
  {
    hint: "Are You the King of the Jews?",
    answer: "Pilate"
  }
];




export default function Wordle() {
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(""));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentVerse, setCurrentVerse] = useState(verses[Math.floor(Math.random() * verses.length)]);

  const handleKeyPress = (key: string) => {
    const currentGuess = guesses[currentRow];
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

      if (currentGuess.toUpperCase() === currentVerse.answer.toUpperCase()) {
        setCurrentRow(currentRow + 1);
        Alert.alert(
          "Congratulations!",
          "You guessed the Character!",
          [
            {
              text: "Play Again",
              onPress: () => {
                setCurrentVerse(verses[Math.floor(Math.random() * verses.length)]);
                setGuesses(Array(MAX_GUESSES).fill(""));
                setCurrentRow(0);
              },
            },
          ]
        );
        return;
      }

      if (currentRow === MAX_GUESSES - 1) {
        setCurrentRow(currentRow + 1);
        Alert.alert("Game Over", `The correct answer was: ${currentVerse.answer}`,
          [
            {
              text: "Play Again",
              onPress: () => {
                setCurrentVerse(verses[Math.floor(Math.random() * verses.length)]);
                setGuesses(Array(MAX_GUESSES).fill(""));
                setCurrentRow(0);
              },
            },
          ]



        );
        return;
      }

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
    if (!guess[index]) return "#fff"; // White background for empty cells

    const guessLetter = guess[index].toUpperCase();
    const answerLetter = answer[index].toUpperCase();

    if (guessLetter === answerLetter) {
      return "#6aaa64"; // Green for correct letter and position
    }

    if (answer.toUpperCase().includes(guessLetter)) {
      return "#c9b458"; // Yellow for correct letter, wrong position
    }

    return "red"; // Gray for incorrect letter
  };

  const renderGrid = () => {
    return guesses.map((guess, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {Array(currentVerse.answer.length)
          .fill("")
          .map((_, colIndex) => {
            const backgroundColor = rowIndex < currentRow
              ? getLetterColor(guess, colIndex, currentVerse.answer)
              : "#fff";

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
});










