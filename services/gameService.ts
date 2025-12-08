import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    collection,
    addDoc,
    onSnapshot,
    increment,
    arrayUnion,
    FirestoreError,
    QuerySnapshot,
    DocumentData,
    query,
    orderBy,
    collectionGroup,
    where,
} from "firebase/firestore";

import { db } from "../firebase";
import { Game, Player } from "../types/game";

export function generateId(length = 6): string {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

// Tworzenie nowej gry
export async function createGame(ownerUid: string, ownerName: string) {
    const gameId = generateId();

    const gameRef = doc(db, "games", gameId);
    const playersCol = collection(db, `games/${gameId}/players`);

    await setDoc(gameRef, {
        ownerId: ownerUid,
        players: [ownerUid],
        bankBalance: 10000,
        potBalance: 0,
        createdAt: Date.now(),
    });

    await addDoc(playersCol, {
        uid: ownerUid,
        name: ownerName,
        balance: 1500, // startowe saldo – możesz zmienić
    });

    return gameId;
}

// Dołączenie do istniejącej gry
export async function joinGame(
    gameId: string,
    playerUid: string,
    name: string
): Promise<void> {
    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);

    if (!snap.exists()) {
        throw new Error("Gra o podanym ID nie istnieje.");
    }

    await updateDoc(gameRef, {
        players: arrayUnion(playerUid),
    });

    const playersCol = collection(db, `games/${gameId}/players`);
    await addDoc(playersCol, {
        uid: playerUid,
        name,
        balance: 1500,
    });
}

// Nasłuch graczy w danej grze (real-time)
export function listenPlayers(
    gameId: string,
    callback: (players: Player[]) => void,
    onError?: (error: FirestoreError) => void
) {
    const playersCol = collection(db, `games/${gameId}/players`);

    return onSnapshot(
        playersCol,
        (snapshot: QuerySnapshot<DocumentData>) => {
            const list: Player[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<Player, "id">),
            }));
            callback(list);
        },
        (error) => {
            if (onError) onError(error);
            console.error(error);
        }
    );
}

// Nasłuch samej gry (bank, pot itp.)
export function listenGame(
    gameId: string,
    callback: (game: Game | null) => void,
    onError?: (error: FirestoreError) => void
) {
    const gameRef = doc(db, "games", gameId);

    return onSnapshot(
        gameRef,
        (snap) => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            callback({
                id: snap.id,
                ...(snap.data() as Omit<Game, "id">),
            });
        },
        (error) => {
            if (onError) onError(error);
            console.error(error);
        }
    );
}

// Przelew gracz → gracz
export async function transferMoney(gameId: string, fromDocId: string, toDocId: string, amount: number) {
    const fromRef = doc(db, `games/${gameId}/players/${fromDocId}`);
    const toRef = doc(db, `games/${gameId}/players/${toDocId}`);

    await updateDoc(fromRef, { balance: increment(-amount) });
    await updateDoc(toRef, { balance: increment(amount) });

    await addTransaction(gameId, {
        type: "transfer",
        from: fromDocId,
        to: toDocId,
        amount,
        timestamp: Date.now(),
    });
}

// Gracz → bank (np. opłaty)
export async function payToBank(gameId: string, playerDocId: string, amount: number) {
    const playerRef = doc(db, `games/${gameId}/players/${playerDocId}`);
    const gameRef = doc(db, "games", gameId);

    await Promise.all([
        updateDoc(playerRef, { balance: increment(-amount) }),
        updateDoc(gameRef, { bankBalance: increment(amount) }),
    ]);

    await addTransaction(gameId, {
        type: "payBank",
        from: playerDocId,
        to: "bank",
        amount,
        timestamp: Date.now(),
    });
}


// Bonus za przejście przez START (+200$)
export async function giveStartBonus(gameId: string, playerDocId: string, bonus = 200) {
    const ref = doc(db, `games/${gameId}/players/${playerDocId}`);
    await updateDoc(ref, { balance: increment(bonus) });

    await addTransaction(gameId, {
        type: "startBonus",
        from: "bank",
        to: playerDocId,
        amount: bonus,
        timestamp: Date.now(),
    });
}

export function listenTransactions(
    gameId: string,
    callback: (transactions: any[]) => void
) {
    const colRef = collection(db, `games/${gameId}/transactions`);
    const q = query(colRef, orderBy("timestamp", "desc"));

    return onSnapshot(q, snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(list);
    });
}





