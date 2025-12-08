import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

// 👉 typy propsów – dzięki temu TS przestanie świecić na czerwono
type MonoButtonProps = {
    title: string;
    onPress: () => void;
    color?: "green" | "red" | "gold";
};

const MonoButton: React.FC<MonoButtonProps> = ({
                                                   title,
                                                   onPress,
                                                   color = "green",
                                               }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.button,
                color === "green" && styles.green,
                color === "red" && styles.red,
                color === "gold" && styles.gold,
            ]}
        >
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginVertical: 8,
        alignItems: "center",
    },
    green: {
        backgroundColor: "#2A9D8F",
    },
    red: {
        backgroundColor: "#D62828",
    },
    gold: {
        backgroundColor: "#E9C46A",
    },
    text: {
        fontSize: 18,
        color: "#fff",
        fontWeight: "bold",
    },
});

export default MonoButton;
