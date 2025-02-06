import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Dimensions, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CrosswordCell {
    letter: string;
    isActive: boolean;
    number?: number;
    isAcross?: boolean;
    isDown?: boolean;
}

interface Clue {
    number: number;
    clue: string;
    answer: string;
    direction: 'across' | 'down';
    startRow: number;
    startCol: number;
}

const GRID_SIZE = 15; // Increased grid size
const CELL_SIZE = Math.floor(Dimensions.get('window').width / GRID_SIZE) - 2;

const CROSSWORD_DATA: { clues: Clue[] } = {
    clues: [
        {
            number: 1,
            clue: "In the beginning was the ___",
            answer: "WORD",
            direction: "across" as const,
            startRow: 0,
            startCol: 0
        },
        {
            number: 2,
            clue: "Noah built an ___",
            answer: "ARK",
            direction: "down" as const,
            startRow: 0,
            startCol: 0
        },
        {
            number: 3,
            clue: "The first murderer",
            answer: "CAIN",
            direction: "across" as const,
            startRow: 2,
            startCol: 0
        }
        // Add more intersecting clues here
    ]
};

export default function Crossword() {
    const [grid, setGrid] = useState<CrosswordCell[][]>([]);
    const [clues] = useState<Clue[]>(CROSSWORD_DATA.clues);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{ row: number, col: number } | null>(null);

    useEffect(() => {
        initializeGrid();
        loadSavedState();
    }, []);

    const initializeGrid = () => {
        // Create empty grid
        const newGrid: CrosswordCell[][] = Array(GRID_SIZE).fill(null).map(() =>
            Array(GRID_SIZE).fill(null).map(() => ({
                letter: '',
                isActive: false
            }))
        );

        // Place words on grid
        clues.forEach(clue => {
            const { answer, direction, startRow, startCol, number } = clue;
            for (let i = 0; i < answer.length; i++) {
                const row = direction === 'across' ? startRow : startRow + i;
                const col = direction === 'across' ? startCol + i : startCol;

                newGrid[row][col].isActive = true;
                newGrid[row][col].isAcross = direction === 'across';
                newGrid[row][col].isDown = direction === 'down';

                if (i === 0) {
                    newGrid[row][col].number = number;
                }
            }
        });

        setGrid(newGrid);
    };

    const handleCellInput = async (row: number, col: number, value: string) => {
        if (!grid[row][col].isActive) return;

        const newGrid = [...grid];
        newGrid[row][col].letter = value.toUpperCase();
        setGrid(newGrid);

        await saveGameState(newGrid);
        checkCompletion(newGrid);
    };

    const checkCompletion = (currentGrid: CrosswordCell[][]) => {
        let isComplete = true;

        clues.forEach(clue => {
            const { answer, direction, startRow, startCol } = clue;
            let word = '';

            for (let i = 0; i < answer.length; i++) {
                const row = direction === 'across' ? startRow : startRow + i;
                const col = direction === 'across' ? startCol + i : startCol;
                word += currentGrid[row][col].letter;
            }

            if (word !== answer) {
                isComplete = false;
            }
        });

        if (isComplete && !gameCompleted) {
            setGameCompleted(true);
            Alert.alert(
                "Congratulations!",
                "You've completed the crossword!",
                [
                    { text: "OK" },
                    {
                        text: "New Puzzle (Ad)",
                        onPress: () => initializeGrid()
                    }
                ]
            );
        }
    };

    const saveGameState = async (currentGrid: CrosswordCell[][]) => {
        try {
            await AsyncStorage.setItem('crosswordState', JSON.stringify({
                grid: currentGrid,
                completed: gameCompleted
            }));
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    };

    const loadSavedState = async () => {
        try {
            const savedState = await AsyncStorage.getItem('crosswordState');
            if (savedState) {
                const { grid: savedGrid, completed } = JSON.parse(savedState);
                setGrid(savedGrid);
                setGameCompleted(completed);
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
        }
    };

    const renderCell = (cell: CrosswordCell, rowIndex: number, colIndex: number) => {
        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

        return (
            <TouchableOpacity
                style={styles.cellContainer}
                onPress={() => setSelectedCell({ row: rowIndex, col: colIndex })}
            >
                {cell.number && (
                    <Text style={styles.cellNumber}>{cell.number}</Text>
                )}
                <View
                    style={[
                        styles.cell,
                        !cell.isActive && styles.inactiveCell,
                        cell.isActive && styles.activeCell,
                        isSelected && styles.selectedCell
                    ]}
                >
                    <Text style={styles.cellText}>{cell.letter}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderKeyboard = () => {
        const keys = [
            "QWERTYUIOP",
            "ASDFGHJKL",
            "ZXCVBNM",
        ];

        const keyWidth = (Dimensions.get('window').width - 40) / 10;
        const keyHeight = keyWidth * 1.2;

        return (
            <View style={styles.keyboard}>
                {keys.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.keyboardRow}>
                        {row.split("").map((key) => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.key, { width: keyWidth, height: keyHeight }]}
                                onPress={() => handleKeyPress(key)}
                            >
                                <Text style={styles.keyText}>{key}</Text>
                            </TouchableOpacity>
                        ))}
                        {rowIndex === 2 && (
                            <>
                                <TouchableOpacity
                                    style={[styles.keyWide, { width: keyWidth * 1.5, height: keyHeight }]}
                                    onPress={() => handleKeyPress("BACKSPACE")}
                                >
                                    <Text style={styles.keyText}>⌫</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const handleKeyPress = (key: string) => {
        if (!selectedCell || !grid[selectedCell.row][selectedCell.col].isActive) return;

        if (key === "BACKSPACE") {
            handleCellInput(selectedCell.row, selectedCell.col, "");
            // Move to previous cell if possible
            moveSelection('back');
        } else {
            handleCellInput(selectedCell.row, selectedCell.col, key);
            // Move to next cell if possible
            moveSelection('forward');
        }
    };

    const moveSelection = (direction: 'forward' | 'back') => {
        if (!selectedCell) return;

        const { row, col } = selectedCell;
        const cell = grid[row][col];

        if (cell.isAcross) {
            const newCol = direction === 'forward' ? col + 1 : col - 1;
            if (newCol >= 0 && newCol < GRID_SIZE && grid[row][newCol].isActive) {
                setSelectedCell({ row, col: newCol });
            }
        } else if (cell.isDown) {
            const newRow = direction === 'forward' ? row + 1 : row - 1;
            if (newRow >= 0 && newRow < GRID_SIZE && grid[newRow][col].isActive) {
                setSelectedCell({ row: newRow, col });
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bible Crossword</Text>

            <View style={styles.gridContainer}>
                {grid.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map((cell, colIndex) => (
                            renderCell(cell, rowIndex, colIndex)
                        ))}
                    </View>
                ))}
            </View>

            <ScrollView style={styles.cluesContainer}>
                <View>
                    <Text style={styles.clueHeader}>Across</Text>
                    {clues
                        .filter(clue => clue.direction === 'across')
                        .map(clue => (
                            <Text key={clue.number} style={styles.clue}>
                                {clue.number}. {clue.clue}
                            </Text>
                        ))}
                </View>
                <View>
                    <Text style={styles.clueHeader}>Down</Text>
                    {clues
                        .filter(clue => clue.direction === 'down')
                        .map(clue => (
                            <Text key={clue.number} style={styles.clue}>
                                {clue.number}. {clue.clue}
                            </Text>
                        ))}
                </View>
            </ScrollView>

            {renderKeyboard()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 10,
    },
    gridContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    row: {
        flexDirection: 'row',
    },
    cellContainer: {
        position: 'relative',
        width: CELL_SIZE,
        height: CELL_SIZE,
    },
    cellNumber: {
        position: 'absolute',
        top: 1,
        left: 1,
        fontSize: 8,
        zIndex: 1,
    },
    cell: {
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderColor: '#000',
        textAlign: 'center',
        fontSize: CELL_SIZE * 0.6,
        backgroundColor: '#fff',
    },
    activeCell: {
        backgroundColor: '#fff',
    },
    inactiveCell: {
        backgroundColor: '#333',
    },
    cluesContainer: {
        flex: 1,
        marginTop: 20,
    },
    clueHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 5,
    },
    clue: {
        fontSize: 16,
        marginVertical: 3,
    },
    selectedCell: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
        borderWidth: 2,
    },
    cellText: {
        fontSize: CELL_SIZE * 0.6,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    keyboard: {
        marginTop: 'auto',
        paddingTop: 10,
        backgroundColor: '#f5f5f5',
    },
    keyboardRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
    },
    key: {
        margin: 3,
        backgroundColor: '#fff',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    keyWide: {
        margin: 3,
        backgroundColor: '#fff',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    keyText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 