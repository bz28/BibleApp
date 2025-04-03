import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Animated, Modal, FlatList, ScrollView } from "react-native";
import { initDatabase, getRandomVerseReference } from './database/database';
import { VerseReference } from './database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bible books in order
const BIBLE_BOOKS = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
    '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
    'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
    'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
    'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
    'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

const MAX_GUESSES = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;



export default function Versele() {
    const [guesses, setGuesses] = useState<{ book: string, chapterVerse: string }[]>(
        Array(MAX_GUESSES).fill({ book: "", chapterVerse: "" })
    );
    const [currentRow, setCurrentRow] = useState(0);
    const [currentVerse, setCurrentVerse] = useState<VerseReference | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [revealedBoxes, setRevealedBoxes] = useState<number>(-1);
    const [flipAnimations, setFlipAnimations] = useState<Animated.Value[][]>([]);
    const [selectedBook, setSelectedBook] = useState("");
    const [chapterVerseInput, setChapterVerseInput] = useState("");
    const [showBookModal, setShowBookModal] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [selectedBoxType, setSelectedBoxType] = useState<'book' | 'chapter' | 'verse' | null>(null);

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
                                    const savedState = await AsyncStorage.getItem('verseleState');
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
                                text: "Play Again (Ad)",
                                onPress: async () => {
                                    await AsyncStorage.removeItem('lastVerselePlayed');
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
                    Array(5).fill(null).map(() => new Animated.Value(0))
                )
            );
        }
    }, [currentVerse]);

    const checkIfCanPlay = async () => {
        const lastPlayed = await AsyncStorage.getItem('lastVerselePlayed');
        console.log('Debug - Last Played:', lastPlayed ? new Date(parseInt(lastPlayed)).toString() : 'never played');

        if (lastPlayed) {
            const lastPlayedDate = new Date(parseInt(lastPlayed));
            const now = new Date();

            const isSameDay = lastPlayedDate.getDate() === now.getDate() &&
                lastPlayedDate.getMonth() === now.getMonth() &&
                lastPlayedDate.getFullYear() === now.getFullYear();

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
            console.log("======= STARTING TO LOAD NEW VERSE =======");

            const verse = await getRandomVerseReference();

            // Add detailed debug logging
            console.log("============ DEBUG VERSE INFO ============");
            console.log("Verse loaded from database:", JSON.stringify(verse, null, 2));
            console.log("Verse book:", verse.book);
            console.log("Verse chapter:", verse.chapter);
            console.log("Verse verse:", verse.verse);
            console.log("Verse text:", verse.text);
            console.log("Verse object type:", Object.prototype.toString.call(verse));
            console.log("Verse keys:", Object.keys(verse));
            console.log("=========================================");

            // Set the current verse only
            setCurrentVerse(verse);

            console.log("Current verse set to:", JSON.stringify(verse, null, 2));
            console.log("======= FINISHED LOADING NEW VERSE =======");

            setGuesses(Array(MAX_GUESSES).fill({ book: "", chapterVerse: "" }));
            setCurrentRow(0);
            setSelectedBook("");
            setChapterVerseInput("");
        } catch (error) {
            console.error('Error loading new verse:', error);
            Alert.alert('Error', 'Failed to load new verse');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (key: string) => {
        if (!currentVerse || gameCompleted || !selectedBoxType) return;

        if (key === "BACKSPACE") {
            setChapterVerseInput(prev => prev.slice(0, -1));
        } else if (key === "ENTER") {
            completeNumberInput();
        } else if (selectedBoxType === 'chapter') {
            // Only allow 2 digits for chapter
            if (chapterVerseInput.length < 2) {
                setChapterVerseInput(prev => prev + key);
            }
        } else if (selectedBoxType === 'verse') {
            // If we're entering verse directly, make sure we have the colon
            if (!chapterVerseInput.includes(":")) {
                const guess = guesses[selectedRowIndex];
                const chapterPart = guess.chapterVerse ? guess.chapterVerse.split(":")[0] : "";

                if (chapterPart) {
                    setChapterVerseInput(chapterPart + ":" + key);
                }
            } else {
                const [, verse] = chapterVerseInput.split(":");
                // Only allow 2 digits for verse
                if (!verse || verse.length < 2) {
                    setChapterVerseInput(prev => prev + key);
                }
            }
        }
    };

    const selectBook = (book: string) => {
        const newGuesses = [...guesses];
        newGuesses[selectedRowIndex] = {
            ...newGuesses[selectedRowIndex],
            book: book
        };
        setGuesses(newGuesses);
        setSelectedBook(book);
        setShowBookModal(false);
    };

    const getGuessColor = (rowIndex: number, type: 'book' | 'chapter' | 'colon' | 'verse', digitIndex = 0): string => {
        if (!currentVerse) return "#fff";
        if (rowIndex > currentRow) return "#fff";
        if (rowIndex === currentRow && revealedBoxes < 0) return "#fff";

        // Extract guess data
        const guess = guesses[rowIndex];
        if (!guess.book || !guess.chapterVerse) return "#fff";

        // If the row is in the process of being revealed
        if (rowIndex === currentRow) {
            // Map box types to indices
            const boxIndices = {
                'book': 0,
                'chapter': [1, 2],
                'colon': 3,
                'verse': [4, 5]
            };

            let boxIndex;
            if (type === 'chapter') boxIndex = boxIndices.chapter[digitIndex];
            else if (type === 'verse') boxIndex = boxIndices.verse[digitIndex];
            else if (type === 'book') boxIndex = 0;
            else boxIndex = 3; // colon

            if (boxIndex > revealedBoxes) return "#fff";
        }

        // Extract chapter and verse from the guess
        const [chapterStr, verseStr] = guess.chapterVerse.split(":");

        // Ensure we have strings for comparison
        const targetChapter = String(currentVerse.chapter);
        const targetVerse = String(currentVerse.verse);

        // Book color
        if (type === 'book') {
            if (guess.book === currentVerse.book) {
                return "#5B8A51"; // Green - correct
            } else {
                // Check if the book is close to the target book
                const guessIndex = BIBLE_BOOKS.indexOf(guess.book);
                const targetIndex = BIBLE_BOOKS.indexOf(currentVerse.book);

                if (Math.abs(guessIndex - targetIndex) <= 5) {
                    return "#B59F3B"; // Yellow - close
                }
                return "#A94442"; // Red - wrong
            }
        }

        // Chapter color - Wordle style
        if (type === 'chapter') {
            // Get the specific digit
            const digit = chapterStr[digitIndex] || '';
            const targetDigit = targetChapter[digitIndex] || '';

            // Exact match at the specific position
            if (digit === targetDigit && digit !== '') {
                return "#5B8A51"; // Green - correct
            }
            // Digit exists in the target but in a different position
            else if (targetChapter.includes(digit) && digit !== '') {
                return "#B59F3B"; // Yellow - wrong position
            }
            return "#A94442"; // Red - wrong
        }

        // Verse color - Wordle style
        if (type === 'verse') {
            // Get the specific digit
            const digit = verseStr[digitIndex] || '';
            const targetDigit = targetVerse[digitIndex] || '';

            // Exact match at the specific position
            if (digit === targetDigit && digit !== '') {
                return "#5B8A51"; // Green - correct
            }
            // Digit exists in the target but in a different position
            else if (targetVerse.includes(digit) && digit !== '') {
                return "#B59F3B"; // Yellow - wrong position
            }
            return "#A94442"; // Red - wrong
        }

        return "#fff";
    };

    const renderGrid = () => {
        return guesses.map((guess, rowIndex) => {
            // Split chapter:verse for display
            let chapterText = "";
            let verseText = "";
            let hasColon = false;

            if (guess.chapterVerse) {
                const parts = guess.chapterVerse.split(":");
                chapterText = parts[0] || "";
                verseText = parts[1] || "";
                hasColon = guess.chapterVerse.includes(":");
            }

            // Pad chapter and verse with empty space to ensure 2 digits
            const chapterDigits = chapterText.padEnd(2, ' ').split('');
            const verseDigits = verseText.padEnd(2, ' ').split('');

            // Only allow interaction with the current row
            const isCurrentRow = rowIndex === currentRow;

            return (
                <View key={rowIndex} style={styles.row}>
                    {/* Book box - clickable */}
                    <TouchableOpacity
                        disabled={!isCurrentRow || gameCompleted}
                        onPress={() => {
                            setSelectedRowIndex(rowIndex);
                            setSelectedBoxType('book');
                            setShowBookModal(true);
                        }}
                        style={[
                            styles.bookBox,
                            { backgroundColor: getGuessColor(rowIndex, 'book') }
                        ]}
                    >
                        <Text style={[
                            styles.guessText,
                            getGuessColor(rowIndex, 'book') !== "#fff" && { color: "#fff" }
                        ]}>
                            {guess.book || ""}
                        </Text>
                    </TouchableOpacity>

                    {/* Chapter boxes (2 digits) - clickable */}
                    <TouchableOpacity
                        disabled={!isCurrentRow || gameCompleted || !guess.book}
                        onPress={() => {
                            setSelectedRowIndex(rowIndex);
                            setSelectedBoxType('chapter');
                            // Clear existing chapter:verse input and start fresh
                            setChapterVerseInput("");
                        }}
                        style={styles.doubleDigitContainer}
                    >
                        {chapterDigits.map((digit, index) => (
                            <View
                                key={`chapter-${index}`}
                                style={[
                                    styles.digitBox,
                                    { backgroundColor: getGuessColor(rowIndex, 'chapter', index) }
                                ]}
                            >
                                <Text style={[
                                    styles.digitText,
                                    getGuessColor(rowIndex, 'chapter', index) !== "#fff" && { color: "#fff" }
                                ]}>
                                    {digit}
                                </Text>
                            </View>
                        ))}
                    </TouchableOpacity>

                    {/* Fixed colon */}
                    <Text style={styles.fixedColon}>:</Text>

                    {/* Verse boxes (2 digits) - clickable */}
                    <TouchableOpacity
                        disabled={!isCurrentRow || gameCompleted || !guess.book || !chapterText}
                        onPress={() => {
                            setSelectedRowIndex(rowIndex);
                            setSelectedBoxType('verse');
                            // If there's already chapter input, preserve it
                            if (chapterText) {
                                setChapterVerseInput(chapterText + ":");
                            } else {
                                setChapterVerseInput("");
                            }
                        }}
                        style={styles.doubleDigitContainer}
                    >
                        {verseDigits.map((digit, index) => (
                            <View
                                key={`verse-${index}`}
                                style={[
                                    styles.digitBox,
                                    { backgroundColor: getGuessColor(rowIndex, 'verse', index) }
                                ]}
                            >
                                <Text style={[
                                    styles.digitText,
                                    getGuessColor(rowIndex, 'verse', index) !== "#fff" && { color: "#fff" }
                                ]}>
                                    {digit}
                                </Text>
                            </View>
                        ))}
                    </TouchableOpacity>
                </View>
            );
        });
    };

    const revealRow = async (rowIndex: number) => {
        // Animate the reveal of the current guess boxes one by one
        for (let i = 0; i < 5; i++) {
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

    const saveGameState = async () => {
        if (!currentVerse) return;

        const gameState = {
            guesses,
            currentRow,
            currentVerse,
            gameCompleted,
        };

        try {
            await AsyncStorage.setItem('verseleState', JSON.stringify(gameState));
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    };

    const loadGameState = async () => {
        try {
            const savedState = await AsyncStorage.getItem('verseleState');
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
            }
            return false;  // No saved state
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    };

    const completeNumberInput = () => {
        if (!chapterVerseInput || !selectedBoxType) return;

        if (selectedBoxType === 'chapter') {
            // Validate chapter input
            if (chapterVerseInput.length === 0) return;

            // Update the guess with just the chapter part
            const newGuesses = [...guesses];
            const currentChapterVerse = newGuesses[selectedRowIndex].chapterVerse || "";
            const versePart = currentChapterVerse.includes(":") ? currentChapterVerse.split(":")[1] : "";

            newGuesses[selectedRowIndex] = {
                ...newGuesses[selectedRowIndex],
                chapterVerse: chapterVerseInput + (versePart ? ":" + versePart : "")
            };

            setGuesses(newGuesses);
            setSelectedBoxType(null);
            setChapterVerseInput("");
        }
        else if (selectedBoxType === 'verse') {
            // We should already have the chapter part in the input or current guess
            const newGuesses = [...guesses];
            const currentValue = newGuesses[selectedRowIndex].chapterVerse || "";
            let chapterPart = "";

            if (currentValue.includes(":")) {
                chapterPart = currentValue.split(":")[0];
            } else if (chapterVerseInput.includes(":")) {
                chapterPart = chapterVerseInput.split(":")[0];
            }

            if (!chapterPart) return;

            // Update with verse part
            const versePart = chapterVerseInput.includes(":") ?
                chapterVerseInput.split(":")[1] : chapterVerseInput;

            newGuesses[selectedRowIndex] = {
                ...newGuesses[selectedRowIndex],
                chapterVerse: chapterPart + ":" + versePart
            };

            setGuesses(newGuesses);
            setSelectedBoxType(null);
            setChapterVerseInput("");

            // If we have all parts filled, check if the guess is complete
            if (newGuesses[selectedRowIndex].book &&
                newGuesses[selectedRowIndex].chapterVerse &&
                newGuesses[selectedRowIndex].chapterVerse.includes(":")) {
                checkGuess(newGuesses[selectedRowIndex]);
            }
        }
    };

    const checkGuess = (guess: { book: string, chapterVerse: string }) => {
        if (!currentVerse || !guess.book || !guess.chapterVerse || !guess.chapterVerse.includes(":")) return;

        const [chapterStr, verseStr] = guess.chapterVerse.split(":");
        if (!chapterStr || !verseStr) return;

        // Convert to strings for comparison
        const targetChapter = String(currentVerse.chapter);
        const targetVerse = String(currentVerse.verse);

        const isCorrect = guess.book === currentVerse.book &&
            chapterStr === targetChapter &&
            verseStr === targetVerse;

        if (isCorrect) {
            revealRow(currentRow);
            setGameCompleted(true);
            setTimeout(() => {
                Alert.alert(
                    "Congratulations!",
                    "You guessed the verse reference correctly!",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                AsyncStorage.setItem('lastVerselePlayed', new Date().getTime().toString());
                            }
                        }
                    ]
                );
            }, 1500);
            return;
        }

        // Check if this was the last guess
        if (currentRow === MAX_GUESSES - 1) {
            revealRow(currentRow);
            setGameCompleted(true);
            setTimeout(() => {
                Alert.alert(
                    "Game Over",
                    `The correct reference was: ${currentVerse.book} ${currentVerse.chapter}:${currentVerse.verse}`,
                    [{ text: "OK" }]
                );
            }, 1500);
            return;
        }

        // Move to next row
        revealRow(currentRow);
        setCurrentRow(currentRow + 1);
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
            <Text style={styles.mainTitle}>Versele</Text>

            {/* Verse display */}
            <View style={styles.verseBox}>
                <Text style={styles.verseText}>
                    {currentVerse.text || "Loading verse..."}
                </Text>

                {/* Debug info - only visible in development */}
                {__DEV__ && (
                    <View style={styles.debugInfo}>
                        <Text style={styles.debugInfoText}>
                            Target: {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
                        </Text>
                    </View>
                )}
            </View>

            <Text style={styles.subtitle}>Guess the Bible Reference</Text>

            <View style={styles.grid}>{renderGrid()}</View>

            {/* Current number input display */}
            {selectedBoxType === 'chapter' || selectedBoxType === 'verse' ? (
                <View style={styles.currentInputContainer}>
                    <Text style={styles.currentInputText}>
                        {chapterVerseInput}
                    </Text>
                </View>
            ) : null}

            {/* Number keyboard - only show when entering chapter or verse */}
            {(selectedBoxType === 'chapter' || selectedBoxType === 'verse') && (
                <View style={styles.keyboard}>
                    {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["0", "BACKSPACE", "ENTER"]].map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.keyboardRow}>
                            {row.map((key) => {
                                if (key === "ENTER") {
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[styles.keyEnter, { width: 90 }]}
                                            onPress={() => handleKeyPress(key)}
                                        >
                                            <Text style={styles.keyText}>{key}</Text>
                                        </TouchableOpacity>
                                    );
                                } else if (key === "BACKSPACE") {
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={styles.key}
                                            onPress={() => handleKeyPress(key)}
                                        >
                                            <Text style={styles.keyText}>⌫</Text>
                                        </TouchableOpacity>
                                    );
                                } else {
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={styles.key}
                                            onPress={() => handleKeyPress(key)}
                                        >
                                            <Text style={styles.keyText}>{key}</Text>
                                        </TouchableOpacity>
                                    );
                                }
                            })}
                        </View>
                    ))}
                </View>
            )}

            {/* Book Selection Modal */}
            <Modal
                visible={showBookModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Book</Text>
                        <FlatList
                            data={BIBLE_BOOKS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => selectBook(item)}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            style={styles.modalList}
                            showsVerticalScrollIndicator={true}
                            initialNumToRender={10}
                        />
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowBookModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        padding: 15,
        backgroundColor: "#f5e6d3",
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: "900",
        marginBottom: 10,
        textAlign: 'center',
        color: '#2c1810',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    verseBox: {
        padding: 10,
        backgroundColor: '#e8d5c4',
        borderRadius: 8,
        marginBottom: 10,
        width: '100%',
        borderWidth: 2,
        borderColor: '#8b4513',
    },
    verseText: {
        color: '#2c1810',
        fontSize: 14,
        fontWeight: "700",
        textAlign: 'center',
        lineHeight: 18,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: "500",
        marginBottom: 10,
        textAlign: 'center',
        color: '#5c2c1d',
        fontStyle: 'italic',
    },
    grid: {
        marginBottom: 10,
    },
    row: {
        flexDirection: "row",
        marginBottom: 5,
        justifyContent: "center",
    },
    bookBox: {
        width: SCREEN_WIDTH * 0.30,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#8b4513",
        backgroundColor: "#fff",
        borderRadius: 4,
        marginRight: 5,
    },
    digitBox: {
        width: 30,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#8b4513",
        backgroundColor: "#fff",
        borderRadius: 4,
        marginHorizontal: 2,
    },
    guessText: {
        fontSize: 14,
        fontWeight: "700",
        color: '#1a1a1a',
    },
    inputContainer: {
        flexDirection: "row",
        marginBottom: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    bookSelector: {
        width: SCREEN_WIDTH * 0.30,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#8b4513",
        backgroundColor: "#d4b08c",
        borderRadius: 4,
        marginRight: 5,
    },
    selectorText: {
        fontSize: 12,
        fontWeight: "700",
        color: '#2c1810',
    },
    digitInput: {
        width: 30,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#8b4513",
        backgroundColor: "#fff",
        borderRadius: 4,
        marginHorizontal: 2,
    },
    inputText: {
        fontSize: 16,
        fontWeight: "700",
        color: '#1a1a1a',
    },
    keyboard: {
        width: '100%',
        alignItems: 'center',
    },
    keyboardRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 5,
    },
    key: {
        width: 45,
        height: 40,
        margin: 2,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: '#8b4513',
        borderRadius: 4,
        backgroundColor: "#e8d5c4",
    },
    keyEnter: {
        width: 90,
        height: 40,
        margin: 2,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: '#8b4513',
        borderRadius: 4,
        backgroundColor: "#d4b08c",
    },
    keyText: {
        fontSize: 14,
        fontWeight: "700",
        color: '#2c1810',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: "600",
        color: '#1a1a1a',
        fontStyle: 'italic',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        maxHeight: '80%',
        backgroundColor: '#f5e6d3',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 15,
        textAlign: 'center',
        color: '#2c1810',
    },
    modalItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#d4b08c',
    },
    modalItemText: {
        fontSize: 16,
        color: '#2c1810',
    },
    modalCloseButton: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#8b4513',
        borderRadius: 5,
        alignItems: 'center',
    },
    modalCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: "600",
    },
    modalList: {
        maxHeight: 300,
        width: '100%',
        marginBottom: 10,
    },
    fixedColon: {
        fontSize: 18,
        fontWeight: "700",
        color: '#1a1a1a',
        marginHorizontal: 2,
    },
    digitText: {
        fontSize: 16,
        fontWeight: "700",
        color: '#1a1a1a',
    },
    referenceText: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: 'center',
        color: '#2c1810',
        marginTop: 8,
    },
    debugBox: {
        padding: 8,
        backgroundColor: '#000',
        borderRadius: 4,
        marginBottom: 10,
        width: '100%',
    },
    debugInfo: {
        marginTop: 8,
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 4,
    },
    debugText: {
        color: '#0f0',
        fontSize: 10,
        fontFamily: 'monospace',
    },
    debugInfoText: {
        color: '#00ff00',
        fontSize: 12,
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    doubleDigitContainer: {
        flexDirection: 'row',
        marginHorizontal: 2,
    },
    currentInputContainer: {
        marginBottom: 10,
        padding: 8,
        borderWidth: 1,
        borderRadius: 5,
        borderColor: '#8b4513',
        backgroundColor: '#faf1e6',
        minWidth: 80,
        alignItems: 'center',
    },
    currentInputText: {
        fontSize: 18,
        fontWeight: "700",
        color: '#2c1810',
    },
}); 