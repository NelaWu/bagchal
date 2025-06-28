import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame, tween, Vec3, director, Color, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WinScreen')
export class WinScreen extends Component {
    @property(Node)
    winPanel: Node = null;

    @property(Label)
    title:Label = null;
    
    @property(Label)
    winnerLabel: Label = null;

    @property(Sprite)
    winner: Sprite = null;

    @property(SpriteFrame)
    tigerWinSprite: SpriteFrame = null;

    @property(SpriteFrame)
    goatWinSprite: SpriteFrame = null;

    public hideWinScreen() {
        console.log('WinScreen::hideWinScreen - 隱藏等待畫面');
        // 隱藏整個 WinScreen 節點
        this.node.active = false;
    }

    public showUnclick(){
        console.log('WinScreen::showUnclick - 顯示等待畫面');
        // 顯示整個 WinScreen 節點
        this.node.active = true;
        
        // 設置等待文字 - 添加空值檢查
        if (this.title) {
            this.title.string = '稍等！';
        }
        
        if (this.winnerLabel) {
            this.winnerLabel.string = '因為開發者是免費仔，所以需要等server回傳比較久';
        }
    }

    public showWinScreen(isTigerWin: boolean) {
        // 顯示整個 WinScreen 節點
        this.node.active = true;
        
        // 設置獲勝者文字 - 添加空值檢查
        if (this.title) {
            this.title.string = "獲勝！";
        }
        
        if (this.winnerLabel) {
            this.winnerLabel.string = isTigerWin ? "老虎獲勝！" : "山羊獲勝！";
        }
        
        // 設置背景圖片 - 添加空值檢查
        if (this.winner && (isTigerWin ? this.tigerWinSprite : this.goatWinSprite)) {
            this.winner.spriteFrame = isTigerWin ? this.tigerWinSprite : this.goatWinSprite;
        }
    }

    private onRestartClick() {
        // 隱藏獲勝畫面
        this.hideWinScreen();
        // 重新加載場景
        director.loadScene('main');
    }
} 