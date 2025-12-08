import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Button,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
} from "react-native";
import { RootStackParamList } from "../types/navigation";
import { Player, Game } from "../types/game";
import {
    listenPlayers,
    listenGame,
    transferMoney,
    giveStartBonus,
    takeFromPot,
    payToBank,
    takeFromBank,
    payToPot, addGameToHistory,
} from "../services/gameService";

import { DrawerScreenProps } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { leaveGame as leaveGameFirestore } from "../services/gameService";
import MonoButton from "../components/MonoButton";

type Props = DrawerScreenProps<RootStackParamList, "Game">;


const GameScreen: React.FC<Props> = ({ route, navigation }) => {
    const { gameId, playerUid, nickname: initialNickname } = route.params;

    const [players, setPlayers] = useState<Player[]>([]);
    const [game, setGame] = useState<Game | null>(null);

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    const [amount, setAmount] = useState<string>("50"); // dla graczy
    const [amountBank, setAmountBank] = useState<string>("50"); // 🔥 NOWE – dla banku/puli

    useEffect(() => {
        AsyncStorage.setItem(
            "lastGame",
            JSON.stringify({ gameId, playerUid, nickname: initialNickname })
        );
        addGameToHistory(gameId);

        navigation.setOptions({ title: `Gra: ${gameId}` });

        const unsubPlayers = listenPlayers(gameId, setPlayers);
        const unsubGame = listenGame(gameId, setGame);

        return () => {
            unsubPlayers();
            unsubGame();
        };


    }, [gameId, navigation]);


    const me = players.find((p) => p.uid === playerUid);
    const others = players.filter((p) => p.uid !== playerUid);

    // -------------------- PRZELEW DO GRACZA --------------------
    const handleTransfer = async () => {
        if (!me) return;

        if (!selectedPlayerId)
            return Alert.alert("Błąd", "Wybierz gracza.");

        const value = Number(amount);
        if (!value || value <= 0)
            return Alert.alert("Błąd", "Podaj poprawną kwotę.");

        if (me.balance < value)
            return Alert.alert("Błąd", "Nie masz tyle środków.");

        await transferMoney(gameId, me.id, selectedPlayerId, value);
        setAmount("50");
    };

    // -------------------- START BONUS --------------------
    const handleStartBonus = async () => {
        if (!me) return;
        await giveStartBonus(gameId, me.id, 200);
    };

    // -------------------- BANK --------------------
    const handlePayBank = async () => {
        if (!me) return;

        const value = Number(amountBank); // 🔥 NOWE
        if (!value || value <= 0)
            return Alert.alert("Błąd", "Podaj poprawną kwotę.");

        if (me.balance < value)
            return Alert.alert("Błąd", "Nie masz tyle środków.");

        await payToBank(gameId, me.id, value);
        setAmountBank("50");
    };

    const handleTakeFromBank = async () => {
        if (!me || !game) return;

        const value = Number(amountBank); // 🔥 NOWE
        if (!value || value <= 0)
            return Alert.alert("Błąd", "Podaj poprawną kwotę.");

        if (game.bankBalance < value)
            return Alert.alert("Błąd", "Bank nie ma tyle.");

        await takeFromBank(gameId, me.id, value);
        setAmountBank("50");
    };

    // -------------------- PULA --------------------
    const handlePayPot = async () => {
        if (!me) return;

        const value = Number(amountBank); // 🔥 NOWE
        if (!value || value <= 0)
            return Alert.alert("Błąd", "Podaj poprawną kwotę.");

        if (me.balance < value)
            return Alert.alert("Błąd", "Nie masz tyle środków.");

        await payToPot(gameId, me.id, value);
        setAmountBank("50");
    };

    const handleTakePot = async () => {
        if (!me) return;
        await takeFromPot(gameId, me.id);
    };

    const leaveGame = async () => {
        await leaveGameFirestore(gameId, playerUid); // <-- nowa funkcja z gameService.ts
        await AsyncStorage.removeItem("lastGame");
        navigation.navigate("Home");
    };


    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>
                Witaj, {initialNickname} w grze: {gameId}
            </Text>


            {/* -------------------------------- TWOJE KONTO -------------------------------- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Twoje konto</Text>

                {me ? (
                    <Text style={styles.balance}>Saldo: ${me.balance.toFixed(0)}</Text>
                ) : (
                    <Text>Ładowanie…</Text>
                )}

                <MonoButton
                    title="+200$ za przejście przez START"
                    color="green"
                    onPress={handleStartBonus}
                />
            </View>

            {/* -------------------------------- GRACZE -------------------------------- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pozostali gracze</Text>

                <FlatList
                    scrollEnabled={false}
                    nestedScrollEnabled
                    data={others}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isSelected = item.id === selectedPlayerId;

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.playerRow,
                                    isSelected && styles.playerRowSelected,
                                ]}
                                onPress={() => setSelectedPlayerId(item.id)}
                            >
                                <Text style={styles.playerName}>{item.name}</Text>
                                <Text style={styles.playerBalance}>${item.balance}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* -------------------------------- PRZELEW -------------------------------- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Przelew do gracza</Text>

                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Kwota np. 50"
                />

                <MonoButton title="Wyślij" color="green" onPress={handleTransfer} />
            </View>

            {/* -------------------------------- BANK -------------------------------- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bank gry</Text>

                {game ? (
                    <>
                        <Text style={styles.balance}>Saldo banku: ${game.bankBalance}</Text>
                        <Text style={styles.balance}>Kasa w puli (POT): ${game.potBalance}</Text>
                    </>
                ) : (
                    <Text>Ładowanie…</Text>
                )}
            </View>

            {/* -------------------------------- BANK OPERATIONS -------------------------------- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Operacje z bankiem</Text>

                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={amountBank}
                    onChangeText={setAmountBank}
                    placeholder="Kwota do banku/puli"
                />

                <MonoButton title="Zapłać do banku" color="red" onPress={handlePayBank} />
                <View style={{ height: 8 }} />

                <MonoButton title="Weź z banku" color="green" onPress={handleTakeFromBank} />
                <View style={{ height: 8 }} />

                <MonoButton title="Dodaj do puli (POT)" color="gold" onPress={handlePayPot} />
                <View style={{ height: 8 }} />

                <MonoButton title="Weź z puli (POT)" color="green" onPress={handleTakePot} />
            </View>

            <MonoButton
                title="Historia transakcji"
                color="gold"
                onPress={() => navigation.navigate("History", { gameId })}
            />

            <MonoButton title="Wyjdź z gry" color="red" onPress={leaveGame} />
            <MonoButton
                title="Powrót do ekranu głównego"
                color="gold"
                onPress={() => navigation.navigate("Home")}
            />


        </ScrollView>
    );

};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingTop:50,
        backgroundColor: "#1D1E20",
        paddingBottom: 80,
    },

    header: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#E9C46A",
        textAlign: "center",
        marginBottom: 20,
    },

    section: {
        marginBottom: 25,
        padding: 15,
        backgroundColor: "#25262A",
        borderRadius: 12,
    },

    sectionTitle: {
        color: "#E9C46A",
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 10,
    },

    balance: {
        fontSize: 22,
        color: "#2A9D8F",
        fontWeight: "bold",
        marginBottom: 10,
    },

    playerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 12,
        backgroundColor: "#1F2023",
        borderRadius: 8,
        marginBottom: 8,
    },

    playerRowSelected: {
        backgroundColor: "#2A9D8F",
    },

    playerName: {
        color: "white",
        fontSize: 16,
    },

    playerBalance: {
        color: "#E9C46A",
        fontSize: 16,
        fontWeight: "bold",
    },

    input: {
        backgroundColor: "#ffffff20",
        padding: 12,
        borderRadius: 8,
        color: "white",
        marginBottom: 10,
        fontSize: 16,
    },
});

export default GameScreen;
