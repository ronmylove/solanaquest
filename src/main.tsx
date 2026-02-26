import { StrictMode, useMemo, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// --- SOLANA IMPORTS ---
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection } from '@solana/web3.js';

// Must import styles to ensure the wallet button UI works correctly!
import '@solana/wallet-adapter-react-ui/styles.css';

// 1. Create connection to Magic Router (Devnet)
// We export this to call sendMagicTransaction within the game later
export const routerConnection = new Connection("https://devnet-router.magicblock.app", "confirmed");

// 2. Bridge component: passes wallet data from React to a global object for Phaser
const MagicBridge = () => {
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      // Save the wallet in window so Phaser can request 1 signature for the start
      (window as any).solanaWallet = wallet;
      (window as any).isWalletConnected = true;

      // Dispatch event to Phaser indicating the wallet is ready
      window.dispatchEvent(new CustomEvent('walletConnected'));
      console.log("Wallet synced! Ready to route txs through MagicBlock Router.");
    }
  }, [wallet.connected, wallet.publicKey]);

  return null;
};

// --- CREATE WEB3 WRAPPER ---
const RootApp = () => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Bridge intercepts the wallet and passes it to the game */}
          <MagicBridge />
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)