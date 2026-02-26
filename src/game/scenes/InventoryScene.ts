import Phaser from 'phaser'

export default class InventoryScene extends Phaser.Scene {
    private parentScene: string = '';
    private itemSprites: Phaser.GameObjects.Image[] = [];
    private claimOverlay: Phaser.GameObjects.Rectangle | null = null;
    private claimContainer: Phaser.GameObjects.Container | null = null;

    constructor() { super({ key: 'Inventory' }) }

    init(data: { from: string }) { this.parentScene = data.from; }

    create() {
        this.itemSprites = [];
        const items = this.registry.get('inventory') || [];

        // 1. Removed black semi-transparent background (rectangle)

        // 2. NEW BACKPACK DIMENSIONS AND POSITION
        const bgCenterX = 960;
        const bgCenterY = 960; // Moved down
        const bgWidth = 1600;  // MADE WIDER
        const bgHeight = 220;  // Height remains the same

        this.add.image(bgCenterX, bgCenterY, 'inventory_bg').setDisplaySize(bgWidth, bgHeight);

        // 3. NEW CLOSE BUTTON (Zipper pull)
        const closeBtnX = bgCenterX + bgWidth / 2 + 10;
        const closeBtnY = bgCenterY - bgHeight / 2 + 40;
        const closeBtn = this.add.image(closeBtnX, closeBtnY, 'zipper')
            .setDisplaySize(50, 50)
            .setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            if (this.parentScene) this.scene.resume(this.parentScene);
            this.scene.stop();
        });
        closeBtn.on('pointerover', () => closeBtn.setTint(0xff5555));
        closeBtn.on('pointerout', () => closeBtn.clearTint());

        // 4. ITEM SLOTS (Spread out to fill the new width)
        const centerY = bgCenterY;
        const slotX = [330, 510, 690, 870, 1050, 1230, 1410, 1590];

        items.forEach((item: any, index: number) => {
            if (index < 8) {
                const x = slotX[index];
                const itemSprite = this.add.image(x, centerY, item.texture)
                    .setDisplaySize(110, 110)
                    .setInteractive({ draggable: true });

                itemSprite.setData('id', item.id);
                itemSprite.setData('info', item);
                itemSprite.setData('originalX', x);
                itemSprite.setData('originalY', centerY);
                this.itemSprites.push(itemSprite);

                itemSprite.on('drag', (pointer: any, dragX: number, dragY: number) => {
                    itemSprite.x = dragX;
                    itemSprite.y = dragY;
                    itemSprite.setDepth(1000);
                });

                itemSprite.on('dragend', () => this.checkCraft(itemSprite));
            }
        });

        // NFT LOGIC REMAINS UNCHANGED
        const onMintSuccess = ((e: CustomEvent) => {
            if (e.detail.itemType === 'bandage') this.executeCraft();
            else this.executeSpeakerCraft();
            this.destroyClaimWindow();
        }) as EventListener;

        const onMintFail = () => {
            console.log("Mint cancelled or an error occurred");
            this.destroyClaimWindow();
            this.itemSprites.forEach(item => {
                this.resetItemPosition(item);
            });
        };

        window.addEventListener('nftMintSuccess', onMintSuccess);
        window.addEventListener('nftMintFailed', onMintFail);

        this.events.once('shutdown', () => {
            window.removeEventListener('nftMintSuccess', onMintSuccess);
            window.removeEventListener('nftMintFailed', onMintFail);
        });
    }

    private checkCraft(draggedItem: Phaser.GameObjects.Image) {
        const itemId = draggedItem.getData('id');
        const mainScene = this.scene.get(this.parentScene) as any;
        const vitalik = mainScene?.vitalik;
        const pointer = this.input.activePointer;

        const worldPoint = mainScene.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (itemId === 'bandage_wet' && this.parentScene === 'Alley') {
            if (pointer.y < 920) {
                this.scene.resume(this.parentScene);
                this.scene.stop();
                mainScene.giveBandageToHomeless();
                return;
            }
        }

        if (itemId === 'paper_roll' && this.parentScene === 'Alley') {
            if (pointer.y < 920) {
                this.scene.resume(this.parentScene);
                this.scene.stop();
                mainScene.givePaperToHomeless();
                return;
            }
        }

        if (itemId === 'mask_item' && vitalik) {
            if (vitalik.getBounds().contains(worldPoint.x, worldPoint.y)) {
                this.executeWearMask(draggedItem);
                return;
            }
        }

        if (itemId === 'speaker_powered' && mainScene?.trashBin) {
            if (mainScene.trashBin.getBounds().contains(worldPoint.x, worldPoint.y)) {
                let inv = this.registry.get('inventory') || [];
                inv = inv.filter((i: any) => i.id !== 'speaker_powered');
                this.registry.set('inventory', inv);

                mainScene.putSpeakerInTrash();
                this.closeInventoryAndResume();
                return;
            }
        }

        for (let targetItem of this.itemSprites) {
            if (draggedItem === targetItem) continue;
            const dist = Phaser.Math.Distance.Between(draggedItem.x, draggedItem.y, targetItem.x, targetItem.y);
            if (dist < 80) {
                const id1 = itemId;
                const id2 = targetItem.getData('id');
                if ((id1 === 'antiseptic' && id2 === 'bandage') || (id1 === 'bandage' && id2 === 'antiseptic')) {
                    this.showClaimWindow('bandage', draggedItem);
                    return;
                }
                if ((id1 === 'speaker' && id2 === 'battery') || (id1 === 'battery' && id2 === 'speaker')) {
                    this.showClaimWindow('speaker', draggedItem);
                    return;
                }
            }
        }

        this.resetItemPosition(draggedItem);
    }

    private showClaimWindow(itemType: 'bandage' | 'speaker', draggedItem: Phaser.GameObjects.Image) {
        this.itemSprites.forEach(s => s.disableInteractive());
        this.claimOverlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.85).setDepth(2000);
        this.claimContainer = this.add.container(960, 540).setDepth(2001);

        // 5. FIX FOR STRETCHED BACKGROUND
        // Instead of a distorted backpack image, draw a neat neon panel
        const popupBg = this.add.graphics();
        popupBg.fillStyle(0x111111, 1);
        popupBg.lineStyle(4, 0x00ffcc, 1);
        popupBg.fillRoundedRect(-350, -400, 700, 800, 20);
        popupBg.strokeRoundedRect(-350, -400, 700, 800, 20);

        const closeX = this.add.text(300, -350, '[X]', { fontSize: '48px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const texture = itemType === 'bandage' ? 'bandage_wet' : 'speaker_sound';
        const itemName = itemType === 'bandage' ? 'WET BANDAGE' : 'POWERED SPEAKER';

        const resultImg = this.add.image(0, -100, texture).setDisplaySize(350, 350);
        const text = this.add.text(0, 150, `YOU CRAFTED:\n${itemName}`, { fontSize: '38px', color: '#ffffff', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);

        const isConnected = (window as any).isWalletConnected || this.registry.get('wallet_connected') || false;

        const btnBg = this.add.rectangle(0, 300, 450, 100, isConnected ? 0x44ff44 : 0x5555ff).setInteractive({ useHandCursor: true });
        const btnLabel = this.add.text(0, 300, isConnected ? 'CLAIM NFT' : 'CONNECT WALLET', { fontSize: '32px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);

        this.claimContainer.add([popupBg as any, closeX, resultImg, text, btnBg, btnLabel]);

        // --- DYNAMIC BUTTON UPDATE ---
        const updateWalletUI = () => {
            btnBg.fillColor = 0x44ff44;
            btnLabel.setText('CLAIM NFT');
        };
        window.addEventListener('walletConnected', updateWalletUI);

        closeX.on('pointerdown', () => {
            window.removeEventListener('walletConnected', updateWalletUI);
            this.resetItemPosition(draggedItem);
            this.destroyClaimWindow();
        });

        btnBg.on('pointerdown', () => {
            const currentlyConnected = (window as any).isWalletConnected || this.registry.get('wallet_connected') || false;

            if (!currentlyConnected) {
                // Call Phantom popup
                window.dispatchEvent(new CustomEvent('requestWalletConnect'));
            } else {
                btnLabel.setText("CONFIRM IN PHANTOM...");
                btnBg.fillColor = 0xaaaaaa;
                btnBg.disableInteractive();

                window.dispatchEvent(new CustomEvent('requestNFTMint', { detail: { itemType } }));
            }
        });
    }

    private resetItemPosition(item: Phaser.GameObjects.Image) {
        item.x = item.getData('originalX');
        item.y = item.getData('originalY');
        item.setDepth(1);
    }

    private destroyClaimWindow() {
        this.claimOverlay?.destroy();
        this.claimContainer?.destroy();
        this.itemSprites.forEach(s => s.setInteractive());
    }

    private executeSpeakerCraft() {
        let inv = this.registry.get('inventory') || [];
        inv = inv.filter((i: any) => i.id !== 'speaker' && i.id !== 'battery');
        inv.push({ id: 'speaker_powered', name: 'Powered Speaker', texture: 'speaker_sound' });
        this.registry.set('inventory', inv);
        this.registry.set('speaker_is_ready', true);


        this.sound.play('speaker_promo');

        this.cameras.main.flash(400, 255, 255, 255);
        this.time.delayedCall(200, () => this.scene.restart());
    }

    private executeCraft() {
        let inv = this.registry.get('inventory') || [];
        inv = inv.filter((i: any) => i.id !== 'antiseptic' && i.id !== 'bandage');
        inv.push({ id: 'bandage_wet', name: 'Wet Bandage', texture: 'bandage_wet' });
        this.registry.set('inventory', inv);
        this.cameras.main.flash(400, 255, 255, 255);
        this.time.delayedCall(200, () => this.scene.restart());
    }

    private executeWearMask(draggedItem: Phaser.GameObjects.Image) {
        let inv = this.registry.get('inventory') || [];
        inv = inv.filter((i: any) => i.id !== draggedItem.getData('id'));
        this.registry.set('inventory', inv);
        const mainScene = this.scene.get(this.parentScene) as any;
        if (mainScene?.vitalik) mainScene.vitalik.playWearMask();
        draggedItem.destroy();
        this.closeInventoryAndResume();
    }

    private closeInventoryAndResume() {
        if (this.parentScene) this.scene.resume(this.parentScene);
        this.scene.stop();
    }
}