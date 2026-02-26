import Phaser from 'phaser'
import Vitalik from '../entities/Vitalik'

export default class MainGameScene extends Phaser.Scene {
  private vitalik!: Vitalik;
  private mainWalkLayer!: Phaser.Geom.Polygon;
  private alleyLayer!: Phaser.Geom.Polygon;

  private pharmacyDoor!: Phaser.GameObjects.Sprite;
  private marketDoor!: Phaser.GameObjects.Sprite;
  private alleyZone!: Phaser.GameObjects.Sprite;

  public trashBin!: Phaser.GameObjects.Sprite;
  private subtitleText!: Phaser.GameObjects.Text;

  private activeTarget: { name: string, x: number, y: number } | null = null;
  private pendingItem: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | null = null;

  // Flag to fully lock Vitalik during scripted scenes
  private isVitalikLocked: boolean = false;

  private readonly MAX_WIDTH = 4000;
  private startX: number = 500;
  private startY: number = 950;

  constructor() { super({ key: 'MainGame' }) }

  init(data: { x?: number, y?: number }) {
    if (data?.x !== undefined) this.startX = data.x;
    if (data?.y !== undefined) this.startY = data.y;
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.add.image(0, 0, 'street_bg').setOrigin(0, 0);


    this.subtitleText = this.add.text(960, 950, '', {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 15, y: 8 },
      wordWrap: { width: 1400 },
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5000).setVisible(false);

    this.trashBin = this.add.sprite(2870, 840, 'trash_bin')
      .setOrigin(0.5, 1)
      .setScale(0.55)
      .setInteractive({ useHandCursor: true })
      .setDepth(840);

    // --- LOGIC TO RESUME SOUND ON THE STREET ---
    const speakerPlaced = this.registry.get('speaker_placed');
    const paperCollected = this.registry.get('paper_collected');

    // If the speaker is in the trash and the paper is NOT yet collected — play speaker sound upon entering the street
    if (speakerPlaced && !paperCollected) {
      if (this.cache.audio.exists('speaker_promo')) {
        this.sound.play('speaker_promo', { loop: true });
      }
    }
    // --------------------------------------

    this.trashBin.on('pointerdown', () => {
      if (!this.registry.get('speaker_placed')) {
        // --- SOUND AND TEXT FOR EMPTY TRASH BIN ---
        this.sound.stopAll();
        this.sound.play('vitalik_trash_empty');
        this.showSubtitle("Just a filthy dumpster. Smells awful... but it's surprisingly empty. Could be a good spot for a distraction.");
      }
    });

    // Decorations
    const pharmacyCross = this.add.image(627, 183, 'pharmacy_cross').setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: pharmacyCross, alpha: 0.6, duration: 50, yoyo: true, repeat: -1, repeatDelay: 1500, hold: 50, ease: 'Stepped' });
    this.add.image(2298, 245, 'lamp_glow').setOrigin(0.5).setDepth(5).setAlpha(0.8);
    const marketSign = this.add.image(2657, 348, 'market_sign').setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: marketSign, alpha: 0.6, duration: 50, yoyo: true, repeat: -1, repeatDelay: 1200, hold: 50, ease: 'Stepped' });

    if (!this.anims.exists('cat_run')) {
      this.anims.create({ key: 'cat_run', frames: this.anims.generateFrameNumbers('cat_walk', { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
    }
    const cat = this.add.sprite(1534, 138, 'cat_walk').play('cat_run').setDepth(4).setScale(0.6);
    this.tweens.add({ targets: cat, x: 1811, duration: 4000, yoyo: true, repeat: -1, onYoyo: () => cat.setFlipX(true), onRepeat: () => cat.setFlipX(false) });

    this.setupNavigationZones();
    this.vitalik = new Vitalik(this, this.startX, this.startY);
    this.setupInteractiveObjects();

    this.cameras.main.setBounds(0, 0, this.MAX_WIDTH, 1080);
    this.cameras.main.startFollow(this.vitalik, true, 0.1, 0.1);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleGlobalClick(pointer));
    this.createInventoryButton();
    this.setupItems();

    // --- START MENU AND GLITCH SPAWN LOGIC ---
    if (!this.registry.get('game_started')) {
      this.isVitalikLocked = true;
      this.vitalik.setVisible(false); // Hide until button click

      const startOverlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.85)
        .setDepth(9000).setScrollFactor(0).setInteractive();

      const titleText = this.add.text(960, 300, '1 STAGE: COVID19', {
        fontSize: '120px', color: '#00ffcc', fontStyle: 'bold',
        shadow: { offsetX: 0, offsetY: 0, color: '#00ffcc', blur: 20, stroke: true, fill: true }
      }).setOrigin(0.5).setDepth(9001).setScrollFactor(0);

      const btnBg = this.add.rectangle(960, 600, 400, 100, 0x5555ff)
        .setDepth(9001).setScrollFactor(0).setInteractive({ useHandCursor: true });

      const btnText = this.add.text(960, 600, 'NEW GAME', {
        fontSize: '48px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(9001).setScrollFactor(0);

      btnBg.on('pointerdown', () => {
        btnBg.disableInteractive();
        this.registry.set('game_started', true);

        // BROWSER FIX: FORCE ENABLE SOUND ON CLICK
        const soundManager = this.sound as any;
        if (soundManager.context && soundManager.context.state === 'suspended') {
          soundManager.context.resume();
        }

        this.tweens.add({
          targets: [startOverlay, titleText, btnBg, btnText],
          alpha: 0,
          duration: 400,
          onComplete: () => {
            startOverlay.destroy();
            titleText.destroy();
            btnBg.destroy();
            btnText.destroy();

            this.vitalik.setVisible(true);
            this.vitalik.setAlpha(0);
            this.vitalik.setScale(0.75);

            let glitchTimer = this.time.addEvent({
              delay: 50,
              repeat: 14,
              callback: () => {
                this.vitalik.setAlpha(Math.random() * 0.5 + 0.5);
                this.vitalik.x = this.startX + (Math.random() - 0.5) * 30;
                if (Math.random() > 0.6) this.vitalik.setTint(0x444444);
                else this.vitalik.clearTint();
              }
            });

            this.time.delayedCall(800, () => {
              glitchTimer.destroy();
              this.vitalik.setAlpha(1);
              this.vitalik.x = this.startX;
              this.vitalik.clearTint();
              this.vitalik.updateEntity();
              this.isVitalikLocked = false;

              // --- INTRO SOUND ON SPAWN ---
              this.sound.play('vitalik_intro');
              this.showSubtitle("Ugh... my head. Where the hell am I? This place looks like a dump. I need to get online, fast. Gotta find a Wi-Fi signal...");
            });
          }
        });
      });
    }
  }

  public showSubtitle(text: string) {
    this.subtitleText.setText(text).setVisible(true);
    // Slightly increase display time to 4000ms for English text
    this.time.delayedCall(4000, () => {
      if (this.subtitleText.text === text) this.subtitleText.setVisible(false);
    });
  }

  public putSpeakerInTrash() {
    this.input.enabled = false;
    const targetX = 2750;
    const targetY = 940;
    this.pendingItem = null;
    this.activeTarget = null;
    this.vitalik.moveTo(targetX, targetY);

    const checkTimer = this.time.addEvent({
      delay: 100,
      callback: () => {
        const dist = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, targetX, targetY);
        if (dist < 100) {
          checkTimer.destroy();
          this.isVitalikLocked = true;
          this.vitalik.stopMovement();

          this.time.delayedCall(500, () => {
            this.registry.set('speaker_placed', true);

            // Start the speaker sound (looped)
            if (this.cache.audio.exists('speaker_promo')) {
              this.sound.play('speaker_promo', { loop: true });
            }

            // --- IMMEDIATELY RETURN CONTROL TO PLAYER (no freezing) ---
            this.isVitalikLocked = false;
            this.input.enabled = true;
          });
        }
      },
      loop: true
    });
  }

  private setupItems() {
    const bandageCollected = this.registry.get('bandage_collected');
    if (!bandageCollected) {
      const bandage = this.add.image(200, 1050, 'bandage').setScale(0.7).setInteractive({ useHandCursor: true });
      bandage.on('pointerdown', () => {
        this.activeTarget = null;
        this.vitalik.moveTo(bandage.x, bandage.y);
        this.pendingItem = bandage;
      });
    }
    const maskCollected = this.registry.get('mask_collected');
    if (!maskCollected) {
      const mask = this.add.image(3200, 920, 'mask_item').setScale(0.8).setInteractive({ useHandCursor: true });
      mask.on('pointerdown', () => {
        this.activeTarget = null;
        this.vitalik.moveTo(mask.x, mask.y);
        this.pendingItem = mask;
      });
    }
  }

  update() {
    if (!this.isVitalikLocked) {
      this.vitalik.updateEntity();
    }
    if (this.activeTarget) {
      const dist = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, this.activeTarget.x, this.activeTarget.y);
      if (dist < 30) {
        const dest = this.activeTarget.name;
        this.activeTarget = null;
        this.enterInterior(dest);
      }
    }
    if (this.pendingItem) {
      if (!this.pendingItem.active) {
        this.pendingItem = null;
        return;
      }
      const dist = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, this.pendingItem.x, this.pendingItem.y);
      if (dist < 40) {
        const itemToCollect = this.pendingItem;
        this.pendingItem = null;
        this.vitalik.playPickup();
        this.vitalik.once('collected', () => {
          if (itemToCollect && itemToCollect.active) {
            this.collectItem(itemToCollect);
          }
        });
      }
    }
  }

  private collectItem(item: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite) {
    let inv = this.registry.get('inventory');
    if (!Array.isArray(inv)) inv = [];
    if (item.texture.key === 'mask_item') {
      this.registry.set('mask_collected', true);
      inv.push({ id: 'mask_item', name: 'Mask', texture: 'mask_item' });
    } else if (item.texture.key === 'bandage') {
      this.registry.set('bandage_collected', true);
      inv.push({ id: 'bandage', name: 'Bandage', texture: 'bandage' });
    }
    this.registry.set('inventory', inv);
    this.tweens.add({
      targets: item, x: this.vitalik.x, y: this.vitalik.y - 120, scale: 0.1, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: () => item.destroy()
    });
  }

  private setupInteractiveObjects() {
    this.pharmacyDoor = this.add.sprite(829, 647, 'door_pharmacy').setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(500);
    this.pharmacyDoor.on('pointerdown', () => this.startTransition('Pharmacy', 829, 980));
    this.marketDoor = this.add.sprite(2686, 606, 'door_market').setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(500);
    this.marketDoor.on('pointerdown', () => this.startTransition('Shop', 2686, 880));
    this.alleyZone = this.add.sprite(1980, 572, 'alley_trigger').setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(400);
    this.alleyZone.on('pointerdown', () => this.startTransition('Alley', 1980, 690));
    [this.pharmacyDoor, this.marketDoor, this.alleyZone].forEach(obj => {
      obj.on('pointerover', () => obj.setTint(0xccffcc));
      obj.on('pointerout', () => obj.clearTint());
    });
  }

  private startTransition(name: string, tx: number, ty: number) {
    const dist = Phaser.Math.Distance.Between(this.vitalik.x, this.vitalik.y, tx, ty);
    if (dist < 60) this.enterInterior(name);
    else {
      this.activeTarget = { name: name, x: tx, y: ty };
      this.vitalik.moveTo(tx, ty);
    }
  }

  private enterInterior(locationName: string) {
    this.activeTarget = null;
    this.vitalik.stopMovement();

    // --- STOP ALL SOUNDS ON TRANSITION (including footsteps and voices) ---
    this.sound.stopAll();

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (locationName === 'Pharmacy') this.scene.start('Pharmacy');
      else if (locationName === 'Shop') this.scene.start('Shop');
      else if (locationName === 'Alley') this.scene.start('Alley');
    });
  }

  private handleGlobalClick(pointer: Phaser.Input.Pointer) {
    if (this.isVitalikLocked) return;
    const hits = this.input.hitTestPointer(pointer);
    if (hits.length > 0) return;
    this.activeTarget = null;
    this.pendingItem = null;
    this.processMovement(pointer.worldX, pointer.worldY);
  }

  private processMovement(tx: number, ty: number) {
    let finalY = ty;
    const inMain = Phaser.Geom.Polygon.Contains(this.mainWalkLayer, tx, ty);
    const inAlley = Phaser.Geom.Polygon.Contains(this.alleyLayer, tx, ty);
    if (!inMain && !inAlley) {
      if (tx > 1650 && tx < 2150) finalY = Phaser.Math.Clamp(ty, 700, 1080);
      else if (tx > 2500 && tx < 2900) finalY = Phaser.Math.Clamp(ty, 740, 1080);
      else finalY = Phaser.Math.Clamp(ty, 840, 1080);
    }
    this.vitalik.moveTo(tx, finalY);
  }

  private setupNavigationZones() {
    this.mainWalkLayer = new Phaser.Geom.Polygon([
      0, 1080, 0, 950, 400, 950, 600, 980, 850, 950, 1150, 840,
      1650, 840, 2150, 840, 2400, 840, 2500, 740, 2900, 740, 3050, 840,
      this.MAX_WIDTH, 840, this.MAX_WIDTH, 1080
    ]);
    this.alleyLayer = new Phaser.Geom.Polygon([1650, 840, 1800, 700, 2000, 700, 2150, 840]);
  }

  private createInventoryButton() {
    const invBtn = this.add.image(1820, 100, 'inventory_icon').setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(3000);
    invBtn.on('pointerdown', () => {
      const currentScene = this.scene.key;
      this.scene.pause(currentScene);
      this.scene.launch('Inventory', { from: currentScene });
    });
  }
}