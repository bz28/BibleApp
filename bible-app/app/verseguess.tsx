import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { initDatabase, getRandomVerse } from './database/database';
import { Verse } from './database/schema';
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
    'Genesis': 50,
    'Exodus': 40,
    'Leviticus': 27,
    'Numbers': 36,
    'Deuteronomy': 34,
    'Joshua': 24,
    'Judges': 21,
    'Ruth': 4,
    'Matthew': 28,
    'Mark': 16,
    'Luke': 24,
    'John': 21,
    'Acts': 28,
    'Romans': 16,
    // Add more as needed
};

// Define proper types for the verses per chapter object
const VERSES_PER_CHAPTER: Record<string, number> = {
    'Genesis:1': 31,
    'Genesis:2': 25,
    'Genesis:3': 24,
    'John:3': 36,
    // Add more as needed
};

// Sample verse references
const SAMPLE_VERSES = [
    { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: { book: "John", chapter: 3, verse: 16 } },
    { text: "In the beginning God created the heavens and the earth.", reference: { book: "Genesis", chapter: 1, verse: 1 } },
    { text: "The Lord is my shepherd, I lack nothing.", reference: { book: "Psalms", chapter: 23, verse: 1 } },
    // Add more verses
];

interface GuessResult {
    verseText: string;
    actualReference: { book: string; chapter: number; verse: number };
    guessedReference: { book: string; chapter: number; verse: number };
    score: number;
}

