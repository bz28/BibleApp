import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from "react-native";
import { initDatabase, getRandomSpeaker } from './database/database';
import { Speaker } from './database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get("window").width;

const KAHOOT_COLORS = {
    red: '#e21b3c',
    blue: '#1368ce',
    yellow: '#d89e00',
    green: '#26890c',
};

export default function Kahoot() {
    const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number>(5);
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [timerWidth] = useState(new Animated.Value(1));

    // New states for feedback
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [feedbackTimeout, setFeedbackTimeout] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setupGame();

        // Clear any existing timeout when component unmounts
        return () => {
            if (feedbackTimeout) {
                clearTimeout(feedbackTimeout);
            }
        };
    }, []);

    const setupGame = async () => {
        try {
            await initDatabase();
            await loadNewQuestion();
        } catch (error) {
            console.error('Error setting up game:', error);
        }
    };

    const loadNewQuestion = async () => {
        setIsLoading(true);
        setTimerActive(false);
        timerWidth.setValue(1);
        setShowFeedback(false);

        const speaker = await getRandomSpeaker();
        setCurrentSpeaker(speaker);
        setCorrectAnswer(speaker.answer);

        // Generate 3 random wrong answers
        const allPossibleAnswers = ['Jesus', 'Peter', 'Paul', 'David', 'Moses', 'Abraham',
            'Solomon', 'Job', 'Isaiah', 'Jeremiah', 'Daniel', 'Joseph',
            'Samuel', 'Elijah', 'Joshua', 'Ruth', 'Esther', 'Mary'];

        let wrongAnswers = allPossibleAnswers
            .filter(answer => answer !== speaker.answer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const allOptions = [...wrongAnswers, speaker.answer]
            .sort(() => Math.random() - 0.5);

        setOptions(allOptions);
        setIsLoading(false);

        setTimeout(() => {
            startTimer();
        }, 100);
    };

    const startTimer = () => {
        setTimeLeft(5);
        setTimerActive(true);
        Animated.timing(timerWidth, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: false,
        }).start();
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleTimeout();
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    const handleTimeout = () => {
        if (!currentSpeaker || !timerActive) return;

        setTimerActive(false);
        setIsCorrect(false);
        setShowFeedback(true);

        // Set a timeout to move to the next question after showing feedback
        const timeout = setTimeout(() => {
            loadNewQuestion();
        }, 2000);

        setFeedbackTimeout(timeout);
    };

    const handleAnswer = (selectedAnswer: string) => {
        setTimerActive(false);
        if (!currentSpeaker) return;

        const correct = selectedAnswer === currentSpeaker.answer;
        setIsCorrect(correct);
        setShowFeedback(true);

        if (correct) {
            setScore(prev => prev + 1);
        }

        // Set a timeout to move to the next question after showing feedback
        const timeout = setTimeout(() => {
            loadNewQuestion();
        }, 2000);

        setFeedbackTimeout(timeout);
    };

    const getFontSize = (text: string) => {
        const length = text.length;
        if (length > 30) return 14;
        if (length > 20) return 16;
        return 18;
    };

    const getVerseFontSize = (text: string) => {
        const length = text.length;
        if (length > 200) return 16;
        if (length > 150) return 18;
        if (length > 100) return 20;
        return 22;
    };

    if (isLoading || !currentSpeaker) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topSection}>
                <Text style={styles.title}>Bible Kahoot</Text>
                <View style={styles.timerContainer}>
                    <Animated.View
                        style={[
                            styles.timerBar,
                            {
                                width: timerWidth.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreLabel}>SCORE</Text>
                    <Text style={styles.scoreValue}>{score}</Text>
                </View>
            </View>

            <View style={styles.middleSection}>
                <Text
                    style={[
                        styles.verse,
                        { fontSize: getVerseFontSize(currentSpeaker.hint) }
                    ]}
                    numberOfLines={4}
                >
                    {currentSpeaker.hint}
                </Text>
            </View>

            {showFeedback && (
                <View style={[styles.feedbackContainer, isCorrect ? styles.correctFeedback : styles.incorrectFeedback]}>
                    <Text style={styles.feedbackText}>
                        {isCorrect ? 'Correct!' : `Incorrect! The answer was ${correctAnswer}`}
                    </Text>
                </View>
            )}

            <View style={styles.bottomSection}>
                <View style={styles.grid}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.box,
                                { backgroundColor: Object.values(KAHOOT_COLORS)[index] },
                                showFeedback && option === correctAnswer && styles.correctAnswerBox,
                                showFeedback && option !== correctAnswer && styles.disabledBox
                            ]}
                            onPress={() => !showFeedback && handleAnswer(option)}
                            disabled={showFeedback}
                        >
                            {index === 0 && <View style={[styles.shape, styles.triangle]} />}
                            {index === 1 && <View style={[styles.shape, styles.diamond]} />}
                            {index === 2 && <View style={[styles.shape, styles.circle]} />}
                            {index === 3 && <View style={[styles.shape, styles.square]} />}
                            <View style={styles.answerContainer}>
                                <Text
                                    style={styles.boxText}
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.5}
                                >
                                    {option}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5e6d3",
        paddingBottom: 20,
    },
    topSection: {
        padding: 20,
        alignItems: 'center',
        height: '25%',
    },
    title: {
        fontSize: 36,
        fontWeight: "900",
        color: '#2c1810',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    middleSection: {
        height: '35%',
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(139, 69, 19, 0.08)',
        margin: 10,
        borderRadius: 20,
        paddingVertical: 20,
    },
    bottomSection: {
        height: '35%',
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    scoreContainer: {
        backgroundColor: '#8b4513',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 25,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    scoreLabel: {
        color: '#e8d5c4',
        fontSize: 14,
        fontWeight: "800",
        textAlign: 'center',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    scoreValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: "900",
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    verse: {
        textAlign: 'center',
        padding: 25,
        backgroundColor: '#d4b08c',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#8b4513',
        color: '#2c1810',
        fontWeight: "600",
        fontSize: 20,
        minHeight: 200,
        maxHeight: 250,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
        marginHorizontal: 10,
        borderStyle: 'solid',
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        width: '47%',
        aspectRatio: 2,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        padding: 10,
    },
    shape: {
        width: 22,
        height: 22,
        backgroundColor: 'white',
        marginRight: 10,
    },
    answerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 5,
    },
    boxText: {
        color: 'white',
        fontSize: 16,
        fontWeight: "bold",
        textAlign: 'center',
        width: '100%',
        flexWrap: 'wrap',
        lineHeight: 20,
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 12,
        borderRightWidth: 12,
        borderBottomWidth: 24,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'white',
    },
    diamond: {
        transform: [{ rotate: '45deg' }],
    },
    circle: {
        borderRadius: 12,
    },
    square: {
        // default square shape
    },
    timerContainer: {
        width: '100%',
        height: 10,
        backgroundColor: '#e8d5c4',
        borderRadius: 5,
        marginVertical: 10,
        overflow: 'hidden',
    },
    timerBar: {
        height: '100%',
        backgroundColor: '#8b4513',
        borderRadius: 5,
    },
    // New styles for feedback
    feedbackContainer: {
        position: 'absolute',
        top: '50%',
        left: '10%',
        right: '10%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    correctFeedback: {
        backgroundColor: 'rgba(38, 137, 12, 0.9)', // Green with opacity
    },
    incorrectFeedback: {
        backgroundColor: 'rgba(226, 27, 60, 0.9)', // Red with opacity
    },
    feedbackText: {
        color: 'white',
        fontSize: 22,
        fontWeight: "bold",
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    correctAnswerBox: {
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    disabledBox: {
        opacity: 0.6,
    }
});
