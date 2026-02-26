import { useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { WalletMultiButton, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';

import Game from './components/Game';

const MY_WALLET_ADDRESS = "D61tZK3GoKJdFQJGi7dPrjT1BxQqeBxXA1HfjAxhoSx8";

function App() {
  const wallet = useWallet();
  const { publicKey, connected, sendTransaction } = wallet;
  const { connection } = useConnection();


  const { setVisible } = useWalletModal();

  useEffect(() => {
    (window as any).isWalletConnected = connected;

    if (connected && publicKey) {
      window.dispatchEvent(new CustomEvent('walletConnected', { detail: { address: publicKey.toBase58() } }));
    } else {
      window.dispatchEvent(new CustomEvent('walletDisconnected'));
    }

    const handleRouterPayment = async () => {
      if (!publicKey) return;
      try {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(MY_WALLET_ADDRESS),
            lamports: 10_000_000,
          })
        );
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        window.dispatchEvent(new CustomEvent('routerPaymentSuccess'));
      } catch (error) {
        console.error("Payment error:", error);
        window.dispatchEvent(new CustomEvent('routerPaymentFailed'));
      }
    };

    const handleNftMint = async (event: any) => {
      if (!publicKey) return;
      const { itemType } = event.detail;

      try {
        console.log(`Starting NFT mint for: ${itemType}`);
        const umi = createUmi(connection.rpcEndpoint)
          .use(walletAdapterIdentity(wallet))
          .use(mplTokenMetadata());

        const mint = generateSigner(umi);
        const uri = itemType === 'bandage'
          ? "https://emerald-generous-crayfish-384.mypinata.cloud/ipfs/bafkreigvtwzbzuggf2j6ktkm2xygg5rpfsbhm2n23kspag374fwrhcxexq"
          : "https://emerald-generous-crayfish-384.mypinata.cloud/ipfs/bafkreignk2qsd7rfr3lhsg2r3ktnzxyd3gccrfjgbqphgq27dpl3ntcova";

        const name = itemType === 'bandage' ? "Wet Bandage" : "Powered Speaker";

        const { signature } = await createNft(umi, {
          mint,
          name: name,
          uri: uri,
          sellerFeeBasisPoints: percentAmount(0),
          isCollection: false,
        }).sendAndConfirm(umi);

        console.log("NFT minted successfully! Signature:", signature);
        window.dispatchEvent(new CustomEvent('nftMintSuccess', { detail: { itemType } }));

      } catch (error) {
        console.error("NFT mint error:", error);
        window.dispatchEvent(new CustomEvent('nftMintFailed'));
      }
    };

    // Listener to open the wallet selection window
    const handleOpenWalletModal = () => {
      setVisible(true); // Opens the Phantom/Wallet UI
    };

    window.addEventListener('requestRouterPayment', handleRouterPayment);
    window.addEventListener('requestNFTMint', handleNftMint);
    window.addEventListener('requestWalletConnect', handleOpenWalletModal);

    return () => {
      window.removeEventListener('requestRouterPayment', handleRouterPayment);
      window.removeEventListener('requestNFTMint', handleNftMint);
      window.removeEventListener('requestWalletConnect', handleOpenWalletModal);
    };

  }, [connected, publicKey, sendTransaction, connection, wallet, setVisible]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <Game />
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <WalletMultiButton />
      </div>
    </div>
  );
}

export default App;