import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' })
  }

  preload() {

    this.load.image('street_bg', '/assets/backgrounds/street_bg.png');
    this.load.image('pharmacy_bg', '/assets/backgrounds/pharmacy_bg.png');
    this.load.image('shop_bg', '/assets/backgrounds/shop_bg.png');
    this.load.image('alley_bg', '/assets/backgrounds/alley_bg.png');
    this.load.image('shop_foreground', '/assets/backgrounds/shop_foreground.png');


    this.load.spritesheet('v_walk_sheet', '/assets/sprites/vitalik_walk.png', { frameWidth: 200, frameHeight: 583 });
    this.load.spritesheet('v_pickup_sheet', '/assets/sprites/vitalik_pickup.png', { frameWidth: 400, frameHeight: 583 });
    this.load.spritesheet('v_mask_walk_sheet', '/assets/sprites/v_mask_walk_sheet.png', { frameWidth: 200, frameHeight: 583 });
    this.load.spritesheet('v_mask_pickup_sheet', '/assets/sprites/v_mask_pickup_sheet.png', { frameWidth: 400, frameHeight: 583 });

    this.load.spritesheet('vendor_walk', '/assets/sprites/vendor_walk.png', { frameWidth: 400, frameHeight: 600 });

    this.load.spritesheet('vendor_pharmacy', '/assets/sprites/vendor_pharmacy_sheet.png', {
      frameWidth: 256,
      frameHeight: 512
    });



    this.load.spritesheet('homeless_sheet', '/assets/sprites/homeless_sheet.png', { frameWidth: 550, frameHeight: 580 });
    this.load.spritesheet('vendor_sheet', '/assets/sprites/vendor_sheet.png', { frameWidth: 400, frameHeight: 580 });


    this.load.image('door_pharmacy', '/assets/sprites/door_pharmacy.png');
    this.load.image('door_market', '/assets/sprites/door_market.png');
    this.load.image('alley_trigger', '/assets/sprites/alley_trigger.png');
    this.load.image('inventory_icon', '/assets/sprites/inventory_icon.png');
    this.load.image('inventory_bg', '/assets/sprites/inventory_bg.png');
    this.load.image('mask_item', '/assets/sprites/mask.png');
    this.load.image('bandage', '/assets/sprites/bandage.png');
    this.load.image('antiseptic', '/assets/sprites/antiseptic.png');
    this.load.image('bandage_wet', '/assets/sprites/bandage_wet.png');
    this.load.image('pharmacy_cross', '/assets/sprites/pharmacy_cross.png');
    this.load.image('market_sign', '/assets/sprites/market_sign.png');
    this.load.image('lamp_glow', '/assets/sprites/lamp_glow.png');
    this.load.image('speaker_item', '/assets/sprites/speaker.png');
    this.load.image('battery_item', '/assets/sprites/battery.png');
    this.load.image('trash_bin', '/assets/sprites/trash_bin.png');
    this.load.image('paper_roll', '/assets/sprites/paper_roll.png');
    this.load.image('speaker_sound', '/assets/sprites/speaker_sound.png');
    this.load.image('vaccine_cert', '/assets/sprites/vaccine_cert.png');
    this.load.image('magic_1', '/assets/sprites/magic_1.jpg');
    this.load.image('magic_2', '/assets/sprites/magic_2.jpg');
    this.load.image('magic_3', '/assets/sprites/magic_3.jpg');
    this.load.image('magic_4', '/assets/sprites/magic_4.jpg');
    this.load.image('solana_logo', '/assets/sprites/solana_logo.png');
    this.load.image('zipper', '/assets/sprites/zipper.png');
    this.load.audio('vitalik_intro', '/assets/audio/vitalik_intro.mp3');
    this.load.audio('vitalik_trash_empty', '/assets/audio/vitalik_trash_empty.mp3');
    this.load.audio('vitalik_router_check', '/assets/audio/vitalik_router_check.mp3');

    // homeless
    this.load.audio('homeless_stage1_rats', '/assets/audio/homeless_stage1_rats.mp3');
    this.load.audio('homeless_stage2_paper', '/assets/audio/homeless_stage2_paper.mp3');
    this.load.audio('homeless_stage3_thanks', '/assets/audio/homeless_stage3_thanks.mp3');
    this.load.audio('homeless_gets_bandage', '/assets/audio/homeless_gets_bandage.mp3');
    this.load.audio('homeless_gets_paper', '/assets/audio/homeless_gets_paper.mp3');

    // vendor_kickout
    this.load.audio('vendor_kickout', '/assets/audio/vendor_kickout.mp3');

    // alley_vendor 
    this.load.audio('alley_vendor_nomask', '/assets/audio/alley_vendor_nomask.mp3');
    this.load.audio('alley_vendor_paper', '/assets/audio/alley_vendor_paper.mp3');
    this.load.audio('alley_vendor_competitors', '/assets/audio/alley_vendor_competitors.mp3');


    this.load.audio('speaker_promo', '/assets/audio/speaker_promo.mp3');
    this.load.audio('footstep', '/assets/audio/footstep.mp3')



    this.load.spritesheet('cat_walk', '/assets/sprites/cat_walk.png', { frameWidth: 120, frameHeight: 120 });
    this.load.spritesheet('rat_sheet', '/assets/sprites/rat_sheet.png', { frameWidth: 170, frameHeight: 128 });
  }

  create() {
    this.registry.set('inventory', []);
    this.registry.set('antiseptic_collected', false);
    this.registry.set('bandage_collected', false);
    this.registry.set('mask_collected', false);
    this.registry.set('is_masked', false);
    this.registry.set('has_certificate', false);




    this.registry.set('homeless_quest_stage', 0);


    window.addEventListener('walletConnected', ((e: CustomEvent) => {
      this.registry.set('wallet_connected', true);
      this.registry.set('wallet_address', e.detail.address);
      console.log('Phaser увидел кошелек!', e.detail.address);
    }) as EventListener);


    window.addEventListener('walletDisconnected', () => {
      this.registry.set('wallet_connected', false);
      this.registry.set('wallet_address', '');
    });

    this.scene.start('MainGame');
  }
}