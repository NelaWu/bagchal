import { _decorator, Component, Node, Prefab, instantiate, Vec3, log, Input, EventTouch, UITransform, Sprite } from 'cc';
import { Point } from './Point';
const { ccclass, property } = _decorator;

// 定義棋盤格子的狀態
export enum CellState {
    EMPTY = 0,
    TIGER = 1,
    GOAT = 2
}

@ccclass('GameManager')
export class GameManager extends Component {
    // ===== 單例模式 =====
    private static _instance: GameManager = null;
    public static get instance(): GameManager {
        return GameManager._instance;
    }

    // ===== 預製體和節點引用 =====
    @property({ type: Prefab })
    tigerPrefab: Prefab = null;

    @property({ type: Prefab })
    goatPrefab: Prefab = null;

    @property({ type: Prefab })
    pointPrefab: Prefab = null;

    @property({ type: Node })
    boardNode: Node = null;

    // ===== 遊戲配置 =====
    private readonly gridSize: number = 5;
    private readonly spacing: number = 188; // 每個點之間的距離
    private readonly maxGoats: number = 20;
    private readonly tigerPositions = [
        [-2, 2], [2, 2], [-2, -2], [2, -2]
    ];

    // ===== 遊戲狀態 =====
    private boardState: CellState[][] = [];
    private tigerCount: number = 0;
    private goatCount: number = 0;
    private isGoatTurn: boolean = true;
    private selectedTiger: Node | null = null;

    // ===== 生命週期方法 =====
    onLoad() {
        if (GameManager._instance === null) {
            GameManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    start() {
        if (!this.validatePrefabs()) return;
        
        this.initializeBoardState();
        this.spawnPoints();
        this.spawnTigers();
    }

    // ===== 初始化方法 =====
    private validatePrefabs(): boolean {
        if (!this.tigerPrefab || !this.goatPrefab || !this.pointPrefab || !this.boardNode) {
            console.warn('請確保所有必要的預製體和節點都已設定：tigerPrefab, goatPrefab, pointPrefab, boardNode');
            return false;
        }
        return true;
    }

    private initializeBoardState() {
        this.boardState = Array(5).fill(null).map(() => Array(5).fill(CellState.EMPTY));
    }

    private spawnTigers() {
        this.tigerPositions.forEach(pos => {
            const tiger = instantiate(this.tigerPrefab);
            const [x, y] = pos;
            const worldPos = this.getWorldPositionFromGrid(x, y);
            tiger.setPosition(worldPos);
            this.boardNode.addChild(tiger);
            tiger.name = `tiger-${x+2}-${y+2}`;
            console.log('tiger' , tiger.name);
            this.tigerCount++;
            this.boardState[y + 2][x + 2] = CellState.TIGER;
        });
    }

    private spawnPoints() {
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
                
                let pointComp = point.getComponent('Point');
                if (!pointComp) {
                    pointComp = point.addComponent('Point');
                }

                point.on("point-clicked", this.onPointClicked, this);
            }
        }
    }

    // ===== 座標轉換方法 =====
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

    // ===== 事件處理方法 =====
    onPointClicked(point: Node) {
        console.log("GameManage::知道你點了：", point.name, this.isGoatTurn);
        const [_, x, y] = point.name.split('-').map(Number);
        
        if (this.isGoatTurn) {
            this.handleGoatTurn(point, x, y);
        } else {
            this.handleTigerTurn(point, x, y);
        }
    }

    private handleGoatTurn(point: Node, x: number, y: number) {
        if (this.goatCount >= this.maxGoats) {
            console.log("已經達到最大山羊數量");
            return;
        }

        if (this.boardState[y][x] !== CellState.EMPTY) {
            console.log("該位置已經有棋子");
            return;
        }

        this.placeGoat(point, x, y);
    }

    private handleTigerTurn(point: Node, x: number, y: number) {
        if (!this.selectedTiger) {
            if (this.boardState[y][x] === CellState.TIGER) {
                this.selectedTiger = this.boardNode.getChildByName(`tiger-${x}-${y}`);
            }
            return;
        }

        if (this.boardState[y][x] !== CellState.EMPTY) {
            console.log("目標位置已有棋子");
            this.selectedTiger = null;
            return;
        }

        this.moveTiger(point, x, y);
    }

    // ===== 遊戲邏輯方法 =====
    private placeGoat(point: Node, x: number, y: number) {
        const goat = instantiate(this.goatPrefab);
        this.boardNode.addChild(goat);
        
        const worldPos = point.getWorldPosition();
        const localPos = this.boardNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        goat.setPosition(localPos);
        goat.name = `goat-${x}-${y}`;
        
        this.setupGoatComponents(goat);
        this.boardState[y][x] = CellState.GOAT;
        goat.setSiblingIndex(this.boardNode.children.length - 1);
        
        // 更新 Point 組件的狀態
        const pointComp = point.getComponent(Point);
        if (pointComp) {
            pointComp.setPiece(CellState.GOAT);
        }
        
        this.goatCount++;
        console.log("放置山羊成功，當前山羊數量：", this.goatCount);
        
        this.isGoatTurn = false;
    }

    private setupGoatComponents(goat: Node) {
        let uiTransform = goat.getComponent(UITransform);
        if (!uiTransform) {
            uiTransform = goat.addComponent(UITransform);
        }
        uiTransform.setContentSize(80, 80);
        
        let sprite = goat.getComponent(Sprite);
        if (!sprite) {
            sprite = goat.addComponent(Sprite);
        }
        
        const prefabSprite = this.goatPrefab.data.getComponent(Sprite);
        if (prefabSprite && prefabSprite.spriteFrame) {
            sprite.spriteFrame = prefabSprite.spriteFrame;
            console.log("設置山羊圖片成功");
        } else {
            console.warn("無法獲取山羊圖片");
        }
    }

    private moveTiger(point: Node, x: number, y: number) {
        const [_, oldX, oldY] = this.selectedTiger.name.split('-').map(Number);
        const tiger = this.boardNode.getChildByName(this.selectedTiger.name);
        console.log("GameManage::moveTiger：", this.boardNode, x, y);
        if (tiger) {
            const worldPos = point.getWorldPosition();
            const localPos = this.boardNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
            tiger.setPosition(localPos);
            this.boardState[oldY][oldX] = CellState.EMPTY;
            this.boardState[y][x] = CellState.TIGER;
            tiger.name = `tiger-${x}-${y}`;
            
            // 更新舊位置的 Point 組件狀態
            const oldPoint = this.boardNode.getChildByName(`point-${oldX}-${oldY}`);
            if (oldPoint) {
                const oldPointComp = oldPoint.getComponent(Point);
                if (oldPointComp) {
                    oldPointComp.setPiece(CellState.EMPTY);
                }
            }
            
            // 更新新位置的 Point 組件狀態
            const pointComp = point.getComponent(Point);
            if (pointComp) {
                pointComp.setPiece(CellState.TIGER);
            }
            
            console.log('GameManage::moveTiger2' ,tiger, point.getWorldPosition());
        }

        this.checkGoatCapture(oldX, oldY, x, y);
        this.selectedTiger = null;
        this.isGoatTurn = true;
    }

    private checkGoatCapture(oldX: number, oldY: number, newX: number, newY: number) {
        const midX = (oldX + newX) / 2;
        const midY = (oldY + newY) / 2;
        console.log('checkGoatCapture', midX, midY);
        
        if (this.boardState[midY]?.[midX] === CellState.GOAT) {
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
