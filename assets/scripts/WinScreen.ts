import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame, tween, Vec3, director, Color, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WinScreen')
export class WinScreen extends Component {
    @property(Node)
    winPanel: Node = null;

    @property(Label)
    winnerLabel: Label = null;

    @property(Sprite)
    winner: Sprite = null;

    @property(SpriteFrame)
    tigerWinSprite: SpriteFrame = null;

    @property(SpriteFrame)
    goatWinSprite: SpriteFrame = null;

    start() {
        // // 設置背景大小為全屏
        // const canvas = this.node.parent;
        // if (canvas) {
        //     const canvasTransform = canvas.getComponent(UITransform);
        //     if (canvasTransform) {
        //         const backgroundTransform = this.background.getComponent(UITransform);
        //         if (backgroundTransform) {
        //             backgroundTransform.setContentSize(canvasTransform.contentSize);
        //         }
        //     }
        // }
    }

    public hideWinScreen() {
        // 隱藏整個 WinScreen 節點
        this.node.active = false;
    }

    public showWinScreen(isTigerWin: boolean) {
        console.log("WinScreen showWinScreen: Current active state:", this.node.active);
        // 顯示整個 WinScreen 節點
        this.node.active = true;
        console.log("WinScreen showWinScreen: After setting active to true:", this.node.active);
        
        // // 顯示背景和面板
        // this.background.node.active = true;
        // this.winPanel.active = true;
        
        // // 設置背景漸變效果
        // this.background.color = new Color(0, 0, 0, 0);
        // tween(this.background)
        //     .to(0.5, { color: new Color(0, 0, 0, 180) })
        //     .start();
        
        // 設置獲勝者文字
        this.winnerLabel.string = isTigerWin ? "老虎獲勝！" : "山羊獲勝！";
        
        // 設置背景圖片
        this.winner.spriteFrame = isTigerWin ? this.tigerWinSprite : this.goatWinSprite;
        
        // // 添加面板彈出動畫
        // this.winPanel.scale = Vec3.ZERO;
        // tween(this.winPanel)
        //     .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        //     .start();
    }

    private onRestartClick() {
        // 隱藏獲勝畫面
        this.hideWinScreen();
        // 重新加載場景
        director.loadScene('main');
    }
} 