import Phaser from 'phaser'
import Vitalik from '../entities/Vitalik'

export default class ShopScene extends Phaser.Scene {
    private vitalik!: Vitalik;
    private vendor!: Phaser.GameObjects.Sprite;
    private vendorWalker!: Phaser.GameObjects.Sprite;
    private walkArea!: Phaser.Geom.Polygon;
    private pendingItem: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | null = null;
    private subtitleText!: Phaser.GameObjects.Text;

    private isVendorAngry: boolean = false;
    private lastAngerTime: number = 0;
    private isVendorLeaving: boolean = false;

    constructor() { super({ key: 'Shop' }) }

    create() {
        this.add.image(0, 0, 'shop_bg').setOrigin(0, 0).setDisplaySize(1920, 1080).setDepth(0);

        this.walkArea = new Phaser.Geom.Polygon([19, 1058, 394, 806, 1219, 814, 1411, 1073]);

        this.subtitleText = this.add.text(960, 950, '', {
            fontSize: '28px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setDepth(6000).setVisible(false);

        // Old vendor behind the counter
        this.vendor = this.add.sprite(1625, 529, 'vendor_sheet', 0).setScale(0.73).setDepth(5);

        // Walk animation
        if (!this.anims.exists('vendor_walk_anim')) {
            this.anims.create({
                key: 'vendor_walk_anim',
                frames: this.anims.generateFrameNumbers('vendor_walk', { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // WALKING VENDOR: Y position set to 720 (higher), Depth to 3000 (above Vitalik)
        this.vendorWalker = this.add.sprite(960, 720, 'vendor_walk', 0)
            .setScale(1)
            .setDepth(3000)
            .setVisible(false);

        this.add.image(0, 0, 'shop_foreground').setOrigin(0, 0).setDisplaySize(1920, 1080).setDepth(20);

        this.vitalik = new Vitalik(this, 350, 950);

        const speakerPlaced = this.registry.get('speaker_placed');
        const vendorLeft = this.registry.get('vendor_left');

        if (speakerPlaced && !vendorLeft) {
            this.runVendorLeavingSequence();
        } else if (vendorLeft) {
            this.vendor.setVisible(false);
            this.vendorWalker.setVisible(false);
        } else {
            this.vendor.setVisible(true).setInteractive({ useHandCursor: true });
        }

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isVendorLeaving) return;
            const hits = this.input.hitTestPointer(pointer);
            if (hits.length > 0) return;
            if (Phaser.Geom.Polygon.Contains(this.walkArea, pointer.x, pointer.y)) {
                const isMasked = this.registry.get('is_masked') || false;
                let targetX = pointer.x;
                if (!isMasked && targetX > 750 && !this.registry.get('vendor_left')) targetX = 750;
                this.vitalik.moveTo(targetX, pointer.y);
                this.pendingItem = null;
            }
        });

        this.createExitButton();
        this.createInventoryButton();
        this.setupShopItems();
    }

    private runVendorLeavingSequence() {
        this.isVendorLeaving = true;
        this.vitalik.stopMovement();

        this.vendor.setVisible(false);
        this.vendorWalker.setVisible(true).setFrame(0);

        // --- AUDIO: Vendor complains about competitors ---
        this.sound.stopAll();
        this.sound.play('alley_vendor_competitors');
        this.showSubtitle("Damn competitors popping up everywhere... As if making a living in this dump wasn't hard enough already.");

        this.time.delayedCall(3000, () => {
            // FIXED: Removed FlipX, as the sprite is already facing left
            this.vendorWalker.setFlipX(false).play('vendor_walk_anim');

            this.tweens.add({
                targets: this.vendorWalker,
                x: 120, // Walk exactly to the door
                duration: 3500,
                onComplete: () => {
                    this.vendorWalker.setVisible(false); // Disappear at the door
                    this.registry.set('vendor_left', true);
                    this.isVendorLeaving = false;
                }
            });
        });
    }

    private showSubtitle(text: string) {
        this.subtitleText.setText(text).setVisible(true);
        this.time.delayedCall(3000, () => this.subtitleText.setVisible(false));
    }

    private setupShopItems() {
        const isCollected = this.registry.get('antiseptic_collected');
        if (!isCollected) {
            const antiseptic = this.add.image(800, 700, 'antiseptic').setScale(0.8).setInteractive({ useHandCursor: true }).setDepth(15);
            antiseptic.on('pointerdown', () => {
                const vendorLeft = this.registry.get('vendor_left');
                if (!this.registry.get('is_masked') && antiseptic.x > 750 && !vendorLeft) this.vitalik.moveTo(750, 820);
                else { this.vitalik.moveTo(antiseptic.x, 820); this.pendingItem = antiseptic; }
            });
        }

        const paperCollected = this.registry.get('paper_collected');
        if (!paperCollected) {
            const paper = this.add.image(1103, 629, 'paper_roll').setScale(0.2).setDepth(15).setInteractive({ useHandCursor: true });
            paper.on('pointerdown', () => { this.vitalik.moveTo(paper.x, 820); this.pendingItem = paper; });
        }
    }

    update(time: number) {
        this.vitalik.updateEntity();
        const factor = Phaser.Math.Clamp((this.vitalik.y - 800) / 260, 0, 1);
        this.vitalik.setScale(Phaser.Math.Linear(0.85, 1.1, factor)).setDepth(this.vitalik.y);

        const vendorLeft = this.registry.get('vendor_left');
        if (!vendorLeft) this.checkVendorBehavior(time);

        if (this.pendingItem && this.pendingItem.active) {
            const dist = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, this.pendingItem.x, this.pendingItem.y);
            if (dist < 200) {
                if (this.pendingItem.texture.key === 'paper_roll' && !vendorLeft) {
                    this.vendor.setFrame(2); this.isVendorAngry = true; this.lastAngerTime = time;
                    this.vitalik.stopMovement(); this.vitalik.moveTo(this.vitalik.x - 40, this.vitalik.y);

                    // --- AUDIO: Vendor yells about the paper ---
                    this.sound.stopAll();
                    this.sound.play('alley_vendor_paper');
                    this.showSubtitle("Hey! Watch the hands! That's premium two-ply toilet paper. You don't touch unless you're trading. Got it?");

                    this.pendingItem = null;
                } else {
                    const item = this.pendingItem; this.pendingItem = null;
                    this.vitalik.playPickup();
                    this.vitalik.once('collected', () => this.collectItem(item));
                }
            }
        }
    }

    private checkVendorBehavior(time: number) {
        const isMasked = this.registry.get('is_masked') || false;
        const distToPaper = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, 1103, 629);
        const isAngryCooldown = (time - this.lastAngerTime < 2000);

        if (!isMasked && this.vitalik.x >= 745) {
            this.vendor.setFrame(2);
            if (!this.isVendorAngry) {
                this.isVendorAngry = true; this.lastAngerTime = time;

                // --- AUDIO: Vendor yells about the mask ---
                this.sound.stopAll();
                this.sound.play('alley_vendor_nomask');
                this.showSubtitle("Hey, back off! No mask, no service. I don't need your germs, kid. Put one on");

                this.vitalik.stopMovement(); this.vitalik.moveTo(710, this.vitalik.y);
            }
            return;
        }
        if (this.vitalik.x < 740 && distToPaper > 250 && !isAngryCooldown) this.isVendorAngry = false;
        this.vendor.setFrame((this.isVendorAngry || distToPaper < 220 || isAngryCooldown) ? 2 : 0);
    }

    private collectItem(item: any) {
        const inv = this.registry.get('inventory') || [];
        const id = item.texture.key;
        if (id === 'antiseptic') this.registry.set('antiseptic_collected', true);
        if (id === 'paper_roll') this.registry.set('paper_collected', true);

        // Translated item names
        inv.push({ id, name: id === 'paper_roll' ? 'Toilet Paper' : 'Antiseptic', texture: id });

        this.registry.set('inventory', inv); this.events.emit('update_inventory');
        this.tweens.add({ targets: item, x: this.vitalik.x, y: this.vitalik.y - 150, scale: 0.1, alpha: 0, duration: 400, onComplete: () => item.destroy() });
    }

    private createExitButton() {
        const btn = this.add.text(50, 50, '< BACK TO STREET', { fontSize: '32px', backgroundColor: '#000000aa', padding: { x: 10, y: 5 } }).setInteractive({ useHandCursor: true }).setDepth(3000);
        btn.on('pointerdown', () => {
            this.sound.stopAll(); // Stop sounds when leaving the shop
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('MainGame', { x: 2686, y: 880 }); });
        });
    }

    private createInventoryButton() {
        const invBtn = this.add.image(1820, 100, 'inventory_icon').setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(3000);
        invBtn.on('pointerdown', () => { this.scene.pause(this.scene.key); this.scene.launch('Inventory', { from: this.scene.key }); });
    }
}