export default function VerseGuess() {
    const [currentRound, setCurrentRound] = useState(0);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [currentVerse, setCurrentVerse] = useState('');
    const [actualReference, setActualReference] = useState({ book: '', chapter: 0, verse: 0 });
    const [selectedBook, setSelectedBook] = useState('Genesis');
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [selectedVerse, setSelectedVerse] = useState(1);
    const [totalScore, setTotalScore] = useState(0);
    const [results, setResults] = useState<GuessResult[]>([]);

    const [showBookModal, setShowBookModal] = useState(false);
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [showVerseModal, setShowVerseModal] = useState(false);

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
            // Get a random verse from the database
            const verse = await getRandomVerse();

            // Extract book, chapter, verse from the hint
            // For now, we'll use sample data since we need to implement a proper reference system
            const randomIndex = Math.floor(Math.random() * SAMPLE_VERSES.length);
            const sampleVerse = SAMPLE_VERSES[randomIndex];

            setCurrentVerse(verse.hint);
            setActualReference(sampleVerse.reference); // This would need to be extracted from verse data

            // Reset selections
            setSelectedBook('Genesis');
            setSelectedChapter(1);
            setSelectedVerse(1);
        } catch (error) {
            console.error('Error loading verse:', error);
            Alert.alert('Error', 'Failed to load verse');
        }
    };

    const handleSubmitGuess = () => {
        // Calculate score
        const bookScore = calculateBookScore(selectedBook, actualReference.book);
        const chapterScore = calculateChapterScore(selectedChapter, actualReference.chapter);
        const verseScore = calculateVerseScore(selectedVerse, actualReference.verse);

        const roundScore = bookScore + chapterScore + verseScore;
        setTotalScore(totalScore + roundScore);

        // Save result
        const result: GuessResult = {
            verseText: currentVerse,
            actualReference,
            guessedReference: { book: selectedBook, chapter: selectedChapter, verse: selectedVerse },
            score: roundScore
        };

        setResults([...results, result]);

        // Show result
        Alert.alert(
            `Round ${currentRound + 1} Results`,
            `Your guess: ${selectedBook} ${selectedChapter}:${selectedVerse}\n` +
            `Actual reference: ${actualReference.book} ${actualReference.chapter}:${actualReference.verse}\n` +
            `Score: ${roundScore}/100`,
            [{ text: 'Continue', onPress: handleNextRound }]
        );
    };

    const handleNextRound = () => {
        const nextRound = currentRound + 1;
        if (nextRound >= 3) {
            setGameCompleted(true);
            Alert.alert(
                'Game Completed!',
                `Your total score: ${totalScore}/300`,
                [
                    { text: 'View Results', onPress: () => { } },
                    { text: 'Play Again', onPress: resetGame },
                    { text: 'Play More (Premium)', onPress: showPremiumModal }
                ]
            );
        } else {
            setCurrentRound(nextRound);
            loadNewVerse();
        }
    };

    const resetGame = () => {
        setCurrentRound(0);
        setTotalScore(0);
        setResults([]);
        setGameCompleted(false);
        loadNewVerse();
    };

    const showPremiumModal = () => {
        Alert.alert(
            'Premium Feature',
            'This feature is available in the premium version.',
            [{ text: 'OK', onPress: () => { } }]
        );
    };

    const calculateBookScore = (guessed: string, actual: string) => {
        // Book guessing is worth 70 points
        if (guessed === actual) return 70;

        const guessedIndex = BIBLE_BOOKS.indexOf(guessed);
        const actualIndex = BIBLE_BOOKS.indexOf(actual);
        const distance = Math.abs(guessedIndex - actualIndex);

        // Deduct 10 points per book distance, but never below 0
        return Math.max(0, 70 - (distance * 10));
    };

    const calculateChapterScore = (guessed: number, actual: number) => {
        // Chapter guessing is worth 20 points
        if (guessed === actual) return 20;

        const distance = Math.abs(guessed - actual);
        // Deduct 1 point per chapter distance, but never below 0
        return Math.max(0, 20 - distance);
    };

    const calculateVerseScore = (guessed: number, actual: number) => {
        // Verse guessing is worth 10 points
        if (guessed === actual) return 10;

        const distance = Math.abs(guessed - actual);
        // Deduct 1 point per verse distance, but never below 0
        return Math.max(0, 10 - distance);
    };

    const getAvailableChapters = () => {
        const maxChapters = BIBLE_CHAPTERS[selectedBook] || 150;
        return Array.from({ length: maxChapters }, (_, i) => i + 1);
    };

    const getAvailableVerses = () => {
        const key = `${selectedBook}:${selectedChapter}`;
        const maxVerses = VERSES_PER_CHAPTER[key] || 30; // Default to 30 if unknown
        return Array.from({ length: maxVerses }, (_, i) => i + 1);
    };

    const selectBook = (book: string) => {
        setSelectedBook(book);
        setShowBookModal(false);

        // Reset chapter and verse if they're out of range for the new book
        const maxChapters = BIBLE_CHAPTERS[book] || 150;
        if (selectedChapter > maxChapters) {
            setSelectedChapter(1);
        }

        const key = `${book}:${selectedChapter}`;
        const maxVerses = VERSES_PER_CHAPTER[key] || 30;
        if (selectedVerse > maxVerses) {
            setSelectedVerse(1);
        }
    };

    const selectChapter = (chapter: number) => {
        setSelectedChapter(chapter);
        setShowChapterModal(false);

        // Reset verse if it's out of range for the new chapter
        const key = `${selectedBook}:${chapter}`;
        const maxVerses = VERSES_PER_CHAPTER[key] || 30;
        if (selectedVerse > maxVerses) {
            setSelectedVerse(1);
        }
    };

    const selectVerse = (verse: number) => {
        setSelectedVerse(verse);
        setShowVerseModal(false);
    };

    const shareResults = () => {
        // This would use Share API in a real implementation
        Alert.alert('Share', 'Sharing functionality would go here');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bible Verse Guess</Text>

            <Text style={styles.roundText}>Round {currentRound + 1}/3</Text>
            <Text style={styles.scoreText}>Score: {totalScore}</Text>

            <ScrollView style={styles.verseContainer}>
                <Text style={styles.verseText}>{currentVerse}</Text>
            </ScrollView>

            <View style={styles.guessContainer}>
                <Text style={styles.guessHeader}>Guess the Reference:</Text>

                <View style={styles.referenceSelectors}>
                    <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowBookModal(true)}
                    >
                        <Text style={styles.selectorLabel}>Book</Text>
                        <Text style={styles.selectorValue}>{selectedBook}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowChapterModal(true)}
                    >
                        <Text style={styles.selectorLabel}>Chapter</Text>
                        <Text style={styles.selectorValue}>{selectedChapter}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowVerseModal(true)}
                    >
                        <Text style={styles.selectorLabel}>Verse</Text>
                        <Text style={styles.selectorValue}>{selectedVerse}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmitGuess}
                    disabled={gameCompleted}
                >
                    <Text style={styles.submitButtonText}>Submit Guess</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomButtons}>
                <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => Alert.alert('History', 'History view would go here')}
                >
                    <Text style={styles.buttonText}>History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={shareResults}
                >
                    <Text style={styles.buttonText}>Share</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f5e6d3",
    },
    title: {
        fontSize: 28,
        fontWeight: "900",
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c1810',
    },
    roundText: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 5,
        color: '#2c1810',
    },
    scoreText: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 20,
        color: '#2c1810',
    },
    verseContainer: {
        padding: 15,
        backgroundColor: '#e8d5c4',
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
        backgroundColor: '#d4b08c',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#8b4513',
        alignItems: 'center',
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
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: "700",
    },
    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    historyButton: {
        backgroundColor: '#d4b08c',
        padding: 12,
        borderRadius: 8,
        width: '48%',
        alignItems: 'center',
    },
    shareButton: {
        backgroundColor: '#d4b08c',
        padding: 12,
        borderRadius: 8,
        width: '48%',
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
}); 