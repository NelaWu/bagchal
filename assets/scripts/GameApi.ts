
export interface GameState {
    board: number[][];
    goatsInHand: number;
    capturedGoats: number;
    currentTurn: number;
    isGameOver: boolean;
    winner: number;
    lastMove: any; // 可根據實際 lastMove 結構調整
}

export interface GameData {
    id: string;
    state: GameState;
    createdAt: string;
    updatedAt: string;
    playerId: string;
    isAIGame: boolean;
    aiLevel: number;
}

const BASE_URL = 'https://bagchalgolang.onrender.com/api';

export async function startNewGame(): Promise<GameData> {
    const response = await fetch(`${BASE_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // body
        body: JSON.stringify(  {
            "playerId": "player123",
            "isAIGame": true,
            "aiLevel": 2
        }) 
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    console.log("GameApi::startNewGame",data);
    // 這裡可以做格式化
    return {
        id: data.id,
        state: {
            board: data.state.board,
            goatsInHand: data.state.goatsInHand,
            capturedGoats: data.state.capturedGoats,
            currentTurn: data.state.currentTurn,
            isGameOver: data.state.isGameOver,
            winner: data.state.winner,
            lastMove: data.state.lastMove,
        },
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        playerId: data.playerId,
        isAIGame: data.isAIGame,
        aiLevel: data.aiLevel,
    };
}

// 你可以繼續擴充其他 API，例如 moveTiger、placeGoat 等
