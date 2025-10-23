import { getConnectedWallet, onboard } from '@/lib/web3onboard';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';

// Wallet types - only EVM now
export type WalletType = 'evm';

export interface WalletState {
  type: WalletType | null;
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface WalletContextType {
  walletState: WalletState;
  connectEVM: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider = ({ children }: PropsWithChildren) => {
  const [walletState, setWalletState] = useState<WalletState>({
    type: null,
    address: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  // Monitor EVM wallet connection
  useEffect(() => {
    try {
      const handleEVMWalletChange = () => {
        const evmWallet = getConnectedWallet();
        if (evmWallet) {
          setWalletState(prev => ({
            ...prev,
            type: 'evm',
            address: evmWallet.accounts[0]?.address || null,
            isConnected: true,
            error: null,
          }));
        } else {
          setWalletState(prev => ({
            ...prev,
            type: null,
            address: null,
            isConnected: false,
          }));
        }
      };

      // Subscribe to wallet changes
      const unsubscribe = onboard.state.select('wallets').subscribe(handleEVMWalletChange);

      // Initial check
      handleEVMWalletChange();

      return () => {
        unsubscribe.unsubscribe();
      };
    } catch (error) {
      console.error('WalletProvider initialization error:', error);
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Wallet initialization failed',
        isLoading: false,
      }));
    }
  }, []);

  const connectEVM = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const wallet = await onboard.connectWallet();
      if (wallet && wallet.length > 0 && wallet[0].accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          type: 'evm',
          address: wallet[0].accounts[0].address,
          isConnected: true,
          isLoading: false
        }));
      } else {
        throw new Error('No wallet connected');
      }
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect EVM wallet',
        isLoading: false
      }));
    }
  };

  const disconnect = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true }));
    try {
      const wallets = onboard.state.get().wallets;
      for (const wallet of wallets) {
        await onboard.disconnectWallet({ label: wallet.label });
      }

      setWalletState({
        type: null,
        address: null,
        isConnected: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
        isLoading: false
      }));
    }
  };

  const contextValue: WalletContextType = {
    walletState,
    connectEVM,
    disconnect,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
