import Phaser from 'phaser';

export default class Vitalik extends Phaser.Physics.Arcade.Sprite {
    declare public body: Phaser.Physics.Arcade.Body;
    private moveTween: Phaser.Tweens.Tween | null = null;
    private isPickingUp: boolean = false;
    private isMasked: boolean = false;
    private footstepSound: Phaser.Sound.BaseSound; // <-- ADDED VARIABLE FOR FOOTSTEPS

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const masked = scene.registry.get('is_masked') || false;
        super(scene, x, y, masked ? 'v_mask_walk_sheet' : 'v_walk_sheet', 0);

        this.isMasked = masked;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);

        // --- ADDED FOOTSTEP SOUND CONFIGURATION ---
        this.footstepSound = scene.sound.add('footstep', { volume: 0.3, loop: true });

        // Clean up sound from memory if the character is removed from the scene
        this.on('destroy', () => {
            if (this.footstepSound) this.footstepSound.destroy();
        });

        this.createAnims();
    }

    private createAnims() {
        if (!this.scene.anims.exists('v_walk')) {
            this.scene.anims.create({
                key: 'v_walk',
                frames: this.scene.anims.generateFrameNumbers('v_walk_sheet', { start: 1, end: 6 }),
                frameRate: 10, repeat: -1
            });
        }
        if (!this.scene.anims.exists('v_pickup')) {
            this.scene.anims.create({
                key: 'v_pickup',
                frames: this.scene.anims.generateFrameNumbers('v_pickup_sheet', { start: 0, end: 3 }),
                frameRate: 10, repeat: 0
            });
        }

        if (!this.scene.anims.exists('v_mask_walk')) {
            this.scene.anims.create({
                key: 'v_mask_walk',
                frames: this.scene.anims.generateFrameNumbers('v_mask_walk_sheet', { start: 1, end: 6 }),
                frameRate: 10, repeat: -1
            });
        }
        if (!this.scene.anims.exists('v_mask_pickup')) {
            this.scene.anims.create({
                key: 'v_mask_pickup',
                frames: this.scene.anims.generateFrameNumbers('v_mask_pickup_sheet', { start: 0, end: 3 }),
                frameRate: 10, repeat: 0
            });
        }
    }

    public moveTo(targetX: number, targetY: number) {
        if (this.isPickingUp) return;
        if (this.moveTween) this.moveTween.stop();

        this.setTexture(this.isMasked ? 'v_mask_walk_sheet' : 'v_walk_sheet');
        this.body.setSize(200, 583);

        const deltaX = targetX - this.x;
        this.setFlipX(deltaX < 0);
        this.play(this.isMasked ? 'v_mask_walk' : 'v_walk', true);

        // --- ENABLE FOOTSTEPS ---
        if (!this.footstepSound.isPlaying) {
            this.footstepSound.play();
        }

        const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        this.moveTween = this.scene.tweens.add({
            targets: this, x: targetX, y: targetY,
            duration: distance * 3.5, ease: 'Linear',
            onComplete: () => this.stopMovement()
        });
    }

    public playPickup() {
        if (this.isPickingUp) return;
        this.isPickingUp = true;
        if (this.moveTween) this.moveTween.stop();
        this.anims.stop();

        // --- STOP FOOTSTEPS ON PICKUP ---
        if (this.footstepSound.isPlaying) this.footstepSound.stop();

        const textureKey = this.isMasked ? 'v_mask_pickup_sheet' : 'v_pickup_sheet';
        const animKey = this.isMasked ? 'v_mask_pickup' : 'v_pickup';

        this.setTexture(textureKey);
        this.body.setSize(400, 583);
        this.play(animKey);

        this.once('animationcomplete', (anim: Phaser.Animations.Animation) => {
            if (anim.key === 'v_pickup' || anim.key === 'v_mask_pickup') {
                this.setTexture(this.isMasked ? 'v_mask_walk_sheet' : 'v_walk_sheet');
                this.body.setSize(200, 583);
                this.setFrame(0);
                this.isPickingUp = false;
                this.emit('collected');
            }
        });
    }

    public playWearMask() {
        if (this.isMasked) return;
        this.isMasked = true;
        this.scene.registry.set('is_masked', true);
        this.setTexture('v_mask_walk_sheet');
        this.body.setSize(200, 583);
        this.setFrame(0);
        console.log("Vitalik is now wearing a mask");
    }

    public stopMovement() {
        if (this.moveTween) this.moveTween.stop();
        this.anims.stop();

        // --- STOP FOOTSTEPS ON STOP ---
        if (this.footstepSound && this.footstepSound.isPlaying) {
            this.footstepSound.stop();
        }

        this.setTexture(this.isMasked ? 'v_mask_walk_sheet' : 'v_walk_sheet');
        this.body.setSize(200, 583);
        this.setFrame(0);
        this.moveTween = null;
        this.isPickingUp = false;
    }

    public updateEntity() {
        // Dynamic scaling to create a perspective effect
        const factor = Phaser.Math.Clamp((this.y - 700) / 380, 0, 1);
        const scale = Phaser.Math.Linear(0.55, 0.85, factor);

        this.setScale(scale);
        this.setDepth(this.y);
    }
}