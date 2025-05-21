import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function Stats() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Stats</Text>
            <Text style={styles.subtitle}>Coming soon!</Text>

            <Link href="/" style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Back to Home</Text>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#000000",
    },
    title: {
        fontSize: 36,
        fontWeight: "900",
        marginBottom: 20,
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#FFFFFF',
        marginBottom: 40,
    },
    backButton: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginLeft: 8,
    }
}); 