import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./screens/HomeScreen";
import GameScreen from "./screens/GameScreen";
import TransactionHistoryScreen from "./screens/TransactionHistoryScreen";

export type RootStackParamList = {
    Home: undefined;
    Game: { gameId: string; playerUid: string; nickname: string };
    History: { gameId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Game" component={GameScreen} />
                <Stack.Screen name="History" component={TransactionHistoryScreen} />
            </Stack.Navigator>
        </NavigationContainer>

    );
}
