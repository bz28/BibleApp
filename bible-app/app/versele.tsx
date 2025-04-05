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

// Add a new type for digit states
type DigitState = 'correct' | 'present' | 'absent' | 'unused';

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
    const [showBookModal, setShowBookModal] = useState(false);
    const [currentInputType, setCurrentInputType] = useState<'book' | 'chapter' | 'verse'>('chapter');

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


        } catch (error) {
            console.error('Error loading new verse:', error);
            Alert.alert('Error', 'Failed to load new verse');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (key: string) => {
        if (!currentVerse || gameCompleted) return;

        // Book selection is still handled via the modal
        // We only handle chapter and verse number inputs here

        // Get the current guess
        const currentGuess = guesses[currentRow];

        if (key === "BACKSPACE") {
            // Handle backspace based on which part we're editing
            if (currentInputType === 'chapter') {
                // If we have chapter input, delete the last digit
                const chapterPart = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":")[0] : "";
                if (chapterPart.length > 0) {
                    const newChapterPart = chapterPart.slice(0, -1);
                    const versePart = currentGuess.chapterVerse && currentGuess.chapterVerse.includes(":")
                        ? currentGuess.chapterVerse.split(":")[1]
                        : "";

                    const newGuesses = [...guesses];
                    newGuesses[currentRow] = {
                        ...newGuesses[currentRow],
                        chapterVerse: newChapterPart + (versePart ? ":" + versePart : "")
                    };
                    setGuesses(newGuesses);
                }
            } else if (currentInputType === 'verse') {
                // If we have verse input, delete the last digit
                const parts = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":") : ["", ""];
                const chapterPart = parts[0] || "";
                const versePart = parts.length > 1 ? parts[1] : "";

                if (versePart.length > 0) {
                    const newVersePart = versePart.slice(0, -1);

                    const newGuesses = [...guesses];
                    newGuesses[currentRow] = {
                        ...newGuesses[currentRow],
                        chapterVerse: chapterPart + ":" + newVersePart
                    };
                    setGuesses(newGuesses);
                }
                // If there's no verse part left but we have chapter, switch to chapter input
                else if (chapterPart.length > 0) {
                    setCurrentInputType('chapter');
                }
            }
        } else if (key === "ENTER") {
            // If we're entering chapter and have 1-2 digits, move to verse input
            if (currentInputType === 'chapter') {
                const chapterPart = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":")[0] : "";
                if (chapterPart.length > 0) {
                    setCurrentInputType('verse');

                    // Add the colon if it's not there
                    if (!currentGuess.chapterVerse.includes(":")) {
                        const newGuesses = [...guesses];
                        newGuesses[currentRow] = {
                            ...newGuesses[currentRow],
                            chapterVerse: chapterPart + ":"
                        };
                        setGuesses(newGuesses);
                    }
                }
            }
            // If we're entering verse and have both chapter and verse, submit the guess
            else if (currentInputType === 'verse') {
                const parts = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":") : ["", ""];
                const chapterPart = parts[0] || "";
                const versePart = parts.length > 1 ? parts[1] : "";

                if (chapterPart.length > 0 && versePart.length > 0 && currentGuess.book) {
                    checkGuess(currentGuess);

                    // After submitting, prepare for the next row if game isn't over
                    if (currentRow < MAX_GUESSES - 1 && !gameCompleted) {
                        setCurrentInputType('chapter');
                    }
                }
            }
        } else if (key >= "0" && key <= "9") {
            // Handle numeric input
            if (currentInputType === 'chapter') {
                const chapterPart = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":")[0] : "";
                const versePart = currentGuess.chapterVerse && currentGuess.chapterVerse.includes(":")
                    ? currentGuess.chapterVerse.split(":")[1]
                    : "";

                // Only allow 2 digits for chapter
                if (chapterPart.length < 2) {
                    const newGuesses = [...guesses];
                    newGuesses[currentRow] = {
                        ...newGuesses[currentRow],
                        chapterVerse: chapterPart + key + (versePart ? ":" + versePart : "")
                    };
                    setGuesses(newGuesses);

                    // If we've entered 2 digits for chapter, automatically switch to verse
                    if (chapterPart.length === 1) {
                        setCurrentInputType('verse');

                        // Add the colon if it's not there
                        if (!newGuesses[currentRow].chapterVerse.includes(":")) {
                            newGuesses[currentRow] = {
                                ...newGuesses[currentRow],
                                chapterVerse: chapterPart + key + ":"
                            };
                            setGuesses(newGuesses);
                        }
                    }
                }
            } else if (currentInputType === 'verse') {
                const parts = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":") : ["", ""];
                const chapterPart = parts[0] || "";
                const versePart = parts.length > 1 ? parts[1] : "";

                // Only allow 2 digits for verse
                if (versePart.length < 2) {
                    const newGuesses = [...guesses];
                    newGuesses[currentRow] = {
                        ...newGuesses[currentRow],
                        chapterVerse: chapterPart + ":" + versePart + key
                    };
                    setGuesses(newGuesses);

                    // If we've entered 2 digits for verse and have a book, automatically submit
                    if (versePart.length === 1 && currentGuess.book) {
                        setTimeout(() => {
                            checkGuess(newGuesses[currentRow]);

                            // After submitting, prepare for the next row if game isn't over
                            if (currentRow < MAX_GUESSES - 1 && !gameCompleted) {
                                setCurrentInputType('chapter');
                            }
                        }, 500); // Small delay to show the input
                    }
                }
            }
        }
    };

    const selectBook = (book: string) => {
        const newGuesses = [...guesses];
        newGuesses[currentRow] = {
            ...newGuesses[currentRow],
            book: book
        };
        setGuesses(newGuesses);

        setShowBookModal(false);
        setCurrentInputType('chapter');
    };

    const getGuessColor = (rowIndex: number, type: 'book' | 'chapter' | 'colon' | 'verse', digitIndex = 0): string => {
        if (!currentVerse) return "#fff";

        // Safeguard against undefined or out-of-bounds rows
        if (rowIndex < 0 || rowIndex >= guesses.length) return "#fff";

        // For future rows (not yet guessed), always white
        if (rowIndex > currentRow) return "#fff";

        // Extract guess data - safely check for empty guesses
        const guess = guesses[rowIndex];
        if (!guess || !guess.book || !guess.chapterVerse) return "#fff";

        // If we're revealing the current row, control the color reveal animation
        if (rowIndex === currentRow && revealedBoxes >= 0) {
            // Map box types to indices for animation sequence
            const boxIndices = {
                'book': 0,
                'chapter': [1, 2],
                'colon': 3,
                'verse': [4, 5]
            };

            let boxIndex = -1;
            if (type === 'chapter' && digitIndex < boxIndices.chapter.length) {
                boxIndex = boxIndices.chapter[digitIndex];
            } else if (type === 'verse' && digitIndex < boxIndices.verse.length) {
                boxIndex = boxIndices.verse[digitIndex];
            } else if (type === 'book') {
                boxIndex = 0;
            } else if (type === 'colon') {
                boxIndex = 3;
            }

            // If this box hasn't been revealed yet in the animation sequence, show white
            if (boxIndex > revealedBoxes) return "#fff";

            // If this is exactly the box being revealed right now, make sure to show color
            if (boxIndex === revealedBoxes) {
                // Continue with color calculation below
            } else {
                // For boxes already revealed in this row, show their colors
            }
        }

        // If we're on current row but not in animation and not completed game, show white
        if (rowIndex === currentRow && revealedBoxes < 0 && !gameCompleted) return "#fff";

        // Extract chapter and verse from the guess - with safety checks
        const parts = guess.chapterVerse.split(":");
        const chapterStr = parts.length > 0 ? parts[0] : "";
        const verseStr = parts.length > 1 ? parts[1] : "";

        // Ensure we have strings for comparison
        const targetChapter = currentVerse.chapter ? String(currentVerse.chapter) : "";
        const targetVerse = currentVerse.verse ? String(currentVerse.verse) : "";

        // Book color
        if (type === 'book') {
            if (guess.book === currentVerse.book) {
                return "#5B8A51"; // Green - correct
            } else {
                // Check if the book is close to the target book
                const guessIndex = BIBLE_BOOKS.indexOf(guess.book);
                const targetIndex = BIBLE_BOOKS.indexOf(currentVerse.book || "");

                if (Math.abs(guessIndex - targetIndex) <= 5) {
                    return "#B59F3B"; // Yellow - close
                }
                return "#A94442"; // Red - wrong
            }
        }

        // Chapter color - with improved handling of duplicates
        if (type === 'chapter') {
            // Get the specific digit with safety check
            const digit = chapterStr && digitIndex < chapterStr.length ? chapterStr[digitIndex] : '';
            const targetDigit = targetChapter && digitIndex < targetChapter.length ? targetChapter[digitIndex] : '';

            // If exact match at the specific position, always green
            if (digit === targetDigit && digit !== '') {
                return "#5B8A51"; // Green - correct
            }

            // Count frequencies in target and guess
            const targetFreq: Record<string, number> = {};
            const exactMatchPositions: Set<number> = new Set();

            // Build frequency map of target chapter
            for (let i = 0; i < targetChapter.length; i++) {
                const d = targetChapter[i];
                targetFreq[d] = (targetFreq[d] || 0) + 1;
            }

            // Reduce frequencies for exact matches
            for (let i = 0; i < chapterStr.length; i++) {
                const guessDigit = chapterStr[i];
                const currTargetDigit = i < targetChapter.length ? targetChapter[i] : '';

                if (guessDigit === currTargetDigit) {
                    targetFreq[guessDigit]--;
                    exactMatchPositions.add(i);
                }
            }

            // If not an exact match, check if it can be yellow
            if (!exactMatchPositions.has(digitIndex) && digit && targetFreq[digit] && targetFreq[digit] > 0) {
                targetFreq[digit]--; // Decrease frequency to mark this one as used
                return "#B59F3B"; // Yellow - wrong position
            }

            return "#A94442"; // Red - wrong
        }

        // Verse color - with improved handling of duplicates
        if (type === 'verse') {
            // Get the specific digit with safety check
            const digit = verseStr && digitIndex < verseStr.length ? verseStr[digitIndex] : '';
            const targetDigit = targetVerse && digitIndex < targetVerse.length ? targetVerse[digitIndex] : '';

            // If exact match at the specific position, always green
            if (digit === targetDigit && digit !== '') {
                return "#5B8A51"; // Green - correct
            }

            // Count frequencies in target and guess
            const targetFreq: Record<string, number> = {};
            const exactMatchPositions: Set<number> = new Set();

            // Build frequency map of target verse
            for (let i = 0; i < targetVerse.length; i++) {
                const d = targetVerse[i];
                targetFreq[d] = (targetFreq[d] || 0) + 1;
            }

            // Reduce frequencies for exact matches
            for (let i = 0; i < verseStr.length; i++) {
                const guessDigit = verseStr[i];
                const currTargetDigit = i < targetVerse.length ? targetVerse[i] : '';

                if (guessDigit === currTargetDigit) {
                    targetFreq[guessDigit]--;
                    exactMatchPositions.add(i);
                }
            }

            // If not an exact match, check if it can be yellow
            if (!exactMatchPositions.has(digitIndex) && digit && targetFreq[digit] && targetFreq[digit] > 0) {
                targetFreq[digit]--; // Decrease frequency to mark this one as used
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

            // Determine if this row is being revealed (animation in progress)
            const isRevealing = rowIndex === currentRow && revealedBoxes >= 0;

            return (
                <View key={rowIndex} style={styles.row}>
                    {/* Book box - clickable with animation */}
                    <TouchableOpacity
                        disabled={!isCurrentRow || gameCompleted}
                        onPress={() => {
                            setShowBookModal(true);
                        }}
                        style={[
                            styles.bookBox,
                            isCurrentRow && !gameCompleted && !guess.book ? styles.highlightedBox : null,
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.animatedInnerBox,
                                {
                                    backgroundColor: getGuessColor(rowIndex, 'book'),
                                    transform: rowIndex < currentRow || isRevealing ? [{
                                        rotateX: flipAnimations[rowIndex]?.[0]?.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: ['0deg', '90deg', '180deg'],
                                        }) || '0deg'
                                    }] : []
                                }
                            ]}
                        >
                            <Animated.Text style={[
                                styles.guessText,
                                getGuessColor(rowIndex, 'book') !== "#fff" && { color: "#fff" },
                                rowIndex < currentRow || isRevealing ? {
                                    transform: [{
                                        rotateX: flipAnimations[rowIndex]?.[0]?.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: ['0deg', '-90deg', '-180deg'],
                                        }) || '0deg'
                                    }]
                                } : {}
                            ]}>
                                {guess.book || ""}
                            </Animated.Text>
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Chapter boxes (2 digits) with animation */}
                    <View style={styles.doubleDigitContainer}>
                        {chapterDigits.map((digit, index) => (
                            <Animated.View
                                key={`chapter-${index}`}
                                style={[
                                    styles.digitBox,
                                    isCurrentRow && !gameCompleted && currentInputType === 'chapter' ? styles.highlightedBox : null,
                                    {
                                        transform: rowIndex < currentRow || isRevealing ? [{
                                            rotateX: flipAnimations[rowIndex]?.[index + 1]?.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: ['0deg', '90deg', '180deg'],
                                            }) || '0deg'
                                        }] : []
                                    }
                                ]}
                            >
                                <Animated.View
                                    style={[
                                        styles.animatedInnerBox,
                                        {
                                            backgroundColor: getGuessColor(rowIndex, 'chapter', index),
                                        }
                                    ]}
                                >
                                    <Animated.Text style={[
                                        styles.digitText,
                                        getGuessColor(rowIndex, 'chapter', index) !== "#fff" && { color: "#fff" },
                                        rowIndex < currentRow || isRevealing ? {
                                            transform: [{
                                                rotateX: flipAnimations[rowIndex]?.[index + 1]?.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: ['0deg', '-90deg', '-180deg'],
                                                }) || '0deg'
                                            }]
                                        } : {}
                                    ]}>
                                        {digit}
                                    </Animated.Text>
                                </Animated.View>
                            </Animated.View>
                        ))}
                    </View>

                    {/* Fixed colon */}
                    <Text style={styles.fixedColon}>:</Text>

                    {/* Verse boxes (2 digits) with animation */}
                    <View style={styles.doubleDigitContainer}>
                        {verseDigits.map((digit, index) => (
                            <Animated.View
                                key={`verse-${index}`}
                                style={[
                                    styles.digitBox,
                                    isCurrentRow && !gameCompleted && currentInputType === 'verse' ? styles.highlightedBox : null,
                                    {
                                        transform: rowIndex < currentRow || isRevealing ? [{
                                            rotateX: flipAnimations[rowIndex]?.[index + 3]?.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: ['0deg', '90deg', '180deg'],
                                            }) || '0deg'
                                        }] : []
                                    }
                                ]}
                            >
                                <Animated.View
                                    style={[
                                        styles.animatedInnerBox,
                                        {
                                            backgroundColor: getGuessColor(rowIndex, 'verse', index),
                                        }
                                    ]}
                                >
                                    <Animated.Text style={[
                                        styles.digitText,
                                        getGuessColor(rowIndex, 'verse', index) !== "#fff" && { color: "#fff" },
                                        rowIndex < currentRow || isRevealing ? {
                                            transform: [{
                                                rotateX: flipAnimations[rowIndex]?.[index + 3]?.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: ['0deg', '-90deg', '-180deg'],
                                                }) || '0deg'
                                            }]
                                        } : {}
                                    ]}>
                                        {digit}
                                    </Animated.Text>
                                </Animated.View>
                            </Animated.View>
                        ))}
                    </View>
                </View>
            );
        });
    };

    const revealRow = async (rowIndex: number) => {
        // Safety check for valid rowIndex and flipAnimations
        if (rowIndex < 0 || rowIndex >= guesses.length || !flipAnimations[rowIndex]) {
            console.error(`Invalid rowIndex: ${rowIndex} or missing flipAnimations`);
            return;
        }

        // Remember whether this is a completed game for after animation
        const isGameComplete = gameCompleted;

        // Start with no boxes revealed (white)
        setRevealedBoxes(-1);

        // Brief pause before starting animation
        await new Promise(resolve => setTimeout(resolve, 100));

        // Animate the reveal of the current guess boxes one by one
        // We have 5 boxes total: book (1), chapter (2), verse (2)
        for (let i = 0; i < 5; i++) {
            if (flipAnimations[rowIndex][i]) {
                // Set which box is being revealed so it can show the right color
                setRevealedBoxes(i);

                // Start the flip animation
                Animated.timing(flipAnimations[rowIndex][i], {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }).start();

                // Wait for animation to complete before moving to next box
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        // After animation completes, reset revealedBoxes if not a completed game
        // For completed games, keep the last revealed state
        if (!isGameComplete) {
            setRevealedBoxes(-1);
        }
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

        // Reset animation values for this row before starting new animations
        if (flipAnimations[currentRow]) {
            flipAnimations[currentRow].forEach(anim => {
                if (anim) anim.setValue(0);
            });
        }

        if (isCorrect) {
            // Set game as completed before animation to prevent further input
            setGameCompleted(true);
            revealRow(currentRow);

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
                        },
                        {
                            text: "Play Again (Ad)",
                            onPress: async () => {
                                await AsyncStorage.removeItem('lastVerselePlayed');
                                await loadNewVerse();
                                setCurrentInputType('chapter');
                                setGameCompleted(false);
                            }
                        }
                    ]
                );
            }, 1500);
            return;
        }

        // Check if this was the last guess
        if (currentRow === MAX_GUESSES - 1) {
            // Set game as completed before animation to prevent further input
            setGameCompleted(true);
            revealRow(currentRow);

            setTimeout(() => {
                Alert.alert(
                    "Game Over",
                    `The correct reference was: ${currentVerse.book} ${currentVerse.chapter}:${currentVerse.verse}`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                AsyncStorage.setItem('lastVerselePlayed', new Date().getTime().toString());
                            }
                        },
                        {
                            text: "Play Again (Ad)",
                            onPress: async () => {
                                await AsyncStorage.removeItem('lastVerselePlayed');
                                await loadNewVerse();
                                setCurrentInputType('chapter');
                                setGameCompleted(false);
                            }
                        }
                    ]
                );
            }, 1500);
            return;
        }

        // For non-winning guesses, animate the reveal first
        revealRow(currentRow);

        // Then move to next row (after animation completes)
        setTimeout(() => {
            setCurrentRow(currentRow + 1);
        }, 1500);
    };

    // Add function to track number key states based on previous guesses
    const getNumberKeyStates = (): Record<string, DigitState> => {
        if (!currentVerse) return {};

        const states: Record<string, DigitState> = {};

        // Initialize all digits as unused
        '0123456789'.split('').forEach(digit => {
            states[digit] = 'unused';
        });

        // Go through all guessed rows
        for (let rowIndex = 0; rowIndex < currentRow; rowIndex++) {
            const guess = guesses[rowIndex];
            if (!guess.chapterVerse) continue;

            const parts = guess.chapterVerse.split(':');
            const chapterStr = parts[0] || "";
            const verseStr = parts.length > 1 ? parts[1] : "";

            // Target values for comparison
            const targetChapter = currentVerse.chapter ? String(currentVerse.chapter) : "";
            const targetVerse = currentVerse.verse ? String(currentVerse.verse) : "";

            // Create frequency maps for target chapter and verse
            const chapterFreq: Record<string, number> = {};
            const verseFreq: Record<string, number> = {};

            // Build frequency maps
            for (let i = 0; i < targetChapter.length; i++) {
                const digit = targetChapter[i];
                chapterFreq[digit] = (chapterFreq[digit] || 0) + 1;
            }

            for (let i = 0; i < targetVerse.length; i++) {
                const digit = targetVerse[i];
                verseFreq[digit] = (verseFreq[digit] || 0) + 1;
            }

            // Track exact matches in chapter
            const chapterExactMatches: Set<number> = new Set();
            for (let i = 0; i < chapterStr.length; i++) {
                const digit = chapterStr[i];
                if (i < targetChapter.length && digit === targetChapter[i]) {
                    chapterExactMatches.add(i);
                    chapterFreq[digit]--; // Decrease available count

                    // Mark as correct in states (highest priority)
                    states[digit] = 'correct';
                }
            }

            // Track exact matches in verse
            const verseExactMatches: Set<number> = new Set();
            for (let i = 0; i < verseStr.length; i++) {
                const digit = verseStr[i];
                if (i < targetVerse.length && digit === targetVerse[i]) {
                    verseExactMatches.add(i);
                    verseFreq[digit]--; // Decrease available count

                    // Mark as correct in states (highest priority)
                    states[digit] = 'correct';
                }
            }

            // Check for present but misplaced digits in chapter
            for (let i = 0; i < chapterStr.length; i++) {
                if (chapterExactMatches.has(i)) continue; // Skip exact matches

                const digit = chapterStr[i];
                // If digit exists in chapter and there are still available instances
                if (chapterFreq[digit] && chapterFreq[digit] > 0) {
                    chapterFreq[digit]--; // Decrease available count

                    // Only upgrade to 'present' if not already 'correct'
                    if (states[digit] !== 'correct') {
                        states[digit] = 'present';
                    }
                }
                // If digit exists in verse and there are still available instances
                else if (verseFreq[digit] && verseFreq[digit] > 0) {
                    verseFreq[digit]--; // Decrease available count

                    // Only upgrade to 'present' if not already 'correct'
                    if (states[digit] !== 'correct') {
                        states[digit] = 'present';
                    }
                }
                // If not already marked and not found in either chapter or verse
                else if (states[digit] === 'unused') {
                    states[digit] = 'absent';
                }
            }

            // Check for present but misplaced digits in verse
            for (let i = 0; i < verseStr.length; i++) {
                if (verseExactMatches.has(i)) continue; // Skip exact matches

                const digit = verseStr[i];
                // If digit exists in verse and there are still available instances
                if (verseFreq[digit] && verseFreq[digit] > 0) {
                    verseFreq[digit]--; // Decrease available count

                    // Only upgrade to 'present' if not already 'correct'
                    if (states[digit] !== 'correct') {
                        states[digit] = 'present';
                    }
                }
                // If digit exists in chapter and there are still available instances
                else if (chapterFreq[digit] && chapterFreq[digit] > 0) {
                    chapterFreq[digit]--; // Decrease available count

                    // Only upgrade to 'present' if not already 'correct'
                    if (states[digit] !== 'correct') {
                        states[digit] = 'present';
                    }
                }
                // If not already marked and not found in either chapter or verse
                else if (states[digit] === 'unused') {
                    states[digit] = 'absent';
                }
            }
        }

        return states;
    };

    // Add helper function to get the background color for a key
    const getKeyBackground = (key: string): string => {
        if (key === "ENTER" || key === "BACKSPACE") {
            return "#d4b08c"; // Default color for special keys
        }

        const digitStates = getNumberKeyStates();
        switch (digitStates[key]) {
            case 'correct':
                return "#5B8A51"; // Green
            case 'present':
                return "#B59F3B"; // Yellow
            case 'absent':
                return "#A94442"; // Red
            default:
                return "#e8d5c4"; // Default color
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

            {/* Always show keyboard unless game is completed */}
            {!gameCompleted && (
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
                                            style={[
                                                styles.key,
                                                { backgroundColor: getKeyBackground(key) }
                                            ]}
                                            onPress={() => handleKeyPress(key)}
                                        >
                                            <Text style={[
                                                styles.keyText,
                                                getNumberKeyStates()[key] !== 'unused' && { color: '#fff' }
                                            ]}>
                                                {key}
                                            </Text>
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
        overflow: 'hidden',
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
        overflow: 'hidden',
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
    highlightedBox: {
        borderColor: '#e67e22',
        borderWidth: 3,
    },
    animatedInnerBox: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2,
    },
}); 