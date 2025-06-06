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

    public hideWinScreen() {
        // 隱藏整個 WinScreen 節點
        this.node.active = false;
    }

    public showWinScreen(isTigerWin: boolean) {
        // 顯示整個 WinScreen 節點
        this.node.active = true;
        // 設置獲勝者文字
        this.winnerLabel.string = isTigerWin ? "老虎獲勝！" : "山羊獲勝！";
        
        // 設置背景圖片
        this.winner.spriteFrame = isTigerWin ? this.tigerWinSprite : this.goatWinSprite;
    }

    private onRestartClick() {
        // 隱藏獲勝畫面
        this.hideWinScreen();
        // 重新加載場景
        director.loadScene('main');
    }
} 