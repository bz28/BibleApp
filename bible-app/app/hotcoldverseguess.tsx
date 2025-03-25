import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { initDatabase, getRandomVerseReference, getVerseReferenceById } from './database/database';
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

// Define proper types for the Bible chapters object
const BIBLE_CHAPTERS: Record<string, number> = {
    'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
    'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
    'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150,
    'Proverbs': 31, 'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66,
    'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14,
    'Joel': 3, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3,
    'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
    'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28, 'Romans': 16,
    '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
    'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
    '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
    'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
    '3 John': 1, 'Jude': 1, 'Revelation': 22
};

// Common verse counts for chapters (simplified for this example)
const COMMON_VERSE_COUNTS: Record<number, number> = {
    1: 31, 2: 25, 3: 24, 4: 26, 5: 32, 6: 22, 7: 24, 8: 22, 9: 29, 10: 32,
    11: 32, 12: 20, 13: 18, 14: 24, 15: 21, 16: 16, 17: 27, 18: 33, 19: 38, 20: 18,
    21: 34, 22: 24, 23: 20, 24: 67, 25: 34, 26: 35, 27: 46, 28: 22, 29: 35, 30: 43,
    31: 55, 32: 32, 33: 20, 34: 31, 35: 29, 36: 43, 37: 36, 38: 30, 39: 23, 40: 23,
    41: 57, 42: 38, 43: 34, 44: 34, 45: 28, 46: 34, 47: 31, 48: 22, 49: 33, 50: 26
};

// Special cases for specific books and chapters
const SPECIAL_VERSE_COUNTS: Record<string, Record<number, number>> = {
    'Psalms': {
        117: 2,  // Psalm 117 has only 2 verses
        119: 176, // Psalm 119 has 176 verses
    },
    'John': {
        3: 36,  // John 3 has 36 verses
    }
};

interface GuessResult {
    verseText: string;
    actualReference: VerseReference;
    guessedReference: { book: string; chapter: number; verse: number; id?: number };
    distance: number;
}

