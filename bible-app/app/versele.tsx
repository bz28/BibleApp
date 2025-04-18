import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Animated, Modal, FlatList, ScrollView, Easing } from "react-native";
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

const MAX_GUESSES = 5; // number of guesses
const SCREEN_WIDTH = Dimensions.get("window").width; // width of the screen
const SCREEN_HEIGHT = Dimensions.get("window").height; // height of the screen

// Add a new type for digit states red, yellow, green, white
type DigitState = 'correct' | 'present' | 'absent' | 'unused';

export default function Versele() {
    const [guesses, setGuesses] = useState<{ book: string, chapterVerse: string }[]>(
        Array(MAX_GUESSES).fill({ book: "", chapterVerse: "" }) // initial guesses
    );
    const [currentRow, setCurrentRow] = useState(0); // current row
    const [currentVerse, setCurrentVerse] = useState<VerseReference | null>(null); // current verse
    const [isLoading, setIsLoading] = useState(true); // loading state
    const [gameCompleted, setGameCompleted] = useState(false); // keeps track of wether we can play today
    const [revealedBoxes, setRevealedBoxes] = useState<number>(-1); // revealed boxes state
    const [flipAnimations, setFlipAnimations] = useState<Animated.Value[][]>([]); // flip animations state
    const [showBookModal, setShowBookModal] = useState(false); // show book modal state
    const [currentInputType, setCurrentInputType] = useState<'book' | 'chapter' | 'verse'>('chapter'); // current input type state

    useEffect(() => {
        const setupGame = async () => {
            try {
                await initDatabase(); // initialize the database

                // Check if we can play today
                const canPlay = await checkIfCanPlay(); // check if we can play today
                if (!canPlay) {
                    setGameCompleted(true); // set game completed state to True because we can't play today
                    setIsLoading(false); // set loading state to false because we don't need to load a new verse
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
                                        const gameState = JSON.parse(savedState); // parse the saved state
                                        setGuesses(gameState.guesses); // set the guesses
                                        setCurrentRow(gameState.currentRow); // set the current row
                                        setCurrentVerse(gameState.currentVerse); // set the current verse
                                        setGameCompleted(true); // set game completed state to True
                                        setIsLoading(false); // set loading state to false because we don't need to load a new verse
                                    }
                                }
                            },
                            {
                                text: "Play Again (Ad)",
                                onPress: async () => {
                                    await AsyncStorage.removeItem('lastVerselePlayed'); // remove the last versele played date
                                    await loadNewVerse(); // load a new verse
                                    setGameCompleted(false); // set game completed state to false because we can play today
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
                // If we can't load saved state, load a new verse

                await loadNewVerse();
            } catch (error) {
                console.error('Error setting up game:', error);
                Alert.alert('Error', 'Failed to load game data');
            }
        };
        // Run the setupGame function if we can play
        setupGame();
    }, []);


    // save game state whenever one of these states change
    useEffect(() => {
        saveGameState();
    }, [guesses, currentRow, currentVerse, gameCompleted]);


    // whenever the current verse changes, initialize the flip animations
    useEffect(() => {
        if (currentVerse) {
            // Initialize flip animations for all MAX_GUESSES rows, 5 boxes per row (1 book + 2 chapter + 2 verse)
            setFlipAnimations(
                // initialize MAX_GUESSES rows which are mapped to the 5 boxes
                Array(MAX_GUESSES).fill(null).map(() => //create MAX_GUESSES rows which are mapped to the 5 boxes
                    // create 5 boxes which are mapped to 5 0 values
                    Array(5).fill(null).map(() => new Animated.Value(0))
                )
            );
        }
    }, [currentVerse]);

    const checkIfCanPlay = async () => {
        const lastPlayed = await AsyncStorage.getItem('lastVerselePlayed'); // get the last versele played date
        if (lastPlayed) {
            const lastPlayedDate = new Date(parseInt(lastPlayed)); // parse the last versele played date
            const now = new Date(); // get the current date

            const isSameDay = lastPlayedDate.getDate() === now.getDate() && // check if the day is the same
                lastPlayedDate.getMonth() === now.getMonth() &&
                lastPlayedDate.getFullYear() === now.getFullYear();

            if (isSameDay) {
                return false; // return false if the day is the same
            }
        }

        return true;
    };

    const loadNewVerse = async () => {
        try {
            setIsLoading(true);

            const verse = await getRandomVerseReference();


            setCurrentVerse(verse); // set the current verse    

            setGuesses(Array(MAX_GUESSES).fill({ book: "", chapterVerse: "" })); // reset the guesses
            setCurrentRow(0); // reset the current row


        } catch (error) {
            console.error('Error loading new verse:', error);
            Alert.alert('Error', 'Failed to load new verse');
        } finally {
            setIsLoading(false); // set loading state to false once we have loaded a new verse
        }
    };

    const handleKeyPress = (key: string) => {
        if (!currentVerse || gameCompleted) return;

        // Book selection is still handled via the modal
        // We only handle chapter and verse number inputs here


        const currentGuess = guesses[currentRow]; // get the current guess

        if (key === "BACKSPACE") {
            // Handle backspace based on which part we're editing
            if (currentInputType === 'chapter') {
                // If we have chapter input, delete the last digit
                const chapterPart = currentGuess.chapterVerse ? currentGuess.chapterVerse.split(":")[0] : ""; // checks for null then splits the chapter part
                if (chapterPart.length > 0) {
                    const newChapterPart = chapterPart.slice(0, -1); // delete the last digit from the chapter part slice(0,-1)
                    const versePart = currentGuess.chapterVerse && currentGuess.chapterVerse.includes(":")
                        ? currentGuess.chapterVerse.split(":")[1]
                        : ""; // checks for null then splits the verse part and grabs the second part past the colon else empty string

                    const newGuesses = [...guesses]; // create shallow copy of guesses
                    newGuesses[currentRow] = {
                        ...newGuesses[currentRow], //new row will have same book and chapterVerse but with the chapter part without the last digit next line will update the chapter part
                        chapterVerse: newChapterPart + (versePart ? ":" + versePart : "") //replace the chapter part with the new chapter part and add the verse part if it exists leave everything else the same
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
                    // Prevent double guess submission by disabling if already at max guesses
                    if (currentRow < MAX_GUESSES) {
                        checkGuess(currentGuess);
                    }

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
                        }, 500);
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
        // If there's no animations set up yet, return an empty fragment
        if (!flipAnimations || flipAnimations.length === 0) {
            return null;
        }

        return guesses.map((guess, rowIndex) => {
            // Split chapter:verse for display
            let chapterText = "";
            let verseText = "";

            if (guess.chapterVerse) {
                const parts = guess.chapterVerse.split(":");
                chapterText = parts[0] || "";
                verseText = parts[1] || "";
            }

            // Pad chapter and verse with empty space to ensure 2 digits
            const chapterDigits = chapterText.padEnd(2, ' ').split('');
            const verseDigits = verseText.padEnd(2, ' ').split('');

            // Only allow interaction with the current row
            const isCurrentRow = rowIndex === currentRow;

            // Calculate if this is a row being animated
            const isAnimatingRow = rowIndex === currentRow && revealedBoxes >= 0;

            // Handle completed game case - should show colors for the final row
            const isCompletedFinalRow = gameCompleted && rowIndex === currentRow;

            // Determine if this row should show colors permanently
            // Either previously completed rows OR the final row in a completed game
            const shouldShowFinalColors = rowIndex < currentRow || isCompletedFinalRow;

            return (
                <View key={rowIndex} style={styles.row}>
                    {/* Book box */}
                    <Animated.View
                        style={[
                            styles.bookBox,
                            {
                                backgroundColor: "#fff",
                            }
                        ]}
                    >
                        <Animated.View
                            style={{
                                width: '100%',
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                                transform: [{
                                    rotateX: shouldShowFinalColors ? '0deg' : (
                                        flipAnimations[rowIndex]?.[0]?.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: ['0deg', '90deg', '0deg'],
                                        }) || '0deg'
                                    )
                                }]
                            }}
                        >
                            {/* Front side */}
                            <Animated.View
                                style={{
                                    backfaceVisibility: 'hidden',
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: "#fff",
                                    opacity: shouldShowFinalColors ? 0 : (
                                        flipAnimations[rowIndex]?.[0]?.interpolate({
                                            inputRange: [0, 0.4999, 0.5, 1],
                                            outputRange: [1, 1, 0, 0],
                                        }) || 1
                                    )
                                }}
                            >
                                {isCurrentRow && !gameCompleted ? (
                                    <TouchableOpacity
                                        style={styles.boxTouchable}
                                        onPress={() => setShowBookModal(true)}
                                    >
                                        <Text
                                            style={styles.bookText}
                                            numberOfLines={1}
                                        >
                                            {guess.book || ""}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text
                                        style={styles.bookText}
                                        numberOfLines={1}
                                    >
                                        {guess.book || ""}
                                    </Text>
                                )}
                            </Animated.View>

                            {/* Back side */}
                            <Animated.View
                                style={{
                                    backfaceVisibility: 'hidden',
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: (rowIndex < currentRow || isCompletedFinalRow || (isAnimatingRow && 0 <= revealedBoxes))
                                        ? getGuessColor(rowIndex, 'book')
                                        : "#fff",
                                    opacity: shouldShowFinalColors ? 1 : (
                                        flipAnimations[rowIndex]?.[0]?.interpolate({
                                            inputRange: [0, 0.4999, 0.5, 1],
                                            outputRange: [0, 0, 1, 1],
                                        }) || 0
                                    )
                                }}
                            >
                                <Text
                                    style={[
                                        styles.bookText,
                                        { color: '#fff' }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {guess.book || ""}
                                </Text>
                            </Animated.View>
                        </Animated.View>
                    </Animated.View>

                    {/* Chapter digits */}
                    {chapterDigits.map((digit, index) => {
                        const boxIndex = index + 1; // 1, 2 for chapter digits

                        return (
                            <Animated.View
                                key={`chapter-${index}`}
                                style={[
                                    styles.digitBox,
                                    isCurrentRow && !gameCompleted && currentInputType === 'chapter' && { borderColor: "#e67e22" },
                                ]}
                            >
                                <Animated.View
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        transform: [{
                                            rotateX: shouldShowFinalColors ? '0deg' : (
                                                flipAnimations[rowIndex]?.[boxIndex]?.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: ['0deg', '90deg', '0deg'],
                                                }) || '0deg'
                                            )
                                        }]
                                    }}
                                >
                                    {/* Front side */}
                                    <Animated.View
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            width: '100%',
                                            height: '100%',
                                            position: 'absolute',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: "#fff",
                                            opacity: shouldShowFinalColors ? 0 : (
                                                flipAnimations[rowIndex]?.[boxIndex]?.interpolate({
                                                    inputRange: [0, 0.4999, 0.5, 1],
                                                    outputRange: [1, 1, 0, 0],
                                                }) || 1
                                            )
                                        }}
                                    >
                                        <Text style={styles.digitText}>
                                            {digit === ' ' ? '' : digit}
                                        </Text>
                                    </Animated.View>

                                    {/* Back side */}
                                    <Animated.View
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            width: '100%',
                                            height: '100%',
                                            position: 'absolute',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: (rowIndex < currentRow || isCompletedFinalRow || (isAnimatingRow && boxIndex <= revealedBoxes))
                                                ? getGuessColor(rowIndex, 'chapter', index)
                                                : "#fff",
                                            opacity: shouldShowFinalColors ? 1 : (
                                                flipAnimations[rowIndex]?.[boxIndex]?.interpolate({
                                                    inputRange: [0, 0.4999, 0.5, 1],
                                                    outputRange: [0, 0, 1, 1],
                                                }) || 0
                                            )
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.digitText,
                                                { color: '#fff' }
                                            ]}
                                        >
                                            {digit === ' ' ? '' : digit}
                                        </Text>
                                    </Animated.View>
                                </Animated.View>
                            </Animated.View>
                        );
                    })}

                    {/* Colon separator */}
                    <Text style={styles.fixedColon}>:</Text>

                    {/* Verse digits */}
                    {verseDigits.map((digit, index) => {
                        const boxIndex = index + 3; // 3, 4 for verse digits

                        return (
                            <Animated.View
                                key={`verse-${index}`}
                                style={[
                                    styles.digitBox,
                                    isCurrentRow && !gameCompleted && currentInputType === 'verse' && { borderColor: "#e67e22" },
                                ]}
                            >
                                <Animated.View
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        transform: [{
                                            rotateX: shouldShowFinalColors ? '0deg' : (
                                                flipAnimations[rowIndex]?.[boxIndex]?.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: ['0deg', '90deg', '0deg'],
                                                }) || '0deg'
                                            )
                                        }]
                                    }}
                                >
                                    {/* Front side */}
                                    <Animated.View
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            width: '100%',
                                            height: '100%',
                                            position: 'absolute',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: "#fff",
                                            opacity: shouldShowFinalColors ? 0 : (
                                                flipAnimations[rowIndex]?.[boxIndex]?.interpolate({
                                                    inputRange: [0, 0.4999, 0.5, 1],
                                                    outputRange: [1, 1, 0, 0],
                                                }) || 1
                                            )
                                        }}
                                    >
                                        <Text style={styles.digitText}>
                                            {digit === ' ' ? '' : digit}
                                        </Text>
                                    </Animated.View>

                                    {/* Back side */}
                                    <Animated.View
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            width: '100%',
                                            height: '100%',
                                            position: 'absolute',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: (rowIndex < currentRow || isCompletedFinalRow || (isAnimatingRow && boxIndex <= revealedBoxes))
                                                ? getGuessColor(rowIndex, 'verse', index)
                                                : "#fff",
                                            opacity: shouldShowFinalColors ? 1 : (
                                                flipAnimations[rowIndex]?.[boxIndex]?.interpolate({
                                                    inputRange: [0, 0.4999, 0.5, 1],
                                                    outputRange: [0, 0, 1, 1],
                                                }) || 0
                                            )
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.digitText,
                                                { color: '#fff' }
                                            ]}
                                        >
                                            {digit === ' ' ? '' : digit}
                                        </Text>
                                    </Animated.View>
                                </Animated.View>
                            </Animated.View>
                        );
                    })}
                </View>
            );
        });
    };

    const revealRow = async (rowIndex: number): Promise<void> => {
        return new Promise<void>(async (resolve) => {
            // Safety check for valid rowIndex and flipAnimations
            if (rowIndex < 0 || rowIndex >= guesses.length || !flipAnimations[rowIndex]) {
                console.error(`Invalid rowIndex: ${rowIndex} or missing flipAnimations`);
                resolve();
                return;
            }

            // Reset animation values for this row before starting
            flipAnimations[rowIndex].forEach(anim => {
                if (anim) anim.setValue(0);
            });

            // We have 5 boxes total: book (1), chapter (2), verse (2)
            for (let i = 0; i < 5; i++) {
                if (flipAnimations[rowIndex][i]) {
                    setRevealedBoxes(i);

                    // Start the flip animation with completion callback
                    Animated.timing(flipAnimations[rowIndex][i], {
                        toValue: 1,
                        duration: 500, // Slightly longer for smoother animation
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic) // Smoother easing
                    }).start();

                    // Wait for animation to complete before proceeding to next box
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Ensure all boxes are revealed
            setRevealedBoxes(4); // Set to the last box index to ensure all are shown

            // Add a short delay before resolving
            setTimeout(() => {
                resolve();
            }, 100);
        });
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

                // Load both completed and non-completed games to show state
                setGuesses(gameState.guesses);
                setCurrentRow(gameState.currentRow);
                setCurrentVerse(gameState.currentVerse);
                setGameCompleted(gameState.gameCompleted);
                setIsLoading(false);

                // If the game was completed, make sure to reveal all boxes
                // This is important to ensure completed games show their colors
                if (gameState.gameCompleted) {
                    // A short timeout to ensure animations are properly initialized
                    setTimeout(() => {
                        // Forcing all boxes to show their colors by setting each row's state
                        for (let i = 0; i <= gameState.currentRow; i++) {
                            if (i < gameState.currentRow) {
                                // For previously completed rows, just make sure they have coloring
                                const rowBoxes = flipAnimations[i];
                                if (rowBoxes) {
                                    rowBoxes.forEach(anim => {
                                        if (anim) anim.setValue(1); // Force to completed state
                                    });
                                }
                            }
                        }
                    }, 100);
                }

                return true;
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

        // Prevent duplicate executions by safeguarding against consecutive guess checks
        if (currentRow >= MAX_GUESSES) {
            console.log("Already processed final row, ignoring duplicate guess check");
            return;
        }

        // Do animation first, then update game state
        revealRow(currentRow).then(() => {
            // Now set game as completed after animation
            if (isCorrect || currentRow === MAX_GUESSES - 1) {
                setGameCompleted(true);
            }

            // Important: Wait a little bit to ensure animations finish completely
            setTimeout(() => {
                // Reset revealedBoxes state to ensure proper final state rendering
                setRevealedBoxes(-1);

                if (isCorrect) {
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
                    return;
                }

                // Check if this was the last guess
                if (currentRow === MAX_GUESSES - 1) {
                    // Increment currentRow immediately to prevent double alerts
                    // This way the condition won't be true if somehow checkGuess is called twice
                    setCurrentRow(currentRow + 1);

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
                    return;
                }

                // Move to next row for non-winning guesses
                setCurrentRow(currentRow + 1);
                setCurrentInputType('chapter');
            }, 200);
        });
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
            </View>

            <Text style={styles.subtitle}>Guess the Bible Reference</Text>

            {/* Wrap grid in a container with proper overflow handling */}
            <View style={styles.gridContainer}>
                <View style={styles.grid}>{renderGrid()}</View>
            </View>

            {/* Always show keyboard unless game is completed */}
            {!gameCompleted && (
                <View style={styles.keyboard}>
                    {[["1", "2", "3", "4", "5"], ["6", "7", "8", "9", "0", "BACKSPACE", "ENTER"]].map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.keyboardRow}>
                            {row.map((key) => {
                                if (key === "ENTER") {
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[styles.keyEnter]}
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
        position: 'relative', // For proper z-index stacking
        overflow: 'hidden', // Prevent content from extending beyond screen
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
    gridContainer: {
        width: '100%',
        overflow: 'visible', // Important - allow animations to extend beyond container
        minHeight: SCREEN_HEIGHT * 0.3, // Ensure enough height for animations
        marginBottom: 20,
        position: 'relative', // Needed for absolute positioning of animations
        zIndex: 5, // Ensure it's above other elements
    },
    grid: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: "row",
        marginBottom: 8,
        justifyContent: "center",
        height: 50, // Fixed height to prevent layout shifts
        alignItems: 'center',
        width: '100%',
        position: 'relative', // For proper child positioning
    },
    bookBox: {
        width: SCREEN_WIDTH * 0.30,
        height: 40,
        margin: 3,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#8b4513",
        backgroundColor: "#fff",
        borderRadius: 4,
        zIndex: 1, // Ensure it renders above other elements
    },
    digitBox: {
        width: 30,
        height: 40,
        margin: 3,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#8b4513",
        backgroundColor: "#fff",
        borderRadius: 4,
        zIndex: 1, // Ensure it renders above other elements
    },
    boxTouchable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative', // For proper child positioning
    },
    bookText: {
        fontSize: 14,
        fontWeight: "700",
        color: '#1a1a1a',
        textAlign: 'center',
        paddingHorizontal: 2,
        // Text should not extend beyond container
        width: '100%',
    },
    digitText: {
        fontSize: 16,
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
        marginTop: 10,
    },
    keyboardRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 5,
        flexWrap: "wrap",
    },
    key: {
        width: 45,
        height: 45,
        margin: 4,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: '#8b4513',
        borderRadius: 4,
        backgroundColor: "#e8d5c4",
    },
    keyEnter: {
        width: 80,
        height: 45,
        margin: 4,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: '#8b4513',
        borderRadius: 4,
        backgroundColor: "#d4b08c",
    },
    keyText: {
        fontSize: 16,
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
    referenceText: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: 'center',
        color: '#2c1810',
        marginTop: 8,
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