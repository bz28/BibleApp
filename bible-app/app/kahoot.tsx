import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from "react-native";
import { initDatabase, getRandomSpeaker } from './database/database';
import { Speaker } from './database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get("window").width;

// Update the color scheme with a more appealing first color
const ANSWER_COLORS = {
    option1: '#5e3023', // Deep burgundy/mahogany (now first)
    option2: '#8b4513', // Dark brown (now second)
    option3: '#a67c52', // Medium brown
    option4: '#d4b08c', // Light brown
};

export default function Kahoot() {
    const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number>(5);
    const [timerActive, setTimerActive] = useState<boolean>(false);

    // New states for feedback
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [feedbackTimeout, setFeedbackTimeout] = useState<NodeJS.Timeout | null>(null);



    // Use a ref instead of state for the animation
    const timerAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);
    const [timerWidth] = useState(new Animated.Value(1));


    // Add a new state to track when the screen should be frozen
    const [screenFrozen, setScreenFrozen] = useState(false);

    // Add a state to track if we should show the timer
    const [showTimer, setShowTimer] = useState(true);

    useEffect(() => {
        setupGame();

        // Clear any existing timeout when component unmounts
        return () => {
            if (feedbackTimeout) {
                clearTimeout(feedbackTimeout);
            }
            if (timerAnimationRef.current) {
                timerAnimationRef.current.stop();
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
        setShowFeedback(false);

        // Reset the timer width to full without animation
        timerWidth.setValue(1);

        // Show the timer again
        setShowTimer(true);

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

        // Add a small delay before starting the timer to ensure UI is ready
        setTimeout(() => {
            startTimer();
        }, 100);
    };

    const startTimer = () => {
        setTimeLeft(5);
        setTimerActive(true);

        // Reset the timer width to full
        timerWidth.setValue(1);

        // Cancel any existing animation
        if (timerAnimationRef.current) {
            timerAnimationRef.current.stop();
        }

        // Create a new animation
        const animation = Animated.timing(timerWidth, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: false,
        });

        // Store the animation reference
        timerAnimationRef.current = animation;

        // Start the animation
        animation.start(({ finished }) => {
            if (finished && timerActive) {
                handleTimeout();
            }
        });
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

        // Hide the timer
        setShowTimer(false);

        // Clear the animation reference
        timerAnimationRef.current = null;

        // Update the UI state
        setShowFeedback(true);
        setTimerActive(false);
        setIsCorrect(false);

        // Set a timeout to move to the next question
        const timeout = setTimeout(() => {
            loadNewQuestion();
        }, 2000);

        setFeedbackTimeout(timeout);
    };

    const handleAnswer = (selectedAnswer: string) => {
        // First, hide the timer completely
        setShowTimer(false);

        // Stop the timer animation
        if (timerAnimationRef.current) {
            timerAnimationRef.current.stop();
            timerAnimationRef.current = null;
        }

        // Update the UI state
        setShowFeedback(true);
        setTimerActive(false);

        if (!currentSpeaker) return;

        const correct = selectedAnswer === currentSpeaker.answer;
        setIsCorrect(correct);

        if (correct) {
            setScore(prev => prev + 1);
        }

        // Set a timeout to move to the next question
        const timeout = setTimeout(() => {
            loadNewQuestion();
        }, 4000);

        setFeedbackTimeout(timeout);
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
            {/* Add a transparent overlay when the screen is frozen */}
            {screenFrozen && (
                <View style={styles.frozenOverlay} />
            )}

            <View style={styles.topSection}>
                <Text style={styles.title}>Scripture Quiz</Text>
                <View style={styles.timerContainer}>
                    {showTimer && (
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
                    )}
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

                {/* Add a feedback placeholder that's always there */}
                <View style={styles.feedbackPlaceholder}>
                    {showFeedback && (
                        <View style={[
                            styles.feedbackContainer,
                            isCorrect ? styles.correctFeedback : styles.incorrectFeedback
                        ]}>
                            <Text style={styles.feedbackText}>
                                {isCorrect ? 'Correct!' : `Incorrect! The answer was ${correctAnswer}`}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.bottomSection}>
                <View style={styles.grid}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.box,
                                { backgroundColor: Object.values(ANSWER_COLORS)[index] },
                                showFeedback && option === correctAnswer && styles.correctAnswerBox,
                                showFeedback && option !== correctAnswer && styles.disabledBox
                            ]}
                            onPress={() => !showFeedback && handleAnswer(option)}
                            disabled={showFeedback}
                        >
                            <View style={styles.answerContainer}>
                                <Text
                                    style={styles.boxText}
                                    numberOfLines={2}
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
        backgroundColor: "#f5e6d3", // Parchment background
        paddingBottom: 10,
    },
    topSection: {
        padding: 10,
        alignItems: 'center',
        height: '20%',
    },
    title: {
        fontSize: 28,
        fontWeight: "900",
        color: '#2c1810',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    middleSection: {
        height: 'auto',
        justifyContent: 'center',
        paddingHorizontal: 15,
        backgroundColor: 'rgba(139, 69, 19, 0.08)',
        margin: 8,
        borderRadius: 15,
        paddingVertical: 15,
        marginBottom: 10,
    },
    bottomSection: {
        height: '35%',
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    scoreContainer: {
        backgroundColor: '#8b4513',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    scoreLabel: {
        color: '#e8d5c4',
        fontSize: 12,
        fontWeight: "800",
        textAlign: 'center',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    scoreValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: "900",
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    verse: {
        textAlign: 'center',
        padding: 15,
        backgroundColor: '#d4b08c',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#8b4513',
        color: '#2c1810',
        fontWeight: "600",
        fontSize: 18,
        minHeight: 150,
        maxHeight: 200,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
        marginHorizontal: 5,
        borderStyle: 'solid',
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    grid: {
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        width: '100%',
    },
    box: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#2c1810',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
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
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    timerContainer: {
        width: '100%',
        height: 10,
        backgroundColor: '#e8d5c4',
        borderRadius: 5,
        marginVertical: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#8b4513',
    },
    timerBar: {
        height: '100%',
        backgroundColor: '#8b4513',
        borderRadius: 5,
    },
    // Feedback styles
    feedbackPlaceholder: {
        height: 60,
        justifyContent: 'center',
        marginTop: 10,
    },
    feedbackContainer: {
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    correctFeedback: {
        backgroundColor: 'rgba(139, 69, 19, 0.9)', // Brown with opacity
        borderColor: '#d4b08c',
    },
    incorrectFeedback: {
        backgroundColor: 'rgba(169, 68, 66, 0.9)', // Reddish brown with opacity
        borderColor: '#e8d5c4',
    },
    feedbackText: {
        color: 'white',
        fontSize: 18,
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
    },
    frozenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 100, // Above everything else
    },
});
