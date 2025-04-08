import React, { useState, useEffect, useRef } from "react";
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

    // Add state for intermission countdown
    const [showIntermission, setShowIntermission] = useState(false);
    const [intermissionProgress] = useState(new Animated.Value(0));
    const [intermissionTime, setIntermissionTime] = useState(3); // seconds

    // Add state to track points for current question
    const [currentPoints, setCurrentPoints] = useState(0);

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

    // Add new useEffect for intermission timer
    useEffect(() => {
        if (showIntermission) {
            // Reset the intermission timer
            setIntermissionTime(3);
            intermissionProgress.setValue(0);

            // Start the circular animation
            Animated.timing(intermissionProgress, {
                toValue: 1,
                duration: 3000, // 3 seconds
                useNativeDriver: false,
            }).start();

            // Countdown timer for text display
            const interval = setInterval(() => {
                setIntermissionTime(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [showIntermission]);

    const setupGame = async () => {
        try {
            await initDatabase();
            await loadNewQuestion();
        } catch (error) {
            console.error('Error setting up game:', error);
        }
    };

    const loadNewQuestion = async () => {
        console.log('[DEBUG] Loading new question...');
        setIsLoading(true);
        setTimerActive(false);
        setShowFeedback(false);
        setShowIntermission(false);

        // Reset the timer width to full without animation
        timerWidth.setValue(1);

        // Show the timer again
        setShowTimer(true);

        const speaker = await getRandomSpeaker();
        console.log(`[DEBUG] New verse loaded: "${speaker.hint.substring(0, 30)}..."`);
        console.log(`[DEBUG] Verse full length: ${speaker.hint.length} characters`);

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
        setCurrentPoints(0); // No points for timeout

        // Set a timeout to show intermission after feedback
        setTimeout(() => {
            setShowFeedback(false);
            setShowIntermission(true);
        }, 2000);

        // Set a timeout to move to the next question
        const timeout = setTimeout(() => {
            loadNewQuestion();
        }, 5000); // Give enough time for intermission (2s feedback + 3s intermission)

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

        // Calculate score based on correctness and time
        const correct = selectedAnswer === currentSpeaker.answer;

        let pointsEarned = 0;
        if (correct) {
            // Calculate points based on remaining time
            // Maximum 1000 points when answering immediately (5 seconds left)
            // Minimum 100 points when answering at the last moment
            pointsEarned = Math.round(100 + (900 * (timeLeft / 5)));

            // Update the total score
            setScore(prev => prev + pointsEarned);
        }

        // Store the points earned for this question to display in feedback
        setCurrentPoints(pointsEarned);

        setIsCorrect(correct);

        // Set a timeout to transition to intermission
        setTimeout(() => {
            setShowFeedback(false);
            setShowIntermission(true);
        }, 2000);

        // Set a timeout to move to the next question
        const timeout = setTimeout(() => {
            loadNewQuestion();
        }, 5000); // Give enough time for intermission (2s feedback + 3s intermission)

        setFeedbackTimeout(timeout);
    };

    const getVerseFontSize = (text: string) => {
        const length = text.length;
        console.log(`[DEBUG] Verse length: ${length} characters`);

        let fontSize = 22;
        if (length > 200) fontSize = 16;
        else if (length > 150) fontSize = 18;
        else if (length > 100) fontSize = 20;

        console.log(`[DEBUG] Selected font size: ${fontSize}px`);
        return fontSize;
    };

    const getVerseBoxHeight = (text: string) => {
        const length = text.length;
        console.log(`[DEBUG] Calculating box height for verse with ${length} characters`);

        // Increase all height values to ensure verses aren't cut off
        let height = 100; // Minimum height for very short verses
        if (length > 300) height = 250;
        else if (length > 200) height = 200;
        else if (length > 100) height = 150;
        else if (length > 65) height = 120;

        console.log(`[DEBUG] Selected box height: ${height}px`);
        return height;
    };

    // Render the intermission screen
    const renderIntermission = () => {
        return (
            <View style={styles.intermissionContainer}>
                <Text style={styles.intermissionTitle}>Next Question In</Text>

                <View style={styles.circularProgressContainer}>
                    {/* Simple circular timer using a border approach */}
                    <Animated.View
                        style={[
                            styles.circleBackground,
                            {
                                borderWidth: 12,
                                // As progress increases, we change the color of each border section to create a timer effect
                                borderRightColor: intermissionProgress.interpolate({
                                    inputRange: [0, 0.125, 0.125],
                                    outputRange: ['#8b4513', '#8b4513', '#e8d5c4'],
                                    extrapolate: 'clamp'
                                }),
                                borderBottomColor: intermissionProgress.interpolate({
                                    inputRange: [0, 0.125, 0.375, 0.375],
                                    outputRange: ['#8b4513', '#8b4513', '#8b4513', '#e8d5c4'],
                                    extrapolate: 'clamp'
                                }),
                                borderLeftColor: intermissionProgress.interpolate({
                                    inputRange: [0, 0.375, 0.625, 0.625],
                                    outputRange: ['#8b4513', '#8b4513', '#8b4513', '#e8d5c4'],
                                    extrapolate: 'clamp'
                                }),
                                borderTopColor: intermissionProgress.interpolate({
                                    inputRange: [0, 0.625, 0.875, 0.875],
                                    outputRange: ['#8b4513', '#8b4513', '#8b4513', '#e8d5c4'],
                                    extrapolate: 'clamp'
                                }),
                            }
                        ]}
                    />

                    {/* Inner circle with countdown number */}
                    <View style={styles.circleInner}>
                        <Text style={styles.intermissionTimeText}>{intermissionTime}</Text>
                    </View>
                </View>

                <Text style={styles.intermissionSubtext}>Get ready!</Text>
            </View>
        );
    };

    // Update the feedback text to include points
    const getFeedbackText = () => {
        if (isCorrect) {
            return `Correct! +${currentPoints} points`;
        } else {
            if (currentPoints === 0) {
                return `Incorrect! The answer was ${correctAnswer}`;
            }
            return `Incorrect! The answer was ${correctAnswer}`;
        }
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

            {/* Show intermission screen or regular content */}
            {showIntermission ? (
                renderIntermission()
            ) : (
                <>
                    <View style={styles.middleSection}>
                        <Text
                            style={[
                                styles.verse,
                                {
                                    fontSize: getVerseFontSize(currentSpeaker.hint),
                                    height: getVerseBoxHeight(currentSpeaker.hint)
                                }
                            ]}
                            numberOfLines={6}
                        >
                            {currentSpeaker.hint}
                        </Text>

                        {/* Updated feedback placeholder with points */}
                        <View style={styles.feedbackPlaceholder}>
                            {showFeedback && (
                                <View style={[
                                    styles.feedbackContainer,
                                    isCorrect ? styles.correctFeedback : styles.incorrectFeedback
                                ]}>
                                    <Text style={styles.feedbackText}>
                                        {getFeedbackText()}
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
                                            style={[
                                                styles.boxText,
                                                showFeedback && option === correctAnswer && styles.correctAnswerText
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {option}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </>
            )}
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
        lineHeight: 24,
        flexWrap: 'wrap',
    },
    grid: {
        flexDirection: 'column',
        gap: 12,
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
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 12,
        elevation: 15,
        transform: [{ scale: 1.05 }],
        backgroundColor: '#5e3023',
    },
    correctAnswerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: "900",
        textAlign: 'center',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
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
    // Updated intermission styles
    intermissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 230, 211, 0.95)', // Slightly transparent parchment color
        padding: 20,
    },
    intermissionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#2c1810',
        marginBottom: 20,
        textAlign: 'center',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    intermissionSubtext: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5e3023',
        marginTop: 20,
        textAlign: 'center',
    },
    circularProgressContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginVertical: 20,
    },
    circleBackground: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderColor: '#8b4513', // Brown border - this is what we'll see as the timer starts
        backgroundColor: 'transparent',
        position: 'absolute',
    },
    circleInner: {
        width: 116,
        height: 116,
        borderRadius: 58,
        backgroundColor: '#f5e6d3', // Inner circle color - background for the number
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    intermissionTimeText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#8b4513',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});
