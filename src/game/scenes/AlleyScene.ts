import Phaser from 'phaser'
import Vitalik from '../entities/Vitalik'
import Homeless from '../entities/Homeless'

export default class AlleyScene extends Phaser.Scene {
    public vitalik!: Vitalik;
    public homeless!: Homeless;
    private rat!: Phaser.GameObjects.Sprite;
    private speaker!: Phaser.GameObjects.Image;
    private subtitleText!: Phaser.GameObjects.Text;

    // Lock flag during the exchange scene
    private isExchanging: boolean = false;

    private readonly floorYMin = 750;
    private readonly floorYMax = 1080;

    constructor() {
        super({ key: 'Alley' })
    }

    create() {
        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'alley_bg');
        bg.setDisplaySize(this.scale.width, this.scale.height);

        // DIALOGUE TEXT
        this.subtitleText = this.add.text(960, 950, '', {
            fontSize: '28px', color: '#ffffff', backgroundColor: '#000000aa',
            padding: { x: 15, y: 8 }, wordWrap: { width: 800 }
        }).setOrigin(0.5).setDepth(5000).setVisible(false);

        // HOMELESS PERSON
        this.homeless = new Homeless(this, 1462.5, 790.0);

        // CLICK ON HOMELESS - dialogue by quest stages
        this.homeless.on('pointerdown', () => {
            if (this.isExchanging) return;

            const dist = Phaser.Math.Distance.Between(
                this.vitalik.x, this.vitalik.y,
                this.homeless.x, this.homeless.y
            );

            if (dist > 450) {
                // Far away - just walk closer
                this.vitalik.moveTo(this.homeless.x - 200, this.vitalik.y);
                return;
            }

            // Close enough - start talking
            this.homeless.startTalking();
            this.sound.stopAll(); // Stop other sounds

            const stage = this.registry.get('homeless_quest_stage') || 0;

            if (stage === 0 || stage === 1) {
                // Haven't given the bandage yet
                this.sound.play('homeless_stage1_rats');
                this.showSubtitle("Damn rats... chewed my leg up real good. The infection is spreading. Listen, kid... if you can score me a wet bandage, I'll make it worth your while.");
                this.registry.set('homeless_quest_stage', 1);
            } else if (stage === 2) {
                // Bandage given, gave battery — asks for paper
                this.sound.play('homeless_stage2_paper');
                this.showSubtitle("Ah... that's much better. Look, I need one more favor. A roll of toilet paper. You get me that, I'll give you a medical pass. Gets you in anywhere.");
            } else if (stage === 3) {
                // Paper given too
                this.sound.play('homeless_stage3_thanks');
                this.showSubtitle("Thanks for everything, kid. People like you are the only reason this rotten city hasn't collapsed yet. Stay safe.");
            }

            // Return to idle after 4 seconds
            this.time.delayedCall(3500, () => {
                this.homeless.stopTalking();
            });
        });

        // SPEAKER in the location
        if (!this.registry.get('speaker_collected')) {
            this.speaker = this.add.image(333.0, 853.0, 'speaker_item')
                .setScale(0.096)
                .setInteractive({ useHandCursor: true });

            this.speaker.on('pointerdown', () => {
                if (this.isExchanging) return;
                const dist = Phaser.Math.Distance.Between(
                    this.vitalik.x, this.vitalik.y,
                    this.speaker.x, this.speaker.y
                );
                if (dist < 250) {
                    this.collectSpeaker();
                } else {
                    this.vitalik.moveTo(this.speaker.x + 80, this.speaker.y + 50);
                }
            });
        }

        // VITALIK
        this.vitalik = new Vitalik(this, 960, 950);
        this.vitalik.setScale(1);

