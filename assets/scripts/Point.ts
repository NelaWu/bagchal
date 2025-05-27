import { _decorator, Component, Node, Input, EventTouch, Sprite, UITransform, BoxCollider2D, Vec2, Vec3, Button } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('Point')
export class Point extends Component {
    @property(Node)
    highlight: Node = null; // 發光圈（子節點）

    start() {
        // 確保點擊區域與視覺效果一致
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            const boxCollider = this.getComponent(BoxCollider2D);
            if (boxCollider) {
                // 設置碰撞區域大小為點位的大小
                boxCollider.size = uiTransform.contentSize;
                // 確保碰撞區域居中
                boxCollider.offset = new Vec2(0, 0);
            }
        }

        // 添加按鈕組件來處理點擊
        const button = this.getComponent(Button) || this.addComponent(Button);
        button.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    onTouchEnd(event: EventTouch) {
        console.log("點擊點位:", this.node.name, "位置:", this.node.position);
        
        if (this.highlight) {
            this.highlight.active = true;
        }

        // 使用 GameManager 單例
        const gameManager = GameManager.instance;
        if (gameManager) {
            gameManager.onPointClicked(this.node);
        } else {
            console.warn('GameManager not found!');
        }
    }
}
