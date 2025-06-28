import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform, Sprite, SpriteFrame } from 'cc';
import { Point } from './Point';
import { WinScreen } from './WinScreen';
import { GameApi, GameData } from './GameApi';
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

    @property({ type: Node })
    turnNotice: Node = null;

    @property({ type: SpriteFrame })
    goatTurnSprite: SpriteFrame = null;

    @property({ type: SpriteFrame })
    tigerTurnSprite: SpriteFrame = null;

    @property(Node)
    winScreen: Node = null;

    // ===== 遊戲 API =====
    private readonly serverUrl = 'https://bagchalgolang.onrender.com/api';

    // ===== 遊戲配置 =====
    private readonly gridSize: number = 5;
    private readonly spacingY: number = 188; // 每個點之間的距離
    private readonly spacingX: number = 188; // 每個點之間的距離
    private readonly tigerPositions:number[][] = [];

    // ===== 遊戲狀態 =====
    private boardState: CellState[][];
    private pointNodes: Node[][] = [];  // 存储所有点位节点
    private tigerCount: number = 0;
    private goatCount: number = 0;
    private dieGoat:number = 0;
    private isGoatTurn: boolean = true;
    private selectedTiger: Node | null = null;

    private gameApi:GameApi = new GameApi();
    private gameData:GameData;

    // ===== 生命週期方法 =====
    onLoad() {
        if (GameManager._instance === null) {
            GameManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    async start() {
        if (!this.validatePrefabs()) return;
        
        // 先產生點位節點
        this.spawnPoints();
        this.hideWinScreen();

        // 從伺服器開始一個新遊戲
        try {
            this.gameData = await this.gameApi.startNewGame();
            // 你可以這樣取得棋盤
            const board = this.gameData.state.board;
            // 其他資料也可以直接用 gameData.state.goatsInHand 等
            this.initializeBoardFromServer(board);
        } catch (error) {
            console.error('無法從伺服器取得新遊戲:', error);
        }
    }


    /**
     * 根據伺服器回傳的資料來初始化棋盤
     * @param gameData 伺服器回傳的遊戲狀態
     */
    private initializeBoardFromServer(gameData: any) {
        // 假設 gameData 格式為 { board: CellState[][], tigers: {x: number, y: number}[] }
        // 你需要根據你的後端 API 回應的實際格式來調整此部分
        console.log('GameManager::init',gameData);
        
        // 1. 初始化棋盤狀態
        this.boardState = gameData;

        // 2. 根據伺服器資料產生老虎
        for (let i = 0; i < this.boardState.length; i++) {
            for (let j = 0; j < this.boardState[i].length; j++) {
                if (this.boardState[i][j] === 1) {
                    this.tigerPositions.push([j - 2,i - 2]); // 假設你的座標系統是 -2~2
                }
            }
        }
        
        this.spawnTigersFromServer(gameData.tigers || this.tigerPositions.map(p => ({ x: p[0], y: p[1] })));

        // 3. 設定初始回合 (或根據伺服器資料設定)
        this.setTurn(CellState.GOAT); 

        // 4. 初始化山羊可放置位置
        this.calcuateTypePositions(CellState.EMPTY);
    }

    private spawnTigersFromServer(tigerPositions: {x: number, y: number}[]) {
        // 清除可能已存在的老虎
        this.boardNode.children.forEach(child => {
            if (child.name.startsWith('tiger-')) {
                child.destroy();
            }
        });
        this.tigerCount = 0;

        tigerPositions.forEach(pos => {
            const tiger = instantiate(this.tigerPrefab);
            // 注意：後端座標系統需要和前端的對應起來
            // 這裡假設後端給的座標是 grid 座標（-2 到 2）
            const worldPos = this.getWorldPositionFromGrid(pos.x, pos.y);
            tiger.setPosition(worldPos);
            this.boardNode.addChild(tiger);
            tiger.name = `tiger-${pos.x + 2}-${pos.y + 2}`;
            this.tigerCount++;
            this.boardState[pos.x + 2][pos.y + 2] = CellState.TIGER;
        });
    }

    // ===== 初始化方法 =====
    private validatePrefabs(): boolean {
        if (!this.tigerPrefab || !this.goatPrefab || !this.pointPrefab || !this.boardNode) {
            console.warn('請確保所有必要的預製體和節點都已設定：tigerPrefab, goatPrefab, pointPrefab, boardNode');
            return false;
        }
        return true;
    }

    private spawnPoints() {
        const boardSize = this.gridSize * this.spacingY;
        const startX = -boardSize / 2 + this.spacingX / 2;
        const startY = boardSize / 2 - this.spacingY / 2;

        // 初始化点位数组
        this.pointNodes = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const point = instantiate(this.pointPrefab);
                const posX = startX + x * this.spacingX;
                const posY = startY - y * this.spacingY;
                point.setPosition(new Vec3(posX, posY, 0));
                this.boardNode.addChild(point);
                point.name = `point-${x}-${y}`;
                
                // 存储点位节点
                this.pointNodes[x][y] = point;
                
                let pointComp = point.getComponent('Point');
                if (!pointComp) {
                    pointComp = point.addComponent('Point');
                }
                point.on("point-clicked", this.onPointClicked, this);
            }
        }
    }

    private setTurn(type: CellState): void {
        this.resetHighlight();
        const sprite = this.turnNotice.getComponent(Sprite);
        switch(type) {
            case CellState.GOAT:
                sprite.spriteFrame = this.goatTurnSprite;
                this.isGoatTurn = true;
                this.calcuateTypePositions(CellState.EMPTY);
                break;
            case CellState.TIGER:
                sprite.spriteFrame = this.tigerTurnSprite;
                this.isGoatTurn = false;
                this.calcuateTypePositions(CellState.TIGER);
                break;
            case CellState.EMPTY:
                console.warn('GameManager::setTurn 傳參數錯誤!!!')
                break;
        }
    }

    // ===== 座標轉換方法 =====
    private getWorldPositionFromGrid(x: number, y: number): Vec3 {
        const boardSize = this.gridSize * this.spacingY;
        const startX = -boardSize / 2 + this.spacingX / 2;
        const startY = boardSize / 2 - this.spacingY / 2;
        return new Vec3(
            startX + (x + 2) * this.spacingX,
            startY - (y + 2) * this.spacingY,
            0
        );
    }

    // ===== 事件處理方法 =====
    async onPointClicked(point: Node) {
        console.log("GameManager::onPointClicked", point.name);
        const [_, x, y] = point.name.split('-').map(Number);
        try{
            this.gameData = await this.gameApi.move(this.isGoatTurn?2:1,x,y)
        }catch(error){
            console.log("請求遊戲移動失敗",error,this.isGoatTurn,x,y)
        }
        //畫面更新旗子的移動
        if (this.isGoatTurn) {
            this.handleGoatTurn(point, x, y);
        } else {
            this.handleTigerTurn(point, x, y);
        }
        //如果ai有移動
        if(this.gameData.isAIGame && this.gameData.state.lastMove != null){
            if(this.gameData.state.lastMove.pieceType == CellState.TIGER){
                const tigerPoint:Node = this.boardNode.getChildByName(`point-${this.gameData.state.lastMove.from.x}-${this.gameData.state.lastMove.from.y}`);
                this.handleTigerTurn(tigerPoint,this.gameData.state.lastMove.from.x,this.gameData.state.lastMove.from.y)
            }
            else if (this.gameData.state.lastMove.pieceType == CellState.GOAT){
                //to do goat ai
            }
        }

    }

    private handleGoatTurn(point: Node, x: number, y: number) {
        if (this.boardState[x][y] !== CellState.EMPTY) {
            console.log("該位置已經有棋子");
            return;
        }
        this.placeGoat(point, x, y);
    }

    private handleTigerTurn(point: Node, x: number, y: number) {
        console.log('handleTigerTurn::ai',this.boardState[x][y]);
        if (!this.selectedTiger || this.boardState[x][y] == CellState.TIGER) {
            if (this.boardState[x][y] == CellState.TIGER) {
                this.selectedTiger = this.boardNode.getChildByName(`tiger-${x}-${y}`);
                //計算老虎可以走的位置 & 還有可以點選的點位
                 this.calculateTigerMovePositions(this.selectedTiger);
            }
            //如果不是ai就要分兩次click，如果是的話就一次完成所以不return
            if(this.gameData.isAIGame==false){
                return;
            }
            else{
                console.log('handleTigerTurn::ai',this.selectedTiger);
                point = this.boardNode.getChildByName(`point-${this.gameData.state.lastMove.to.x}-${this.gameData.state.lastMove.to.y}`);
                x = this.gameData.state.lastMove.to.x
                y = this.gameData.state.lastMove.to.y
            }
        }
        if (this.boardState[x][y] == CellState.GOAT) {
            console.log("目標位置已有棋子");
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
        this.boardState[x][y] = CellState.GOAT;
        goat.setSiblingIndex(this.boardNode.children.length - 1);
        
        // 更新 Point 組件的狀態
        const pointComp = point.getComponent(Point);
        if (pointComp) {
            pointComp.setPiece(CellState.GOAT);
        }
        
        this.goatCount++;
        console.log("放置山羊成功，當前山羊數量：", this.goatCount);
        this.setTurn(CellState.TIGER)
        this.checkWinCondition();
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
        } else {
            console.warn("無法獲取山羊圖片");
        }
    }

    // 檢查指定位置是否為空且不超出邊界
    private isValidPosition(main:{x:number,y:number}, dir:{x:number,y:number}): {x:number,y:number} {
        if(this.boardState[dir.x]?.[dir.y]=== CellState.EMPTY){
            return {x:dir.x , y:dir.y}
        }
        else if(this.boardState[dir.x]?.[dir.y]=== CellState.GOAT){
            const jump:{x:number,y:number} = {x:dir.x,y:dir.y};
            if(dir.x - main.x == 1){
                jump.x ++;
            }
            else if(dir.x - main.x == -1){
                jump.x --;
            }
            if(dir.y - main.y == 1){
                jump.y ++;
            }
            else if(dir.y - main.y == -1){
                jump.y --;
            }
            
            if(this.boardState[jump.x]?.[jump.y]=== CellState.EMPTY) return jump;
            else return null;
        }
        else{
            return null;
        }
    }

    private highlightIfValid(main: {x: number, y: number}, dir: {x: number, y: number}): void {
        const pos = this.isValidPosition(main, dir);
        if (pos) this.setHighlight(pos.x, pos.y);
    }

    private calculateTigerMovePositions(tiger: Node):void{
        const [_,x, y] = tiger.name.split('-').map(Number);
        const main = {x, y};
        
        // 1. 上下左右
        this.highlightIfValid(main, {x, y: y+1});
        this.highlightIfValid(main, {x, y: y-1});
        this.highlightIfValid(main, {x: x+1, y});
        this.highlightIfValid(main, {x: x-1, y});
        
        // 2. 對角線
        if((x+y)%2==0){
            this.highlightIfValid(main, {x: x+1, y: y+1});
            this.highlightIfValid(main, {x: x-1, y: y+1});
            this.highlightIfValid(main, {x: x+1, y: y-1});
            this.highlightIfValid(main, {x: x-1, y: y-1});
        }
    }

    private calcuateTypePositions(type: CellState):void{
        this.resetHighlight();
        for(let i:number=0;i<this.boardState.length;i++){
            for(let j:number=0;j<this.boardState[i].length;j++){
                if (this.boardState[i][j] === type) {
                    this.setHighlight(i, j);
                }
            }
        }
    }

    private setHighlight(x: number, y: number) {
        const point = this.getPoint(x, y);
        if (point) {
            const pointComp = point.getComponent(Point);
            if (pointComp) {
                pointComp.setHighlight(true);
            }
        }
    }

    private resetHighlight() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const point = this.pointNodes[x][y];
                if (point) {
                    const pointComp = point.getComponent(Point);
                    if (pointComp) {
                        pointComp.setHighlight(false);
                    }
                }
            }
        }
    }

    private moveTiger(point: Node, x: number, y: number) {
        const [_, oldX, oldY] = this.selectedTiger.name.split('-').map(Number);        
        const tiger = this.boardNode.getChildByName(this.selectedTiger.name);
        if (tiger) {
            const worldPos = point.getWorldPosition();
            const localPos = this.boardNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
            tiger.setPosition(localPos);
            this.boardState[oldX][oldY] = CellState.EMPTY;
            this.boardState[x][y] = CellState.TIGER;
            tiger.name = `tiger-${x}-${y}`;
            
            // 更新舊位置的 Point 組件狀態
            const oldPoint = this.getPoint(oldX, oldY);
            if (oldPoint) {
                const oldPointComp = oldPoint.getComponent(Point);
                if (oldPointComp) {
                    oldPointComp.setPiece(CellState.EMPTY);
                    oldPointComp.setHighlight(false);
                }
            }
            
            // 更新新位置的 Point 組件狀態
            const pointComp = point.getComponent(Point);
            if (pointComp) {
                pointComp.setPiece(CellState.TIGER);
                pointComp.setHighlight(false);
            }
        }

        this.checkGoatCapture(oldX, oldY, x, y);
        this.selectedTiger = null;
        this.setTurn(CellState.GOAT);
    }

    private checkWinCondition() {
        // 檢查老虎是否獲勝（吃掉5隻山羊）
        if (this.dieGoat >= 5) {
            this.showWinScreen(true);
            return;
        }

        // 檢查山羊是否獲勝（困住所有老虎）
        let allTigersTrapped = true;
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if (this.boardState[x][y] === CellState.TIGER) {
                    // 檢查老虎是否有可移動的位置
                    const hasValidMove = this.checkTigerHasValidMove(x, y);
                    if (hasValidMove) {
                        allTigersTrapped = false;
                        break;
                    }
                }
            }
            if (!allTigersTrapped) break;
        }

        if (allTigersTrapped) {
            this.showWinScreen(false);
        }
    }

    private checkTigerHasValidMove(x: number, y: number): boolean {
        const main = { x, y };
        
        // 檢查所有可能的方向
        const directions = [
            { x, y: y + 1 }, { x, y: y - 1 },
            { x: x + 1, y }, { x: x - 1, y }
        ];

        // 如果是對角線位置，添加對角線方向
        if ((x + y) % 2 === 0) {
            directions.push(
                { x: x + 1, y: y + 1 }, { x: x - 1, y: y + 1 },
                { x: x + 1, y: y - 1 }, { x: x - 1, y: y - 1 }
            );
        }

        // 檢查每個方向是否有有效移動
        for (const dir of directions) {
            const result = this.isValidPosition(main, dir);
            if (result) return true;
        }

        return false;
    }

    private showWinScreen(isTigerWin: boolean) {
        const winScreenComp = this.winScreen.getComponent(WinScreen);
        if (winScreenComp) {
            winScreenComp.showWinScreen(isTigerWin);
        }
    }

    public hideWinScreen() {
        const winScreenComp = this.winScreen.getComponent(WinScreen);
        if (winScreenComp) {
            winScreenComp.hideWinScreen();
        }
    }

    /**
     * 判斷羊是不是有要被吃
     * @param oldX 
     * @param oldY 
     * @param newX 
     * @param newY 
     */
    private checkGoatCapture(oldX: number, oldY: number, newX: number, newY: number) {
        const midX = (oldX + newX) / 2;
        const midY = (oldY + newY) / 2;
        
        if (this.boardState[midY]?.[midX] === CellState.GOAT) {
            const goatName = `goat-${midX}-${midY}`;
            const goat = this.boardNode.getChildByName(goatName);
            if (goat) {
                goat.destroy();
                this.boardState[midX][midY] = CellState.EMPTY;
                this.goatCount--;
                this.dieGoat++;
                console.log("老虎吃掉一隻羊！");
                this.checkWinCondition(); // 檢查是否獲勝
            }
        }
    }

    private getPoint(x: number, y: number): Node | null {
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
            return this.pointNodes[x][y];
        }
        console.warn('GameManager::getPoint::沒有抓到對應的point',x,y);
        return null;
    }
}