        // Handle floor clicks
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isExchanging) return;
            const hits = this.input.hitTestPointer(pointer);
            if (hits.length > 0) return;

            const targetY = Phaser.Math.Clamp(pointer.y, this.floorYMin, this.floorYMax);
            this.vitalik.moveTo(pointer.x, targetY);
        });

        this.createRatLogic();
        this.createExitButton();
        this.createInventoryButton();
    }

    // ==============================================
    // MAIN METHOD: Giving wet bandage to the homeless person
    // Called from InventoryScene
    // ==============================================
    public giveBandageToHomeless() {
        this.isExchanging = true;

        // 1. Vitalik walks to the homeless person
        const targetX = this.homeless.x - 180;
        const targetY = this.homeless.y + 100;
        this.vitalik.moveTo(targetX, targetY);

        // 2. Wait until he arrives
        const checkTimer = this.time.addEvent({
            delay: 100,
            callback: () => {
                const dist = Phaser.Math.Distance.Between(
                    this.vitalik.x, this.vitalik.y, targetX, targetY
                );
                if (dist < 60) {
                    checkTimer.destroy();
                    this.performExchange();
                }
            },
            loop: true
        });
    }

    public givePaperToHomeless() {
        this.isExchanging = true;

        const targetX = this.homeless.x - 180;
        const targetY = this.homeless.y + 100;
        this.vitalik.moveTo(targetX, targetY);

        const checkTimer = this.time.addEvent({
            delay: 100,
            callback: () => {
                const dist = Phaser.Math.Distance.Between(
                    this.vitalik.x, this.vitalik.y, targetX, targetY
                );
                if (dist < 60) {
                    checkTimer.destroy();
                    this.vitalik.stopMovement();
                    this.homeless.startTalking();

                    let inv = this.registry.get('inventory') || [];
                    inv = inv.filter((item: any) => item.id !== 'paper_roll');
                    inv.push({ id: 'vaccine_cert', name: 'Vaccine Certificate', texture: 'vaccine_cert' });
                    this.registry.set('inventory', inv);
                    this.registry.set('homeless_quest_stage', 3);

                    this.sound.stopAll(); // Stop footsteps/other sounds
                    this.sound.play('homeless_gets_paper'); // Paper exchange sound

                    this.showSubtitle("Thank you so much! This stuff is pure gold nowadays! Here's that medical pass... I think it'll be very useful. You can't go anywhere without it right now.");

                    this.time.delayedCall(5000, () => {
                        this.homeless.stopTalking();
                        this.isExchanging = false;
                    });
                }
            },
            loop: true
        });
    }

    private performExchange() {
        // 1. Stop Vitalik
        this.vitalik.stopMovement();
        this.homeless.startTalking();

        // 2. Remove wet bandage from inventory, add battery
        let inv = this.registry.get('inventory') || [];
        inv = inv.filter((item: any) => item.id !== 'bandage_wet');
        inv.push({ id: 'battery', name: 'Battery', texture: 'battery_item' });
        this.registry.set('inventory', inv);

        // 3. Update quest stage
        this.registry.set('homeless_quest_stage', 2);

        // 4. Dialogue and Sound
        this.sound.stopAll(); // Turn off footsteps
        this.sound.play('homeless_gets_bandage'); // Homeless joy sound

        this.showSubtitle("Oh! A wet bandage! That's exactly what I needed... Thanks! Here, take this battery... might come in handy for you.");

        // 5. Unlock after 5 secs
        this.time.delayedCall(5000, () => {
            this.homeless.stopTalking();
            this.isExchanging = false;
        });
    }

    private collectSpeaker() {
        this.vitalik.stopMovement();
        const animKey = this.registry.get('is_masked') ? 'v_mask_pickup' : 'v_pickup';
        this.vitalik.play(animKey);

        this.vitalik.once('animationcomplete', () => {
            let inv = this.registry.get('inventory') || [];
            inv.push({ id: 'speaker', name: 'Old Speaker', texture: 'speaker_item' });
            this.registry.set('inventory', inv);
            this.registry.set('speaker_collected', true);
            if (this.speaker && this.speaker.active) this.speaker.destroy();

            // Return to idle
            const idleSheet = this.registry.get('is_masked') ? 'v_mask_walk_sheet' : 'v_walk_sheet';
            this.vitalik.setTexture(idleSheet);
            this.vitalik.setFrame(0);
        });
    }

    private showSubtitle(text: string) {
        this.subtitleText.setText(text).setVisible(true);
        this.time.delayedCall(4000, () => {
            if (this.subtitleText.text === text) this.subtitleText.setVisible(false);
        });
    }

    private createRatLogic() {
        if (!this.anims.exists('rat_run')) {
            this.anims.create({
                key: 'rat_run',
                frames: this.anims.generateFrameNumbers('rat_sheet', { start: 0, end: 6 }),
                frameRate: 8, repeat: -1
            });
        }
        this.rat = this.add.sprite(300, 1020, 'rat_sheet', 0).setScale(0.5).setDepth(1050);
        this.rat.play('rat_run');
        this.moveRat();
    }

    private moveRat() {
        const targetX = this.rat.x < 960 ? 2100 : -200;
        this.rat.setFlipX(targetX < this.rat.x);
        this.tweens.add({
            targets: this.rat, x: targetX,
            duration: Phaser.Math.Between(6000, 9000), ease: 'Linear',
            onComplete: () => {
                this.rat.stop();
                this.rat.setFrame(0);
                this.time.delayedCall(Phaser.Math.Between(1000, 3000), () => {
                    if (this.scene.isActive()) {
                        this.rat.play('rat_run');
                        this.moveRat();
                    }
                });
            }
        });
    }

    private createExitButton() {
        const btn = this.add.text(50, 50, '< BACK TO STREET', {
            fontSize: '36px', color: '#ffffff',
            backgroundColor: '#00000088', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setDepth(3000);

        btn.on('pointerdown', () => {
            if (this.isExchanging) return;
            this.sound.stopAll();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainGame', { x: 1980, y: 840 });
            });
        });
    }

    private createInventoryButton() {
        const invBtn = this.add.image(1820, 100, 'inventory_icon')
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0).setDepth(3000);

        invBtn.on('pointerdown', () => {
            if (this.isExchanging) return;
            this.scene.pause(this.scene.key);
            this.scene.launch('Inventory', { from: this.scene.key });
        });

        this.events.once('resume', () => {
            this.input.enabled = true;
        });
    }

    update() {
        if (!this.isExchanging) {
            this.vitalik.updateEntity();
        }
        this.vitalik.setDepth(this.vitalik.y);
        this.homeless.setDepth(this.homeless.y);
        if (this.speaker && this.speaker.active) {
            this.speaker.setDepth(this.speaker.y);
        }
    }
}