export type RootStackParamList = {
    Home: undefined;
    Game: {
        gameId: string;
        playerUid: string;
        nickname: string;
    };
    History: {
        gameId: string;
    };
};
