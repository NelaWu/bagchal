import { _decorator, Component, Node,  UITransform, BoxCollider2D, Vec2, Button, Sprite, SpriteFrame } from 'cc';
import { GameManager,CellState } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('Point')
export class Point extends Component {

    @property(Node)
    highlight: Node = null; // 發光圈（子節點）

    private piece: Node | null = null;  // 可以存放老虎或山羊的棋子
    private sprite: Sprite = null;
    highlightSprite: SpriteFrame = null;

    get getPiece():Node|null{
        return this.piece;
    }

    start() {
        // 確保點位有 BoxCollider2D 組件
        let collider = this.getComponent(BoxCollider2D);
        if (!collider) {
            collider = this.addComponent(BoxCollider2D);
        }

        // 設置碰撞區域大小
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            collider.size = uiTransform.contentSize;
            collider.offset = new Vec2(0, 0);
        }

        // 添加按鈕組件處理點擊
        const button = this.getComponent(Button) || this.addComponent(Button);
        button.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);

        // 獲取 Sprite 組件
        this.sprite = this.getComponent(Sprite);
        this.highlightSprite = this.sprite.spriteFrame;
        // 初始狀態不顯示圖片
        this.sprite.spriteFrame = null;
    }

    private onTouchEnd() {
        // 通知 GameManager 這個點被點擊了
        this.node.emit("point-clicked", this.node);
    }

    public setPiece(type:CellState):void{
        switch(type){
            case CellState.EMPTY:
                this.piece = null;
                break;
            case CellState.GOAT:
                const [_, x, y] = this.node.name.split('-').map(Number);
                this.piece = this.node.parent.getChildByName(`goat-${x}-${y}`);
                break;
            case CellState.TIGER:
                const [__, tigerX, tigerY] = this.node.name.split('-').map(Number);
                this.piece = this.node.parent.getChildByName(`tiger-${tigerX}-${tigerY}`);
                break;
        }
    }

    // 設置高亮狀態
    public setHighlight(active: boolean): void {
        console.log("Point::setHighlight", active,this.sprite);
        if (this.sprite) {
            this.sprite.spriteFrame = active ? this.highlightSprite : null;
        }
    }
}
