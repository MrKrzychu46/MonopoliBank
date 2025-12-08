import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import {
    View,
    Text,
    FlatList,
    StyleSheet
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { listenTransactions, listenPlayers } from "../services/gameService";
import { Player } from "../types/game";
import { RootStackParamList } from "../types/navigation";
import { DrawerScreenProps } from "@react-navigation/drawer";

type Props = DrawerScreenProps<RootStackParamList, "History">;

export default function TransactionHistoryScreen({ route }: Props) {
    const { gameId } = route.params;

    const [transactions, setTransactions] = useState<any[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        const unsubT = listenTransactions(gameId, setTransactions);
        const unsubP = listenPlayers(gameId, setPlayers);
        return () => {
            unsubT();
            unsubP();
        };
    }, [gameId]);

    const filtered = filter === "all"
        ? transactions
        : transactions.filter(t => t.from === filter || t.to === filter);

    const getPlayerName = (id: string) =>
        players.find(p => p.id === id)?.name || id;

    const renderItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.row}>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.amount}>${item.amount}</Text>

                <Text style={styles.detail}>
                    {item.from ? getPlayerName(item.from) : ""}
                    {item.to ? " → " + getPlayerName(item.to) : ""}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Historia transakcji</Text>

            <View style={styles.pickerBox}>
                <Picker
                    selectedValue={filter}
                    onValueChange={(v) => setFilter(v)}
                    style={styles.picker}
                    dropdownIconColor="#E9C46A"
                    {...(Platform.OS === "ios"
                        ? { itemStyle: { color: "#E9C46A" } }
                        : {})}     // ← Android nie dostaje itemStyle
                >
                    <Picker.Item label="Wszyscy gracze" value="all" />
                    {players.map((p) => (
                        <Picker.Item key={p.id} label={p.name} value={p.id} />
                    ))}
                </Picker>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={i => i.id}
                renderItem={renderItem}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 50,
        backgroundColor: "#1D1E20",
    },

    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#E9C46A",
        marginBottom: 16,
        textAlign: "center",
    },

    pickerBox: {
        backgroundColor: "#25262A",
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#ffffff20",
    },

    picker: {
        color: "#E9C46A",
    },

    row: {
        backgroundColor: "#25262A",
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ffffff10",
    },

    type: {
        fontWeight: "bold",
        color: "#2A9D8F",
        fontSize: 16,
        marginBottom: 4,
    },

    amount: {
        fontSize: 18,
        color: "#E9C46A",
        fontWeight: "600",
        marginBottom: 4,
    },

    detail: {
        color: "#ccc",
        fontSize: 14,
    },
});
