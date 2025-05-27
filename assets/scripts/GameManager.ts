import { _decorator, Component, Node, Prefab, instantiate, Vec3, log, Input, EventTouch, UITransform, Sprite } from 'cc';
const { ccclass, property } = _decorator;

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

        // 放置 4 隻老虎在角落位置（示例）
        const tigerPositions = [
            [-2, 2], [2, 2], [-2, -2], [2, -2]
        ];
        tigerPositions.forEach(pos => {
            const tiger = instantiate(this.tigerPrefab);
            tiger.setPosition(pos[0] * 100, pos[1] * 100);
            this.boardNode.addChild(tiger);
            this.tigerCount++;
        });

        this.spawnPoints();
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
                point.name = "point-"+x+"-"+y;
                log("生成點位:", point.name, "位置:", posX, posY);
                
                // 確保點位有 Point 組件
                let pointComp = point.getComponent('Point');
                if (!pointComp) {
                    pointComp = point.addComponent('Point');
                }
                
                // 設置事件監聽
                point.on(Input.EventType.TOUCH_END, (event: EventTouch) => {
                    this.onPointClicked(point);
                });
            }
        }
    }

    onPointClicked(point: Node) {
        console.log("GameManage::知道你點了：", point.name);
        
        // 檢查是否是山羊的回合
        if (this.isGoatTurn) {
            // 檢查是否已經達到最大山羊數量
            if (this.goatCount >= this.maxGoats) {
                console.log("已經達到最大山羊數量");
                return;
            }

            // 檢查該位置是否已經有棋子
            if (this.hasPieceAtPoint(point)) {
                console.log("該位置已經有棋子");
                return;
            }

            // 放置山羊
            this.placeGoat(point);

        }
        // 老虎的回合
        else{
            // 點選老虎移動位置
            this.moveTiger(point);
        }

    }

    private hasPieceAtPoint(point: Node): boolean {
        // 檢查該點位下是否有子節點（棋子）
        return point.children.length > 0;
    }

    private placeGoat(point: Node) {
        const goat = instantiate(this.goatPrefab);
        this.boardNode.addChild(goat);
        
        // 使用點位的世界座標來設置山羊的位置
        const worldPos = point.getWorldPosition();
        const localPos = this.boardNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        goat.setPosition(localPos);
        
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
        
        // 設置山羊的層級，確保它顯示在點位上方
        goat.setSiblingIndex(this.boardNode.children.length - 1);
        
        this.goatCount++;
        console.log("放置山羊成功，當前山羊數量：", this.goatCount);
        
        // 切換回合
        this.isGoatTurn = false;
    }

    private moveTiger(point: Node) {
        console.log("GameManage::知道你點了老虎：", point.name);
        this.isGoatTurn = true;
    }
}
