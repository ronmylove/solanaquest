import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GameConfig } from '../game/GameConfig'

export default function Game() {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(GameConfig)
    }
    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div id="game-container" style={{ width: '100%', height: '100vh' }} />
}