// Bank → gracz
export async function takeFromBank(gameId: string, playerDocId: string, amount: number) {
    const playerRef = doc(db, `games/${gameId}/players/${playerDocId}`);
    const gameRef = doc(db, "games", gameId);

    await Promise.all([
        updateDoc(playerRef, { balance: increment(amount) }),
        updateDoc(gameRef, { bankBalance: increment(-amount) }),
    ]);

    await addTransaction(gameId, {
        type: "takeBank",
        from: "bank",
        to: playerDocId,
        amount,
        timestamp: Date.now(),
    });
}


// POT → Gracz
export async function takeFromPot(gameId: string, playerDocId: string) {
    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    const potAmount = snap.data()?.potBalance ?? 0;
    if (potAmount <= 0) return;

    const playerRef = doc(db, `games/${gameId}/players/${playerDocId}`);

    await Promise.all([
        updateDoc(playerRef, { balance: increment(potAmount) }),
        updateDoc(gameRef, { potBalance: 0 }),
    ]);

    await addTransaction(gameId, {
        type: "takePot",
        from: "pot",
        to: playerDocId,
        amount: potAmount,
        timestamp: Date.now(),
    });
}


// Gracz → POT (wpłaca kwotę do puli)
export async function payToPot(gameId: string, playerDocId: string, amount: number) {
    const playerRef = doc(db, `games/${gameId}/players/${playerDocId}`);
    const gameRef = doc(db, "games", gameId);

    await Promise.all([
        updateDoc(playerRef, { balance: increment(-amount) }),
        updateDoc(gameRef, { potBalance: increment(amount) }),
    ]);

    await addTransaction(gameId, {
        type: "payPot",
        from: playerDocId,
        to: "pot",
        amount,
        timestamp: Date.now(),
    });
}


// zapis transakcji
async function addTransaction(
    gameId: string,
    data: {
        type: string;
        from?: string | null;
        to?: string | null;
        amount: number;
        timestamp: number;
    }
) {
    await addDoc(collection(db, `games/${gameId}/transactions`), data);
}



// zwrócimy tylko podstawowe dane gry
export type SimpleGame = {
    id: string;
    bankBalance: number;
    potBalance: number;
    createdAt: number;
};

export function listenGamesForPlayer(
    playerUid: string,
    callback: (games: SimpleGame[]) => void
) {
    const q = query(
        collectionGroup(db, "players"),
        where("uid", "==", playerUid)
    );

    return onSnapshot(q, async (snap) => {
        const games = await Promise.all(
            snap.docs.map(async (playerDoc) => {
                const gameRef = playerDoc.ref.parent.parent; // parent = players, parent of parent = game doc
                if (!gameRef) return null;

                const gameSnap = await getDoc(gameRef);
                if (!gameSnap.exists()) return null;

                const data = gameSnap.data() as any;

                return {
                    id: gameRef.id,
                    bankBalance: data.bankBalance,
                    potBalance: data.potBalance,
                    createdAt: data.createdAt,
                };
            })
        );

        callback(games.filter((g) => g !== null) as SimpleGame[]);
    });
}
import { deleteDoc, arrayRemove, getDocs } from "firebase/firestore";

export async function leaveGame(gameId: string, playerUid: string) {
    // usuń z tablicy "players" w dokumencie gry
    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, {
        players: arrayRemove(playerUid)
    });

    // usuń dokument gracza z podkolekcji
    const playersCol = collection(db, `games/${gameId}/players`);
    const q = query(playersCol, where("uid", "==", playerUid));
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
    }
    await cleanGameIfEmpty(gameId);
}

import AsyncStorage from "@react-native-async-storage/async-storage";

export async function addGameToHistory(gameId: string) {
    try {
        const raw = await AsyncStorage.getItem("playedGames");
        const list = raw ? JSON.parse(raw) : [];

        if (!list.includes(gameId)) {
            list.push(gameId);
            await AsyncStorage.setItem("playedGames", JSON.stringify(list));
        }
    } catch (e) {
        console.error("Nie udało się zapisać historii gier:", e);
    }
}

export async function getGameInfo(gameId: string) {
    const ref = doc(db, "games", gameId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return {
        id: snap.id,
        ...(snap.data() as any)
    };
}

export async function cleanGameIfEmpty(gameId: string) {
    const ref = doc(db, "games", gameId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    if (!data.players || data.players.length === 0) {
        // usuwamy całą grę
        await deleteDoc(ref);
    }
}





