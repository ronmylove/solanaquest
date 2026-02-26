import Phaser from 'phaser'
import Vitalik from '../entities/Vitalik'

export default class PharmacyScene extends Phaser.Scene {
    private vitalik!: Vitalik;
    private vendor!: Phaser.GameObjects.Sprite;
    private routerZone!: Phaser.GameObjects.Zone;
    private subtitleText!: Phaser.GameObjects.Text;
    private isBlocked: boolean = false;

    private readonly triggerLineX = 580;
    private readonly floorYMin = 850;
    private readonly floorYMax = 1050;

    constructor() { super({ key: 'Pharmacy' }) }

    create() {
        this.isBlocked = false;

        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'pharmacy_bg');
        bg.setDisplaySize(this.scale.width, this.scale.height);

        const vX = 1413;
        const vY = 605;
        const vScale = 0.58;

        this.vendor = this.add.sprite(vX, vY, 'vendor_pharmacy', 0)
            .setScale(vScale)
            .setOrigin(0.5, 1);
        this.vendor.setDepth(600);

        this.routerZone = this.add.zone(960, 480, 200, 150)
            .setInteractive({ useHandCursor: true });

        this.routerZone.on('pointerdown', () => {
            if (this.isBlocked) return;

            const dist = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, 960, 950);

            if (dist < 300) {
                this.handleRouterInteraction();
            } else {
                this.vitalik.moveTo(960, 950);
            }
        });

        this.subtitleText = this.add.text(960, 950, '', {
            fontSize: '28px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 15, y: 8 },
            wordWrap: { width: 1400 },
            align: 'center'
        }).setOrigin(0.5).setDepth(5000).setVisible(false);

        this.vitalik = new Vitalik(this, 300, 950);
        this.vitalik.setScale(0.9);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isBlocked) return;
            const hits = this.input.hitTestPointer(pointer);
            if (hits.length > 0) return;
            this.vitalik.moveTo(pointer.x, Phaser.Math.Clamp(pointer.y, this.floorYMin, this.floorYMax));
        });

        this.createExitButton();
        this.createInventoryButton();
    }

    private hasCertificate(): boolean {
        const inv = this.registry.get('inventory') || [];
        return inv.some((item: any) => item.id === 'vaccine_cert');
    }

    private handleRouterInteraction() {
        if (this.hasCertificate()) {
            // CHECK: If Wi-Fi is already unlocked (puzzle solved)
            if (this.registry.get('wifi_unlocked')) {
                this.showSubtitle("Connection is stable. Finally, I can go online.", 3000);
                return;
            }

            // IF NOT SOLVED YET: Call the phone
            if (this.isBlocked) return;
            this.vitalik.stopMovement();
            this.isBlocked = true;

            // --- VITALIK'S SOUND WHEN INSPECTING ROUTER ---
            this.sound.stopAll();
            this.sound.play('vitalik_router_check');
            this.showSubtitle("Let's see what's wrong with the network here... Gotta fix this mess.", 2000);

            // Wait a second and open the phone scene
            this.time.delayedCall(1000, () => {
                this.isBlocked = false; // Remove block so we can walk after exiting the phone
                this.scene.pause();
                this.scene.launch('Phone');
            });

        } else {
            this.triggerKickOut();
        }
    }

    private triggerKickOut() {
        if (this.isBlocked) return;
        this.isBlocked = true;
        this.vitalik.stopMovement();

        this.vendor.setFrame(1);

        // --- VENDOR'S SOUND ---
        this.sound.stopAll();
        this.sound.play('vendor_kickout');
        this.showSubtitle("Hey! Hold it right there! No vaccine certificate, no entry! Get out of here before I call the patrol!", 3000);

        this.time.delayedCall(3000, () => {
            this.vitalik.moveTo(-100, 950);
            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.isBlocked = false;
                this.scene.start('MainGame', { x: 829, y: 980 });
            });
        });
    }

    private showSubtitle(text: string, duration: number = 3000) {
        this.subtitleText.setText(text).setVisible(true);
        this.time.delayedCall(duration, () => {
            if (this.subtitleText.text === text) this.subtitleText.setVisible(false);
        });
    }

    update() {
        this.vitalik.updateEntity();
        this.vitalik.setDepth(this.vitalik.y);

        if (!this.isBlocked && !this.hasCertificate()) {
            if (this.vitalik.x > this.triggerLineX) {
                this.triggerKickOut();
            }
        }
    }

    private createExitButton() {
        const exitBtn = this.add.text(50, 50, '< BACK TO STREET', {
            fontSize: '36px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true });

        exitBtn.on('pointerdown', () => {
            this.isBlocked = false;
            this.sound.stopAll(); // Stop sounds when exiting to the street
            this.scene.start('MainGame', { x: 829, y: 980 });
        });
    }

    private createInventoryButton() {
        const invBtn = this.add.image(1820, 100, 'inventory_icon').setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(3000);
        invBtn.on('pointerdown', () => {
            this.scene.pause(this.scene.key);
            this.scene.launch('Inventory', { from: this.scene.key });
        });
    }
}