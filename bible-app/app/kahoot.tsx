import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Animated } from "react-native";
import { initDatabase, getRandomVerse } from './database/database';
import { Verse } from './database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get("window").width;

const KAHOOT_COLORS = {
    red: '#e21b3c',
    blue: '#1368ce',
    yellow: '#d89e00',
    green: '#26890c',
};

export default function Kahoot() {
    const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number>(5);
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [timerWidth] = useState(new Animated.Value(1));

    useEffect(() => {
        setupGame();
    }, []);

    const setupGame = async () => {
        try {
            await initDatabase();
            await loadNewQuestion();
        } catch (error) {
            console.error('Error setting up game:', error);
            Alert.alert('Error', 'Failed to load game data');
        }
    };

    const loadNewQuestion = async () => {
        setIsLoading(true);
        setTimerActive(false);
        timerWidth.setValue(1);

        const verse = await getRandomVerse();
        setCurrentVerse(verse);

        // Generate 3 random wrong answers
        const allPossibleAnswers = ['Jesus', 'Peter', 'Paul', 'David', 'Moses', 'Abraham',
            'Solomon', 'Job', 'Isaiah', 'Jeremiah', 'Daniel', 'Joseph',
            'Samuel', 'Elijah', 'Joshua', 'Ruth', 'Esther', 'Mary'];

        let wrongAnswers = allPossibleAnswers
            .filter(answer => answer !== verse.answer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const allOptions = [...wrongAnswers, verse.answer]
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
        if (!currentVerse || !timerActive) return;

        setTimerActive(false);
        Alert.alert('Time\'s Up!', `The correct answer was ${currentVerse.answer}`, [
            {
                text: 'Next Question',
                onPress: () => {
                    loadNewQuestion();
                }
            }
        ]);
    };

    const handleAnswer = (selectedAnswer: string) => {
        setTimerActive(false);
        if (!currentVerse) return;

        if (selectedAnswer === currentVerse.answer) {
            setScore(prev => prev + 1);
            Alert.alert('Correct!', 'Well done!', [
                { text: 'Next Question', onPress: loadNewQuestion }
            ]);
        } else {
            Alert.alert('Incorrect', `The correct answer was ${currentVerse.answer}`, [
                { text: 'Next Question', onPress: loadNewQuestion }
            ]);
        }
    };

    if (isLoading || !currentVerse) {
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
                <Text style={styles.verse}>{currentVerse.hint}</Text>
            </View>

            <View style={styles.bottomSection}>
                <View style={styles.grid}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.box,
                                { backgroundColor: Object.values(KAHOOT_COLORS)[index] }
                            ]}
                            onPress={() => handleAnswer(option)}
                        >
                            {index === 0 && <View style={[styles.shape, styles.triangle]} />}
                            {index === 1 && <View style={[styles.shape, styles.diamond]} />}
                            {index === 2 && <View style={[styles.shape, styles.circle]} />}
                            {index === 3 && <View style={[styles.shape, styles.square]} />}
                            <Text style={styles.boxText} numberOfLines={2}>{option}</Text>
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
    },
    topSection: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
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
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(139, 69, 19, 0.08)',
        margin: 10,
        borderRadius: 20,
        paddingVertical: 30,
    },
    bottomSection: {
        paddingBottom: 40,
        paddingHorizontal: 10,
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
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    scoreValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    verse: {
        fontSize: 22,
        textAlign: 'center',
        padding: 20,
        backgroundColor: '#d4b08c',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#8b4513',
        color: '#2c1810',
        fontWeight: '600',
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
    },
    box: {
        width: '48%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        padding: 10,
    },
    shape: {
        width: 24,
        height: 24,
        backgroundColor: 'white',
        marginBottom: 10,
    },
    boxText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
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
});
