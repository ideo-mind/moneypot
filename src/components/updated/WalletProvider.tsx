import { PropsWithChildren, createContext, useContext, useState, useEffect } from 'react';
import { onboard, getConnectedWallet } from '@/lib/web3onboard';

// Wallet types
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
  }, []);

  const connectEVM = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const wallet = await onboard.connectWallet();
      if (wallet && wallet.accounts.length > 0) {
        setWalletState(prev => ({ 
          ...prev, 
          type: 'evm', 
          address: wallet.accounts[0].address,
          isConnected: true, 
          isLoading: false 
        }));
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
      await onboard.disconnectWallet();
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
