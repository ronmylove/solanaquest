import Phaser from 'phaser';

export default class PhoneScene extends Phaser.Scene {
    private board: number[] = [];
    private tiles: (Phaser.GameObjects.Container | null)[] = [];
    private emptyIndex: number = 5;
    private isSolved: boolean = false;

    private cols = 2;
    private rows = 3;
    // Slightly reduced tile size to fit everything neatly
    private tileWidth = 150;
    private tileHeight = 190;
    // New start coordinates, centered according to the new design
    private startX = 960 - 75;
    private startY = 520 - 190; // Slightly higher to make room for the bottom button

    constructor() { super({ key: 'Phone' }); }

    create() {
        // 1. Dark background overlay
        this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.9).setInteractive();

        // --- TRENDY PHONE INTERFACE ---

        // Neon Glow behind the phone
        const glow = this.add.graphics();
        glow.fillStyle(0x00ffcc, 0.1);
        glow.fillRoundedRect(960 - 230, 540 - 410, 460, 820, 40);

        // Phone Body
        const phoneBody = this.add.graphics();
        phoneBody.fillStyle(0x111111, 1); // Almost black body
        phoneBody.lineStyle(4, 0x00ffcc, 1); // Neon outline
        phoneBody.fillRoundedRect(960 - 220, 540 - 400, 440, 800, 30);
        phoneBody.strokeRoundedRect(960 - 220, 540 - 400, 440, 800, 30);

        // Phone Screen (inner area)
        const screen = this.add.graphics();
        screen.fillStyle(0x050505, 1); // Dark screen
        screen.fillRoundedRect(960 - 200, 540 - 380, 400, 700, 20);

        // Top Bar (header area)
        const topBar = this.add.graphics();
        topBar.fillStyle(0x00ffcc, 0.1);
        topBar.fillRoundedRect(960 - 200, 160, 400, 60, { tl: 20, tr: 20, bl: 0, br: 0 });

        // Header Title
        this.add.text(960, 190, 'RESTORE ACCESS', {
            fontSize: '24px', color: '#00ffcc', fontStyle: 'bold', fontFamily: 'Arial'
        }).setOrigin(0.5).setShadow(0, 0, '#00ffcc', 8);

        this.initBoard();
        this.drawBoard();

        // --- BOTTOM BAR WITH CLOSE BUTTON ---
        const bottomBarY = 900;
        const bottomBar = this.add.graphics();
        bottomBar.fillStyle(0x1a1a1a, 1);
        bottomBar.fillRoundedRect(960 - 200, bottomBarY - 30, 400, 60, { tl: 0, tr: 0, bl: 20, br: 20 });
        bottomBar.lineStyle(2, 0x00ffcc, 0.5);
        bottomBar.strokeRoundedRect(960 - 200, bottomBarY - 30, 400, 60, { tl: 0, tr: 0, bl: 20, br: 20 });


        // Stylish Close Button
        const exitBtnText = this.add.text(960, bottomBarY, '✕ CLOSE INTERFACE', {
            fontSize: '20px', color: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5);

        const exitBtnContainer = this.add.container(0, 0, [bottomBar, exitBtnText])
            .setSize(400, 60)
            .setInteractive(new Phaser.Geom.Rectangle(960 - 200, bottomBarY - 30, 400, 60), Phaser.Geom.Rectangle.Contains);

        exitBtnContainer.on('pointerdown', () => {
            this.scene.resume('Pharmacy');
            this.scene.stop();
        });

        // Hover Effects
        exitBtnContainer.on('pointerover', () => exitBtnText.setColor('#ffffff'));
        exitBtnContainer.on('pointerout', () => exitBtnText.setColor('#ff4444'));
    }

    private initBoard() {
        this.board = [1, 2, 3, 4, 0, 5];
        this.emptyIndex = 4;
    }

    private drawBoard() {
        this.tiles.forEach(t => t?.destroy());
        this.tiles = [];

        for (let i = 0; i < 6; i++) {
            const val = this.board[i];
            if (val === 0) {
                this.tiles.push(null);
                continue;
            }

            const { x, y } = this.getPosByIndex(i);

            let textureKey = '';
            if (val >= 1 && val <= 4) {
                textureKey = `magic_${val}`;
            } else if (val === 5) {
                textureKey = 'solana_logo';
            }

            // Tile Image
            const tileImage = this.add.image(0, 0, textureKey);
            // Adjust size to leave room for the border
            tileImage.setDisplaySize(this.tileWidth - 8, this.tileHeight - 8);

            // Stylish Neon Border
            const border = this.add.graphics();
            border.lineStyle(3, 0x00ffcc, 1);
            border.strokeRect(-(this.tileWidth - 8) / 2, -(this.tileHeight - 8) / 2, this.tileWidth - 8, this.tileHeight - 8);
            // Slight glow for the border
            border.lineStyle(6, 0x00ffcc, 0.3);
            border.strokeRect(-(this.tileWidth - 8) / 2, -(this.tileHeight - 8) / 2, this.tileWidth - 8, this.tileHeight - 8);

            const tileContainer = this.add.container(x, y, [tileImage, border])
                .setSize(this.tileWidth, this.tileHeight)
                .setInteractive({ useHandCursor: true });

            tileContainer.on('pointerdown', () => this.moveTile(i));
            this.tiles.push(tileContainer);
        }
    }

