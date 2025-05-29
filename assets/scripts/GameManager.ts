import { _decorator, Component, Node, Prefab, instantiate, Vec3, log, Input, EventTouch, UITransform, Sprite } from 'cc';
const { ccclass, property } = _decorator;

// 定義棋盤格子的狀態
enum CellState {
    EMPTY = 0,
    TIGER = 1,
    GOAT = 2
}

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager = null;

    public static get instance(): GameManager {
        return GameManager._instance;
    }

    @property({ type: Prefab })
    tigerPrefab: Prefab = null;

    @property({ type: Prefab })
    goatPrefab: Prefab = null;

    @property({ type: Prefab })
    pointPrefab: Prefab = null; // 預製點位

    @property({ type: Node })
    boardNode: Node = null;

    private tigerCount = 0;
    private goatCount = 0;
    private readonly maxGoats = 20;
    private isGoatTurn = true; // true 表示是山羊的回合

    gridSize: number = 5;
    spacing: number = 185; // 每個點之間的距離

     // 放置 4 隻老虎在角落位置（示例）
     private tigerPositions = [
        [-2, 2], [2, 2], [-2, -2], [2, -2]
    ];

    // 棋盤狀態陣列
    private boardState: CellState[][] = [];
    private selectedTiger: Node | null = null;

    onLoad() {
        if (GameManager._instance === null) {
            GameManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    start() {
        if (!this.tigerPrefab || !this.goatPrefab || !this.pointPrefab || !this.boardNode) {
            console.warn('請確保所有必要的預製體和節點都已設定：tigerPrefab, goatPrefab, pointPrefab, boardNode');
            return;
        }

        // 初始化棋盤狀態
        this.initializeBoardState();

        // 放置老虎
        this.tigerPositions.forEach(pos => {
            const tiger = instantiate(this.tigerPrefab);
            const [x, y] = pos;
            const worldPos = this.getWorldPositionFromGrid(x, y);
            tiger.setPosition(worldPos);
            this.boardNode.addChild(tiger);
            tiger.name = `tiger-${x}-${y}`;
            this.tigerCount++;
            // 更新棋盤狀態
            this.boardState[y + 2][x + 2] = CellState.TIGER;
        });

        this.spawnPoints();
    }

    private initializeBoardState() {
        // 初始化 5x5 的棋盤，所有格子都是空的
        this.boardState = Array(5).fill(null).map(() => Array(5).fill(CellState.EMPTY));
    }

    private getWorldPositionFromGrid(x: number, y: number): Vec3 {
        const boardSize = this.gridSize * this.spacing;
        const startX = -boardSize / 2 + this.spacing / 2;
        const startY = boardSize / 2 - this.spacing / 2;
        return new Vec3(
            startX + (x + 2) * this.spacing,
            startY - (y + 2) * this.spacing,
            0
        );
    }


    spawnPoints() {
        const boardSize = this.gridSize * this.spacing;
        const startX = -boardSize / 2 + this.spacing / 2;
        const startY = boardSize / 2 - this.spacing / 2;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const point = instantiate(this.pointPrefab);
                const posX = startX + x * this.spacing;
                const posY = startY - y * this.spacing;
                point.setPosition(new Vec3(posX, posY, 0));
                this.boardNode.addChild(point);
                point.name = `point-${x}-${y}`;
                log("生成點位:", point.name, "位置:", posX, posY);
                
                // 確保點位有 Point 組件
                let pointComp = point.getComponent('Point');
                if (!pointComp) {
                    pointComp = point.addComponent('Point');
                }

                // 監聽點位的點擊事件
                point.on("point-clicked", this.onPointClicked, this);
            }
        }
    }

    onPointClicked(point: Node) {
        console.log("GameManage::知道你點了：", point.name, this.isGoatTurn);
        
        // 從點位名稱解析座標
        const [_, x, y] = point.name.split('-').map(Number);
        
        // 檢查是否是山羊的回合
        if (this.isGoatTurn) {
            // 檢查是否已經達到最大山羊數量
            if (this.goatCount >= this.maxGoats) {
                console.log("已經達到最大山羊數量");
                return;
            }

            // 檢查該位置是否已經有棋子
            if (this.boardState[y][x] !== CellState.EMPTY) {
                console.log("該位置已經有棋子");
                return;
            }

            // 放置山羊
            this.placeGoat(point, x, y);
        }
        // 老虎的回合
        else {
            // 點選老虎移動位置
            this.moveTiger(point, x, y);
        }
    }

    private placeGoat(point: Node, x: number, y: number) {
        const goat = instantiate(this.goatPrefab);
        this.boardNode.addChild(goat);
        
        // 使用點位的世界座標來設置山羊的位置
        const worldPos = point.getWorldPosition();
        const localPos = this.boardNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        goat.setPosition(localPos);
        goat.name = `goat-${x}-${y}`;
        
        // 確保山羊有必要的組件
        let uiTransform = goat.getComponent(UITransform);
        if (!uiTransform) {
            uiTransform = goat.addComponent(UITransform);
        }
        uiTransform.setContentSize(80, 80);
        
        // 確保山羊有 Sprite 組件並設置正確的圖片
        let sprite = goat.getComponent(Sprite);
        if (!sprite) {
            sprite = goat.addComponent(Sprite);
        }
        
        // 從預製體中獲取 SpriteFrame
        const prefabSprite = this.goatPrefab.data.getComponent(Sprite);
        if (prefabSprite && prefabSprite.spriteFrame) {
            sprite.spriteFrame = prefabSprite.spriteFrame;
            console.log("設置山羊圖片成功");
        } else {
            console.warn("無法獲取山羊圖片");
        }
        
        // 更新棋盤狀態
        this.boardState[y][x] = CellState.GOAT;
        
        // 設置山羊的層級，確保它顯示在點位上方
        goat.setSiblingIndex(this.boardNode.children.length - 1);
        
        this.goatCount++;
        console.log("放置山羊成功，當前山羊數量：", this.goatCount);
        
        // 切換回合
        this.isGoatTurn = false;
    }

    private moveTiger(point: Node, x: number, y: number) {
        // 如果還沒有選中老虎，檢查點擊的是否是老虎
        if (!this.selectedTiger) {
            if (this.boardState[y][x] === CellState.TIGER) {
                this.selectedTiger = point;
                console.log("選中老虎：", point.name);
            }
            return;
        }

        // 如果已經選中老虎，檢查目標位置是否合法
        if (this.boardState[y][x] !== CellState.EMPTY) {
            console.log("目標位置已有棋子");
            this.selectedTiger = null;
            return;
        }

        // 獲取老虎的原始位置
        const [_, oldX, oldY] = this.selectedTiger.name.split('-').map(Number);

        // 移動老虎
        const tiger = this.boardNode.getChildByName(this.selectedTiger.name);
        if (tiger) {
            tiger.setPosition(point.getWorldPosition());
            // 更新棋盤狀態
            this.boardState[oldY][oldX] = CellState.EMPTY;
            this.boardState[y][x] = CellState.TIGER;
            tiger.name = `tiger-${x}-${y}`;
        }

        // 檢查是否吃到羊
        this.checkGoatCapture(oldX, oldY, x, y);

        // 重置選中的老虎
        this.selectedTiger = null;
        // 切換回合
        this.isGoatTurn = true;
    }

    private checkGoatCapture(oldX: number, oldY: number, newX: number, newY: number) {
        // 計算跳躍的中間位置
        const midX = (oldX + newX) / 2;
        const midY = (oldY + newY) / 2;
        
        // 檢查中間位置是否有羊
        if (this.boardState[midY][midX] === CellState.GOAT) {
            // 移除被吃掉的羊
            const goatName = `goat-${midX}-${midY}`;
            const goat = this.boardNode.getChildByName(goatName);
            if (goat) {
                goat.destroy();
                this.boardState[midY][midX] = CellState.EMPTY;
                this.goatCount--;
                console.log("老虎吃掉一隻羊！");
            }
        }
    }
}
