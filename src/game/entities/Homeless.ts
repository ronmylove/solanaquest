import Phaser from 'phaser'

export default class Homeless extends Phaser.GameObjects.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'homeless_sheet', 0);
        scene.add.existing(this);
        this.setScale(0.800);
        this.setInteractive({ useHandCursor: true });

        if (this.input) {
            this.input.dropZone = true;
            this.input.hitArea.setSize(this.width, this.height);
        }
        this.setDepth(y);
    }

    // Only changing the frame, the scene will handle the text display
    public startTalking() {
        this.setFrame(1);
    }

    public stopTalking() {
        this.setFrame(0);
    }
}