    private getPosByIndex(index: number) {
        const col = index % this.cols;
        const row = Math.floor(index / this.cols);
        return {
            x: this.startX + col * this.tileWidth,
            y: this.startY + row * this.tileHeight
        };
    }

    // MINI-TRANSACTIONS
    private async moveTile(index: number) {
        if (this.isSolved) return;

        const emptyCol = this.emptyIndex % this.cols;
        const emptyRow = Math.floor(this.emptyIndex / this.cols);
        const tileCol = index % this.cols;
        const tileRow = Math.floor(index / this.cols);

        const isAdjacent = Math.abs(emptyCol - tileCol) + Math.abs(emptyRow - tileRow) === 1;

        if (isAdjacent) {
            console.log(`[MagicBlock ER] Micro-tx: Moving Tile ID ${this.board[index]} (Gasless)`);
            this.board[this.emptyIndex] = this.board[index];
            this.board[index] = 0;
            this.emptyIndex = index;
            this.drawBoard();
            this.checkWin();
        }
    }

    private checkWin() {
        const winState = [1, 2, 3, 4, 5, 0];
        this.isSolved = this.board.every((val, i) => val === winState[i]);
        if (this.isSolved) {
            this.showConnectButton();
        }
    }

    private showConnectButton() {
        this.add.text(960, 740, 'NETWORK RESTORED!', {
            fontSize: '26px', color: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#00ff00', 8);

        // Stylish MagicBlock Button
        const btnContainer = this.add.container(960, 810);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x00ffcc, 1);
        btnBg.fillRoundedRect(-180, -30, 360, 60, 15);

        const btnText = this.add.text(0, 0, 'CONNECT', {
            fontSize: '20px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnText]);
        btnContainer.setSize(360, 60).setInteractive({ useHandCursor: true });

        btnContainer.on('pointerdown', async () => {
            btnContainer.disableInteractive();
            btnText.setText('FINALIZING MINT...');
            btnBg.clear().fillStyle(0xaaaaaa, 1).fillRoundedRect(-180, -30, 360, 60, 15);

            console.log("MagicBlock: Sending final Mint Tx to 35pT4bKu7ym3A5ornvD93Ypd4fMAvvEdM8Y2S2SVvQto");

            try {
                await new Promise(resolve => setTimeout(resolve, 300));
                console.log("MagicBlock: Final State Confirmed!");
                btnText.setText('SUCCESS (ON-CHAIN)');
                btnBg.clear().fillStyle(0x00ff00, 1).fillRoundedRect(-180, -30, 360, 60, 15);

                this.time.delayedCall(1200, () => {
                    this.registry.set('wifi_unlocked', true);

                    // Call the new reliable ending sequence
                    this.triggerFinalEnding();
                });
            } catch (error) {
                console.error("Mint Error:", error);
                btnText.setText('RETRY');
                btnContainer.setInteractive();
                btnBg.clear().fillStyle(0xff0000, 1).fillRoundedRect(-180, -30, 360, 60, 15);
            }
        });
    }

    private triggerFinalEnding() {
        // 1. Flash and shake effect right on the phone scene
        this.cameras.main.flash(500, 255, 255, 255);
        this.cameras.main.shake(1000, 0.02);

        this.time.delayedCall(1000, () => {
            // 2. Draw an absolute black box over EVERYTHING
            const blackScreen = this.add.rectangle(960, 540, 4000, 4000, 0x000000)
                .setDepth(9998)
                .setAlpha(0)
                .setInteractive(); // Blocks all clicks

            // 3. Create the text
            const finalMessage = "STAGE ONE COMPLETE\n\nMany more adventures await...\nMysterious Private Island, a secret Moon Base, and much more!\n\nLeave a like and show your support\nso I know you want to see what happens next!";

            const outroText = this.add.text(960, 540, finalMessage, {
                fontSize: '46px',
                color: '#00ffcc',
                align: 'center',
                fontStyle: 'bold',
                lineSpacing: 25
            }).setOrigin(0.5).setDepth(9999).setAlpha(0);

            // 4. Fade everything in smoothly
            this.tweens.add({
                targets: [blackScreen, outroText],
                alpha: 1,
                duration: 2000,
                ease: 'Power2'
            });
        });
    }

}
