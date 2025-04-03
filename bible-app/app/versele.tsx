import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Animated, Modal, FlatList, ScrollView } from "react-native";
import { initDatabase, getRandomSpeaker } from './database/database';
import { Speaker } from './database/schema';
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

type LetterState = 'correct' | 'present' | 'absent' | 'unused';

export default function Versele() {
    const [guesses, setGuesses] = useState<{ book: string, chapterVerse: string }[]>(
        Array(MAX_GUESSES).fill({ book: "", chapterVerse: "" })
    );
    const [currentRow, setCurrentRow] = useState(0);
    const [currentVerse, setCurrentVerse] = useState<Speaker | null>(null);
    const [targetReference, setTargetReference] = useState({ book: "", chapter: 0, verse: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [revealedBoxes, setRevealedBoxes] = useState<number>(-1);
    const [flipAnimations, setFlipAnimations] = useState<Animated.Value[][]>([]);
    const [selectedBook, setSelectedBook] = useState("");
    const [chapterVerseInput, setChapterVerseInput] = useState("");
    const [showBookModal, setShowBookModal] = useState(false);

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
                                        setTargetReference(gameState.targetReference);
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
    }, [guesses, currentRow, currentVerse, gameCompleted, targetReference]);

    useEffect(() => {
        if (targetReference.book) {
            setFlipAnimations(
                Array(MAX_GUESSES).fill(null).map(() =>
                    Array(5).fill(null).map(() => new Animated.Value(0))
                )
            );
        }
    }, [targetReference]);

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
            const verse = await getRandomSpeaker();

            // Add sample Bible verses to use instead of hints
            const sampleVerses = [
                "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
                "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
                "I can do all this through him who gives me strength.",
                "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
                "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."
            ];

            // Use the random verse text instead of the hint
            const randomVerseText = sampleVerses[Math.floor(Math.random() * sampleVerses.length)];

            // Create a modified verse object with actual Bible verse text
            const modifiedVerse = {
                ...verse,
                hint: randomVerseText // Replace hint with actual verse text
            };

            console.log("DEBUG - Original Verse Hint:", verse.hint);
            console.log("DEBUG - Modified Verse Hint:", modifiedVerse.hint);

            setCurrentVerse(modifiedVerse);

            // Rest of your function remains the same
            const randomBookIndex = Math.floor(Math.random() * BIBLE_BOOKS.length);
            const randomBook = BIBLE_BOOKS[randomBookIndex];
            const randomChapter = Math.floor(Math.random() * 28) + 1;
            const randomVerse = Math.floor(Math.random() * 30) + 1;

            setTargetReference({
                book: randomBook,
                chapter: randomChapter,
                verse: randomVerse
            });

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
        if (!currentVerse || gameCompleted) return;

        // Handle number input for chapter and verse
        if (key === "BACKSPACE") {
            setChapterVerseInput(prev => prev.slice(0, -1));
        } else if (key === "ENTER") {
            handleSubmitGuess();
        } else if (key !== ":" && chapterVerseInput.length < 5) { // Allow max 5 chars (2 for chapter, 1 colon, 2 for verse)
            // If we're adding a digit, make sure it's in the right position
            if (chapterVerseInput.includes(":")) {
                // After colon, only allow 2 verse digits
                const [, verse] = chapterVerseInput.split(":");
                if (verse && verse.length >= 2) return;
                setChapterVerseInput(prev => prev + key);
            } else {
                // Before colon, check if we need to add a colon
                if (chapterVerseInput.length === 2) {
                    // Add colon automatically after 2 chapter digits
                    setChapterVerseInput(prev => prev + ":" + key);
                } else {
                    // Just add the digit
                    setChapterVerseInput(prev => prev + key);
                }
            }
        }
    };

    const handleSubmitGuess = () => {
        if (!selectedBook) {
            Alert.alert("Error", "Please select a book");
            return;
        }

        // Validate chapter:verse format
        if (!chapterVerseInput.includes(":")) {
            Alert.alert("Error", "Please enter chapter:verse format (e.g. 3:16)");
            return;
        }

        const [chapterStr, verseStr] = chapterVerseInput.split(":");
        if (!chapterStr || !verseStr) {
            Alert.alert("Error", "Invalid chapter:verse format");
            return;
        }

        // Save the guess
        const newGuesses = [...guesses];
        newGuesses[currentRow] = {
            book: selectedBook,
            chapterVerse: chapterVerseInput
        };
        setGuesses(newGuesses);

        // Check if the guess is correct
        const guessedChapter = parseInt(chapterStr);
        const guessedVerse = parseInt(verseStr);

        const isCorrect = selectedBook === targetReference.book &&
            guessedChapter === targetReference.chapter &&
            guessedVerse === targetReference.verse;

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
                    `The correct reference was: ${targetReference.book} ${targetReference.chapter}:${targetReference.verse}`,
                    [{ text: "OK" }]
                );
            }, 1500);
            return;
        }

        // Move to next row
        revealRow(currentRow);
        setCurrentRow(currentRow + 1);
        setSelectedBook("");
        setChapterVerseInput("");
    };

    const selectBook = (book: string) => {
        setSelectedBook(book);
        setShowBookModal(false);
    };

    const getGuessColor = (rowIndex: number, type: 'book' | 'chapter' | 'colon' | 'verse', digitIndex = 0): string => {
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
        const guessedChapter = parseInt(chapterStr || "0");
        const guessedVerse = parseInt(verseStr || "0");

        // Book color
        if (type === 'book') {
            if (guess.book === targetReference.book) {
                return "#5B8A51"; // Green - correct
            } else {
                // Check if the book is close to the target book
                const guessIndex = BIBLE_BOOKS.indexOf(guess.book);
                const targetIndex = BIBLE_BOOKS.indexOf(targetReference.book);

                if (Math.abs(guessIndex - targetIndex) <= 5) {
                    return "#B59F3B"; // Yellow - close
                }
                return "#A94442"; // Red - wrong
            }
        }

        // Chapter color
        if (type === 'chapter') {
            if (guessedChapter === targetReference.chapter) {
                return "#5B8A51"; // Green - correct
            } else if (Math.abs(guessedChapter - targetReference.chapter) <= 3) {
                return "#B59F3B"; // Yellow - close
            }
            return "#A94442"; // Red - wrong
        }

        // Colon color - matches chapter color
        if (type === 'colon') {
            if (guessedChapter === targetReference.chapter) {
                return "#5B8A51"; // Green
            } else if (Math.abs(guessedChapter - targetReference.chapter) <= 3) {
                return "#B59F3B"; // Yellow
            }
            return "#A94442"; // Red
        }

        // Verse color
        if (type === 'verse') {
            if (guessedVerse === targetReference.verse && guessedChapter === targetReference.chapter) {
                return "#5B8A51"; // Green - correct chapter and verse
            } else if (guessedVerse === targetReference.verse) {
                return "#B59F3B"; // Yellow - correct verse, wrong chapter
            } else if (Math.abs(guessedVerse - targetReference.verse) <= 3) {
                return "#B59F3B"; // Yellow - close
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

            return (
                <View key={rowIndex} style={styles.row}>
                    {/* Book box */}
                    <Animated.View
                        style={[
                            styles.bookBox,
                            {
                                backgroundColor: getGuessColor(rowIndex, 'book'),
                                transform: [{
                                    rotateX: flipAnimations[rowIndex]?.[0]?.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: ['0deg', '90deg', '180deg'],
                                    }) || '0deg'
                                }]
                            }
                        ]}
                    >
                        <Text style={[
                            styles.guessText,
                            getGuessColor(rowIndex, 'book') !== "#fff" && { color: "#fff" }
                        ]}>
                            {guess.book || ""}
                        </Text>
                    </Animated.View>

                    {/* Chapter boxes (2 digits) */}
                    {chapterDigits.map((digit, index) => (
                        <Animated.View
                            key={`chapter-${index}`}
                            style={[
                                styles.digitBox,
                                {
                                    backgroundColor: getGuessColor(rowIndex, 'chapter', index),
                                    transform: [{
                                        rotateX: flipAnimations[rowIndex]?.[index + 1]?.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: ['0deg', '90deg', '180deg'],
                                        }) || '0deg'
                                    }]
                                }
                            ]}
                        >
                            <Text style={[
                                styles.digitText,
                                getGuessColor(rowIndex, 'chapter', index) !== "#fff" && { color: "#fff" }
                            ]}>
                                {digit}
                            </Text>
                        </Animated.View>
                    ))}

                    {/* Fixed colon */}
                    <Text style={styles.fixedColon}>:</Text>

                    {/* Verse boxes (2 digits) */}
                    {verseDigits.map((digit, index) => (
                        <Animated.View
                            key={`verse-${index}`}
                            style={[
                                styles.digitBox,
                                {
                                    backgroundColor: getGuessColor(rowIndex, 'verse', index),
                                    transform: [{
                                        rotateX: flipAnimations[rowIndex]?.[index + 3]?.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: ['0deg', '90deg', '180deg'],
                                        }) || '0deg'
                                    }]
                                }
                            ]}
                        >
                            <Text style={[
                                styles.digitText,
                                getGuessColor(rowIndex, 'verse', index) !== "#fff" && { color: "#fff" }
                            ]}>
                                {digit}
                            </Text>
                        </Animated.View>
                    ))}
                </View>
            );
        });
    };

    const renderCurrentGuessInput = () => {
        if (gameCompleted) return null;

        // Parse current input
        let chapterText = "";
        let verseText = "";
        let hasColon = chapterVerseInput.includes(":");

        if (hasColon) {
            const parts = chapterVerseInput.split(":");
            chapterText = parts[0] || "";
            verseText = parts[1] || "";
        } else {
            chapterText = chapterVerseInput;
        }

        // Pad chapter and verse with empty space
        const chapterDigits = chapterText.padEnd(2, '').split('');
        const verseDigits = verseText.padEnd(2, '').split('');

        return (
            <View style={styles.inputContainer}>
                {/* Book selector */}
                <TouchableOpacity
                    style={styles.bookSelector}
                    onPress={() => setShowBookModal(true)}
                >
                    <Text style={styles.selectorText}>
                        {selectedBook || "Select Book"}
                    </Text>
                </TouchableOpacity>

                {/* Chapter input boxes */}
                {[0, 1].map(index => (
                    <View key={`chapter-input-${index}`} style={styles.digitInput}>
                        <Text style={styles.inputText}>{chapterDigits[index] || ""}</Text>
                    </View>
                ))}

                {/* Fixed colon */}
                <Text style={styles.fixedColon}>:</Text>

                {/* Verse input boxes */}
                {[0, 1].map(index => (
                    <View key={`verse-input-${index}`} style={styles.digitInput}>
                        <Text style={styles.inputText}>{verseDigits[index] || ""}</Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderNumberKeyboard = () => {
        const keys = [
            ["1", "2", "3", "4"],
            ["5", "6", "7", "8"],
            ["9", "0", "BACKSPACE"],
            ["ENTER"]
        ];

        return (
            <View style={styles.keyboard}>
                {keys.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.keyboardRow}>
                        {row.map((key) => {
                            if (key === "ENTER") {
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.keyEnter, { width: 180 }]}
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
        );
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
            targetReference,
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
                    setTargetReference(gameState.targetReference);
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

            {/* Convert debug box to verse display */}
            <View style={styles.verseBox}>
                <Text style={styles.verseText}>
                    {currentVerse?.hint || "Loading verse..."}
                </Text>
            </View>

            <Text style={styles.subtitle}>Guess the Bible Reference</Text>

            <View style={styles.grid}>{renderGrid()}</View>
            {renderCurrentGuessInput()}
            {renderNumberKeyboard()}

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
    debugText: {
        color: '#0f0',
        fontSize: 10,
        fontFamily: 'monospace',
    },
}); 