export default function HotColdVerseGuess() {
    const [currentVerse, setCurrentVerse] = useState('');
    const [actualReference, setActualReference] = useState<VerseReference | null>(null);
    const [selectedBook, setSelectedBook] = useState('Genesis');
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [selectedVerse, setSelectedVerse] = useState(1);
    const [attempts, setAttempts] = useState(0);
    const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
    const [gameWon, setGameWon] = useState(false);

    const [showBookModal, setShowBookModal] = useState(false);
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [showVerseModal, setShowVerseModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // New state to track if book has been selected
    const [bookSelected, setBookSelected] = useState(false);
    // New state to track if chapter has been selected
    const [chapterSelected, setChapterSelected] = useState(false);
    // New state to track the current temperature (0-100, where 100 is hottest/closest)
    const [temperature, setTemperature] = useState(0);

    useEffect(() => {
        initGame();
    }, []);

    const initGame = async () => {
        try {
            await initDatabase();
            await loadNewVerse();
        } catch (error) {
            console.error('Error initializing game:', error);
            Alert.alert('Error', 'Failed to load game data');
        }
    };

    const loadNewVerse = async () => {
        try {
            // Get a random verse reference from the database
            const reference = await getRandomVerseReference();

            setCurrentVerse(reference.text);
            setActualReference(reference);

            // Reset selections
            setSelectedBook('Genesis');
            setSelectedChapter(1);
            setSelectedVerse(1);
            setBookSelected(false);
            setChapterSelected(false);
            setAttempts(0);
            setGuessHistory([]);
            setGameWon(false);
            setTemperature(0);
        } catch (error) {
            console.error('Error loading verse:', error);
            Alert.alert('Error', 'Failed to load verse');
        }
    };

    const handleSubmitGuess = () => {
        if (!actualReference) return;

        // Calculate distance using verse IDs
        const distance = calculateDistance(
            selectedBook,
            selectedChapter,
            selectedVerse,
            actualReference
        );

        // Calculate temperature (0-100) where 100 is hottest/closest
        const newTemperature = calculateTemperature(distance);
        setTemperature(newTemperature);

        // Save result
        const result: GuessResult = {
            verseText: currentVerse,
            actualReference,
            guessedReference: { book: selectedBook, chapter: selectedChapter, verse: selectedVerse },
            distance
        };

        setGuessHistory([result, ...guessHistory]);
        setAttempts(attempts + 1);

        // Check if guess is correct
        if (distance === 0) {
            setGameWon(true);
            Alert.alert(
                'Congratulations!',
                `You found the verse in ${attempts + 1} attempts!\n` +
                `${actualReference.book} ${actualReference.chapter}:${actualReference.verse}`,
                [
                    { text: 'Play Again', onPress: resetGame },
                    { text: 'View History', onPress: () => setShowHistoryModal(true) }
                ]
            );
        }
    };

    const resetGame = () => {
        setAttempts(0);
        setGuessHistory([]);
        setGameWon(false);
        setBookSelected(false);
        setChapterSelected(false);
        setTemperature(0);
        loadNewVerse();
    };

    const calculateDistance = (
        guessedBook: string,
        guessedChapter: number,
        guessedVerse: number,
        actualReference: VerseReference
    ) => {
        // If the guess matches exactly, distance is 0
        if (
            guessedBook === actualReference.book &&
            guessedChapter === actualReference.chapter &&
            guessedVerse === actualReference.verse
        ) {
            return 0;
        }

        // Calculate book distance (weighted more heavily)
        const bookDistance = calculateBookDistance(guessedBook, actualReference.book) * 5;

        // Calculate chapter and verse distances
        const chapterDistance = Math.abs(guessedChapter - actualReference.chapter) * 2;
        const verseDistance = Math.abs(guessedVerse - actualReference.verse);

        // For a more accurate distance, we could use the verse ID
        // This would require mapping the guessed book/chapter/verse to an ID
        // For now, we'll use the component distances

        return bookDistance + chapterDistance + verseDistance;
    };

    const calculateBookDistance = (guessedBook: string, actualBook: string) => {
        const guessedIndex = BIBLE_BOOKS.indexOf(guessedBook);
        const actualIndex = BIBLE_BOOKS.indexOf(actualBook);
        return Math.abs(guessedIndex - actualIndex);
    };

    const calculateTemperature = (distance: number) => {
        // Max reasonable distance (arbitrary value that represents "very cold")
        const maxDistance = 400;

        // Convert distance to temperature (0-100)
        // 0 distance = 100 temperature (hottest)
        // maxDistance or more = 0 temperature (coldest)
        return Math.max(0, 100 - (distance / maxDistance * 100));
    };

    const getTemperatureColor = () => {
        // Convert temperature (0-100) to a color between blue (cold) and red (hot)
        // Using HSL: hue 240 (blue) to 0 (red)
        const hue = 240 - (temperature * 2.4); // 240 (blue) to 0 (red)
        return `hsl(${hue}, 80%, 85%)`;
    };

    const getTemperatureText = () => {
        if (temperature >= 95) return "Burning Hot!";
        if (temperature >= 80) return "Very Hot";
        if (temperature >= 60) return "Hot";
        if (temperature >= 40) return "Warm";
        if (temperature >= 20) return "Cool";
        if (temperature >= 10) return "Cold";
        return "Freezing Cold";
    };

    const getAvailableChapters = () => {
        const maxChapters = BIBLE_CHAPTERS[selectedBook] || 150;
        return Array.from({ length: maxChapters }, (_, i) => i + 1);
    };

    const getAvailableVerses = () => {
        // Check if there's a special case for this book and chapter
        if (SPECIAL_VERSE_COUNTS[selectedBook] &&
            SPECIAL_VERSE_COUNTS[selectedBook][selectedChapter]) {
            const verseCount = SPECIAL_VERSE_COUNTS[selectedBook][selectedChapter];
            return Array.from({ length: verseCount }, (_, i) => i + 1);
        }

        // Otherwise use the common verse counts or default to 30
        const verseCount = COMMON_VERSE_COUNTS[selectedChapter] || 30;
        return Array.from({ length: verseCount }, (_, i) => i + 1);
    };

    const selectBook = (book: string) => {
        setSelectedBook(book);
        setShowBookModal(false);
        setBookSelected(true);

        // Reset chapter and verse
        setSelectedChapter(1);
        setSelectedVerse(1);
        setChapterSelected(false);
    };

    const selectChapter = (chapter: number) => {
        setSelectedChapter(chapter);
        setShowChapterModal(false);
        setChapterSelected(true);

        // Reset verse
        setSelectedVerse(1);
    };

    const selectVerse = (verse: number) => {
        setSelectedVerse(verse);
        setShowVerseModal(false);
    };

    const handleGiveUp = () => {
        if (!actualReference) return;

        setGameWon(true);
        Alert.alert(
            'Answer Revealed',
            `The verse was:\n${actualReference.book} ${actualReference.chapter}:${actualReference.verse}\n\n"${actualReference.text}"`,
            [
                { text: 'New Game', onPress: resetGame },
                { text: 'Close', onPress: () => { } }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: getTemperatureColor() }]}>
            <Text style={styles.title}>Hot & Cold Verse Guess</Text>

            <Text style={styles.attemptsText}>Attempts: {attempts}</Text>
            <Text style={styles.temperatureText}>{getTemperatureText()}</Text>

            <ScrollView style={styles.verseContainer}>
                <Text style={styles.verseText}>{currentVerse}</Text>
            </ScrollView>

            <View style={styles.guessContainer}>
                <Text style={styles.guessHeader}>Guess the Reference:</Text>

                <View style={styles.referenceSelectors}>
                    <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowBookModal(true)}
                        disabled={gameWon}
                    >
                        <Text style={styles.selectorLabel}>Book</Text>
                        <Text style={styles.selectorValue}>{selectedBook}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.selectorButton,
                            !bookSelected && styles.disabledButton
                        ]}
                        onPress={() => bookSelected && setShowChapterModal(true)}
                        disabled={!bookSelected || gameWon}
                    >
                        <Text style={styles.selectorLabel}>Chapter</Text>
                        <Text style={[
                            styles.selectorValue,
                            !bookSelected && styles.disabledText
                        ]}>
                            {selectedChapter}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.selectorButton,
                            (!bookSelected || !chapterSelected) && styles.disabledButton
                        ]}
                        onPress={() => bookSelected && chapterSelected && setShowVerseModal(true)}
                        disabled={!bookSelected || !chapterSelected || gameWon}
                    >
                        <Text style={styles.selectorLabel}>Verse</Text>
                        <Text style={[
                            styles.selectorValue,
                            (!bookSelected || !chapterSelected) && styles.disabledText
                        ]}>
                            {selectedVerse}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!bookSelected || !chapterSelected || gameWon) && styles.disabledSubmitButton
                    ]}
                    onPress={handleSubmitGuess}
                    disabled={!bookSelected || !chapterSelected || gameWon}
                >
                    <Text style={styles.submitButtonText}>Submit Guess</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomButtons}>
                <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => setShowHistoryModal(true)}
                >
                    <Text style={styles.buttonText}>History ({guessHistory.length})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.giveUpButton}
                    onPress={handleGiveUp}
                >
                    <Text style={styles.buttonText}>Give Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.newGameButton}
                    onPress={resetGame}
                >
                    <Text style={styles.buttonText}>New Game</Text>
                </TouchableOpacity>
            </View>

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

            {/* Chapter Selection Modal */}
            <Modal
                visible={showChapterModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Chapter</Text>
                        <FlatList
                            data={getAvailableChapters()}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => selectChapter(item)}
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
                            onPress={() => setShowChapterModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Verse Selection Modal */}
            <Modal
                visible={showVerseModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Verse</Text>
                        <FlatList
                            data={getAvailableVerses()}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => selectVerse(item)}
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
                            onPress={() => setShowVerseModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* History Modal */}
            <Modal
                visible={showHistoryModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, styles.historyModalContent]}>
                        <Text style={styles.modalTitle}>Guess History</Text>
                        {guessHistory.length > 0 ? (
                            <FlatList
                                data={guessHistory}
                                keyExtractor={(_, index) => index.toString()}
                                renderItem={({ item, index }) => (
                                    <View style={styles.historyItem}>
                                        <Text style={styles.historyItemTitle}>Attempt {attempts - index}</Text>
                                        <Text style={styles.historyItemText}>
                                            Guessed: {item.guessedReference.book} {item.guessedReference.chapter}:{item.guessedReference.verse}
                                        </Text>
                                        <Text style={styles.historyItemText}>
                                            Distance: {item.distance} verses away
                                        </Text>
                                        <Text style={[
                                            styles.historyItemTemperature,
                                            { color: `hsl(${240 - (calculateTemperature(item.distance) * 2.4)}, 80%, 40%)` }
                                        ]}>
                                            {calculateTemperature(item.distance) >= 95 ? "Burning Hot!" :
                                                calculateTemperature(item.distance) >= 80 ? "Very Hot" :
                                                    calculateTemperature(item.distance) >= 60 ? "Hot" :
                                                        calculateTemperature(item.distance) >= 40 ? "Warm" :
                                                            calculateTemperature(item.distance) >= 20 ? "Cool" :
                                                                calculateTemperature(item.distance) >= 10 ? "Cold" : "Freezing Cold"}
                                        </Text>
                                    </View>
                                )}
                                style={styles.modalList}
                                showsVerticalScrollIndicator={true}
                            />
                        ) : (
                            <Text style={styles.noHistoryText}>No guesses yet</Text>
                        )}
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowHistoryModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
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
        padding: 20,
        // Background color will be dynamically set based on temperature
    },
    title: {
        fontSize: 28,
        fontWeight: "900",
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c1810',
    },
    attemptsText: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 5,
        color: '#2c1810',
    },
    temperatureText: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 20,
        color: '#2c1810',
        textAlign: 'center',
    },
    verseContainer: {
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 8,
        marginBottom: 20,
        maxHeight: 200,
        borderWidth: 2,
        borderColor: '#8b4513',
    },
    verseText: {
        fontSize: 18,
        lineHeight: 26,
        color: '#2c1810',
    },
    guessContainer: {
        marginBottom: 20,
    },
    guessHeader: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 10,
        color: '#2c1810',
    },
    referenceSelectors: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    selectorButton: {
        width: '30%',
        padding: 10,
        backgroundColor: 'rgba(212, 176, 140, 0.8)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#8b4513',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: 'rgba(232, 213, 196, 0.8)',
        borderColor: '#d4b08c',
        opacity: 0.7,
    },
    disabledText: {
        color: '#8b8b8b',
    },
    selectorLabel: {
        fontSize: 14,
        color: '#2c1810',
        marginBottom: 5,
    },
    selectorValue: {
        fontSize: 16,
        fontWeight: "700",
        color: '#2c1810',
    },
    submitButton: {
        backgroundColor: '#8b4513',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledSubmitButton: {
        backgroundColor: '#a98267',
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: "700",
    },
    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
        flexWrap: 'wrap',
        gap: 10,
    },
    historyButton: {
        backgroundColor: 'rgba(212, 176, 140, 0.8)',
        padding: 12,
        borderRadius: 8,
        width: '30%',
        alignItems: 'center',
    },
    giveUpButton: {
        backgroundColor: 'rgba(169, 68, 66, 0.8)', // Reddish color
        padding: 12,
        borderRadius: 8,
        width: '30%',
        alignItems: 'center',
    },
    newGameButton: {
        backgroundColor: 'rgba(212, 176, 140, 0.8)',
        padding: 12,
        borderRadius: 8,
        width: '30%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#2c1810',
        fontSize: 16,
        fontWeight: "600",
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
    historyModalContent: {
        maxHeight: '70%',
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
    historyItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#d4b08c',
    },
    historyItemTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: '#2c1810',
        marginBottom: 5,
    },
    historyItemText: {
        fontSize: 14,
        color: '#2c1810',
        marginBottom: 3,
    },
    historyItemTemperature: {
        fontSize: 16,
        fontWeight: "700",
        // Color will be set dynamically
    },
    noHistoryText: {
        fontSize: 16,
        color: '#2c1810',
        textAlign: 'center',
        padding: 20,
    },
}); 