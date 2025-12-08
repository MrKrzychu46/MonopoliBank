export type Player = {
    id: string;        // Firestore doc id
    uid: string;       // identyfikator gracza (np. losowy)
    name: string;
    balance: number;
};

export type Game = {
    id: string;
    ownerId: string;
    players: string[]; // lista uid graczy
    bankBalance: number;
    potBalance: number;
    createdAt: number;
};
