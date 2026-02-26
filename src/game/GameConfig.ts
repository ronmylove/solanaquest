import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MainGameScene from './scenes/MainGameScene'
import PharmacyScene from './scenes/PharmacyScene'
import ShopScene from './scenes/ShopScene'
import AlleyScene from './scenes/AlleyScene'
import InventoryScene from './scenes/InventoryScene'
import PhoneScene from './scenes/PhoneScene'

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },

  scene: [
    BootScene,
    MainGameScene,
    PharmacyScene,
    ShopScene,
    AlleyScene,
    InventoryScene,
    PhoneScene
  ]
};