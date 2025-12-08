// screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";

import { RootStackParamList } from "../types/navigation";
import MonoButton from "../components/MonoButton";
import { db } from "../firebase";

import {
    createGame,
    joinGame,
    generateId,
    listenGamesForPlayer,
} from "../services/gameService";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const [nickname, setNickname] = useState("");
    const [gameIdInput, setGameIdInput] = useState("");
    const [myGames, setMyGames] = useState<string[]>([]);

    // stały UID gracza (z AsyncStorage)
    const [playerUid, setPlayerUid] = useState<string | null>(null);

    useEffect(() => {
        const loadUid = async () => {
            const savedUid = await AsyncStorage.getItem("playerUid");
            if (savedUid) {
                setPlayerUid(savedUid);
            } else {
                const newUid = generateId(10);
                await AsyncStorage.setItem("playerUid", newUid);
                setPlayerUid(newUid);
            }
        };
        loadUid();
    }, []);

    useEffect(() => {
        const loadNickname = async () => {
            const savedNick = await AsyncStorage.getItem("nickname");
            if (savedNick) setNickname(savedNick);
        };
        loadNickname();
    }, []);


    // ------------------ 1. PRZYWRACANIE OSTATNIEJ GRY (tylko przy starcie appki) ------------------
    useEffect(() => {
        const restoreGame = async () => {
            const state = navigation.getState();
            const cameFromGame = state?.routes?.some(r => r.name === "Game");

            if (cameFromGame) {
                return;
            }

            try {
                const saved = await AsyncStorage.getItem("lastGame");
                if (!saved) return;

                const { gameId, playerUid, nickname } = JSON.parse(saved);

                const gameRef = doc(db, "games", gameId);
                const gameSnap = await getDoc(gameRef);

                if (!gameSnap.exists()) {
                    await AsyncStorage.removeItem("lastGame");
                    return;
                }

                const gameData: any = gameSnap.data();
                if (!gameData.players || !gameData.players.includes(playerUid)) {
                    await AsyncStorage.removeItem("lastGame");
                    return;
                }

                navigation.replace("Game", {
                    gameId,
                    playerUid,
                    nickname,
                });
            } catch (err) {
                console.log("Błąd przy restoreGame:", err);
                await AsyncStorage.removeItem("lastGame");
            }
        };

        restoreGame();
    }, [navigation]);

    // ------------------ 2. LISTA GIER TEGO GRACZA ------------------
    useEffect(() => {
        if (!playerUid) return; // czekamy aż UID się załaduje

        const unsub = listenGamesForPlayer(playerUid, (games) => {
            // games ma typ SimpleGame[], ale nie musimy tego pisać
            setMyGames(games.map((g) => g.id));
        });

        return () => unsub();
    }, [playerUid]);

    // ------------------ 3. TWORZENIE GRY ------------------
    const handleCreateGame = async () => {
        if (!nickname.trim()) {
            Alert.alert("Błąd", "Podaj swój nick.");
            return;
        }
        if (!playerUid) {
            Alert.alert("Chwila", "Trwa przygotowywanie gracza…");
            return;
        }

        try {
            const gameId = await createGame(playerUid, nickname.trim());
            navigation.navigate("Game", {
                gameId,
                playerUid,
                nickname: nickname.trim(),
            });
            await AsyncStorage.setItem("nickname", nickname.trim());
        } catch (e: any) {
            Alert.alert("Błąd", e.message ?? "Nie udało się utworzyć gry.");
        }
    };

    // ------------------ 4. DOŁĄCZANIE DO GRY ------------------
    const handleJoinGame = async () => {
        if (!nickname.trim()) {
            Alert.alert("Błąd", "Podaj swój nick.");
            return;
        }
        if (!gameIdInput.trim()) {
            Alert.alert("Błąd", "Podaj ID gry.");
            return;
        }
        if (!playerUid) {
            Alert.alert("Chwila", "Trwa przygotowywanie gracza…");
            return;
        }

        const gameId = gameIdInput.trim().toUpperCase();

        try {
            await joinGame(gameId, playerUid, nickname.trim());
            navigation.navigate("Game", {
                gameId,
                playerUid,
                nickname: nickname.trim(),
            });
            await AsyncStorage.setItem("nickname", nickname.trim());
        } catch (e: any) {
            Alert.alert("Błąd", e.message ?? "Nie udało się dołączyć do gry.");
        }
    };

    const handleSetNickname = async (value: string) => {
        setNickname(value);
        await AsyncStorage.setItem("nickname", value);
    };


    // ------------------ RENDER ------------------
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>💰 Monopoli Bank 💰</Text>

            <Text style={styles.label}>Twój nick</Text>
            <TextInput
                style={styles.input}
                placeholder="np. Asia"
                placeholderTextColor="#aaa"
                value={nickname}
                onChangeText={handleSetNickname}
            />


            <View style={styles.section}>
                <MonoButton
                    title="Stwórz nową grę"
                    color="green"
                    onPress={handleCreateGame}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>ID istniejącej gry</Text>
                <TextInput
                    style={styles.input}
                    placeholder="np. ABC123"
                    placeholderTextColor="#aaa"
                    autoCapitalize="characters"
                    value={gameIdInput}
                    onChangeText={setGameIdInput}
                />

                <MonoButton
                    title="Dołącz do gry"
                    color="gold"
                    onPress={handleJoinGame}
                />
            </View>

            {myGames.length > 0 && (
                <View style={styles.historyBox}>
                    <Text style={styles.historyTitle}>Twoje gry:</Text>

                    {myGames.map((id) => (
                        <TouchableOpacity
                            key={id}
                            style={styles.gameItem}
                            onPress={async () => {
                                const savedNick = await AsyncStorage.getItem("nickname");

                                navigation.navigate("Game", {
                                    gameId: id,
                                    playerUid: playerUid!,
                                    nickname: savedNick || "Gracz",
                                });
                            }}
                        >
                            <Text style={styles.gameName}>Gra: {id}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#1D1E20",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "center",
        color: "#E9C46A",
        marginBottom: 40,
    },
    label: {
        fontSize: 18,
        color: "#E9C46A",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#ffffff10",
        borderWidth: 1,
        borderColor: "#ffffff30",
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        color: "white",
        fontSize: 16,
    },
    section: {
        marginTop: 20,
    },
    historyBox: {
        backgroundColor: "#25262A",
        padding: 16,
        borderRadius: 10,
        marginTop: 30,
    },
    historyTitle: {
        color: "#E9C46A",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    gameItem: {
        backgroundColor: "#1F2023",
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ffffff20",
    },
    gameName: {
        color: "white",
        fontSize: 16,
    },
});

export default HomeScreen;
