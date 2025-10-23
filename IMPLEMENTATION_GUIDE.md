# Implementation Guide: Migrating to EVM-Only Architecture

This guide provides step-by-step instructions for migrating the Money Pot application from a dual Aptos/EVM architecture to an EVM-only architecture.

## Overview

The migration involves:
1. Removing all Aptos-related dependencies
2. Updating the wallet integration
3. Simplifying the UI components
4. Updating documentation

## Step 1: Remove Aptos Dependencies

### Delete these files:
- `/src/lib/aptos.ts`
- `/src/abis/_0xea89ef9798a210009339ea6105c2008d8e154f8b5ae1807911c86320ea03ff3f.ts`
- Any Aptos Move modules in the project

### Update package.json:
Remove these dependencies:
```json
"@aptos-labs/ts-sdk": "^5.1.0",
"@aptos-labs/wallet-adapter-react": "^7.1.0",
"@martianwallet/aptos-wallet-adapter": "^0.0.5",
"@nightlylabs/aptos-wallet-adapter-plugin": "^0.2.12",
"@openblockhq/aptos-wallet-adapter": "^0.1.5",
"@rise-wallet/wallet-adapter": "^0.1.2",
"@tp-lab/aptos-wallet-adapter": "^1.0.1",
"@trustwallet/aptos-wallet-adapter": "^0.1.6",
"@welldone-studio/aptos-wallet-adapter": "^0.1.5",
"@typemove/aptos": "^1.13.3",
"@typemove/move": "^1.13.3",
"msafe-plugin-wallet-adapter": "^0.1.1",
"petra-plugin-wallet-adapter": "^0.4.5"
```

Run `npm prune` to remove unused dependencies.

## Step 2: Update Wallet Provider

### Replace UnifiedWalletProvider.tsx with WalletProvider.tsx:

```typescript
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
```

## Step 3: Update Wallet Connect Button

### Replace UnifiedWalletConnectButton.tsx with WalletConnectButton.tsx:

```typescript
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCTC, publicClient } from '@/config/viem';
import { evmContractService } from '@/lib/evm-api';
import { getConnectedWallet } from '@/lib/web3onboard';
import { AlertTriangle, ChevronDown, Coins, Copy, LogOut, Wallet, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWallet } from './WalletProvider';

interface WalletBalances {
  usdc: number | null;
  ctc: number | null;
  loading: boolean;
}

export function WalletConnectButton() {
  const { walletState, connectEVM, disconnect } = useWallet();
  const [balances, setBalances] = useState<WalletBalances>({
    usdc: null,
    ctc: null,
    loading: false
  });
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Check if wallet is on the correct network
  useEffect(() => {
    const checkNetwork = () => {
      if (walletState.type === 'evm') {
        const evmWallet = getConnectedWallet();
        if (evmWallet?.provider) {
          // Get current chain ID from the provider
          evmWallet.provider.request({ method: 'eth_chainId' })
            .then((chainId: string) => {
              const isCorrectNetwork = chainId === '0x18e7f'; // Creditcoin testnet chain ID in hex (102031)
              setIsWrongNetwork(!isCorrectNetwork);
            })
            .catch(() => {
              // If we can't get the chain ID, assume wrong network
              setIsWrongNetwork(true);
            });
        } else {
          setIsWrongNetwork(true);
        }
      }
    };

    checkNetwork();

    // Listen for chain changes in EVM wallets
    if (walletState.type === 'evm') {
      const evmWallet = getConnectedWallet();
      if (evmWallet?.provider) {
        const handleChainChanged = () => {
          checkNetwork();
        };

        evmWallet.provider.on('chainChanged', handleChainChanged);

        return () => {
          evmWallet.provider.removeListener('chainChanged', handleChainChanged);
        };
      }
    }
  }, [walletState.type]);

  // Fetch balances when connected
  useEffect(() => {
    const fetchBalances = async () => {
      if (walletState.isConnected && walletState.address) {
        setBalances(prev => ({ ...prev, loading: true }));
        try {
          // Get CTC balance
          let ctcBalance = 0;
          try {
            const balance = await publicClient.getBalance({
              address: walletState.address as `0x${string}`,
            });
            ctcBalance = formatCTC(balance);
          } catch (error) {
            console.error('Failed to fetch CTC balance:', error);
          }

          // Get USDC balance from contract
          let usdcBalance = 0;
          try {
            usdcBalance = await evmContractService.getBalance(walletState.address as `0x${string}`);
          } catch (error) {
            console.error('Failed to fetch USDC balance:', error);
          }

          setBalances({
            usdc: usdcBalance,
            ctc: ctcBalance,
            loading: false
          });
        } catch (error) {
          console.error('Failed to fetch balances:', error);
          setBalances({
            usdc: null,
            ctc: null,
            loading: false
          });
        }
      } else {
        setBalances({
          usdc: null,
          ctc: null,
          loading: false
        });
      }
    };

    if (walletState.isConnected) {
      fetchBalances();
    } else {
      setBalances({
        usdc: null,
        ctc: null,
        loading: false
      });
    }
  }, [walletState.address, walletState.isConnected, walletState.type]);

  const copyAddress = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address);
    }
  };

  const switchToTestnet = async () => {
    try {
      // Import the switchNetwork function
      const { switchNetwork } = await import('@/lib/web3onboard');
      await switchNetwork(102031); // Creditcoin testnet chain ID
    } catch (error) {
      console.error('Failed to switch EVM network:', error);
      // If switching fails, try adding the network first
      try {
        const { addNetwork } = await import('@/lib/web3onboard');
        await addNetwork();
      } catch (addError) {
        console.error('Failed to add network:', addError);
      }
    }
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className="flex flex-col gap-2">
        {/* Network Warning */}
        {isWrongNetwork && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Wrong network! Please switch to Creditcoin Testnet
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={switchToTestnet}
              className="ml-auto h-6 px-2 text-xs"
            >
              Switch
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>{formatAddress(walletState.address)}</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {walletState.type?.toUpperCase()}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
          {/* Address Section */}
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Wallet Address</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex-1 break-all">
                  {walletState.address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Network Section */}
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Network</div>
              <div className="flex items-center gap-2">
                <Wifi className={`w-3 h-3 ${isWrongNetwork ? 'text-red-500' : 'text-green-500'}`} />
                <span className={`text-xs ${isWrongNetwork ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  Creditcoin Testnet
                </span>
                {isWrongNetwork && (
                  <span className="text-xs text-red-500">(Wrong Network)</span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Balance Section */}
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Balances</div>
              {balances.loading ? (
                <div className="text-xs text-muted-foreground">Loading balances...</div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Coins className="w-3 h-3 text-purple-500" />
                    <span>CTC: {typeof balances.ctc === 'number' ? balances.ctc.toFixed(4) : '0.0000'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Coins className="w-3 h-3 text-blue-500" />
                    <span>USDC: {typeof balances.usdc === 'number' ? balances.usdc.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Disconnect Button */}
          <DropdownMenuItem onClick={disconnect} className="flex items-center gap-2 cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  }

  return (
    <Button
      disabled={walletState.isLoading}
      className="bg-brand-green hover:bg-brand-green/90 text-white"
      onClick={connectEVM}
    >
      {walletState.isLoading ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
```

## Step 4: Update Application Entry Point

### Update the root component to use the new wallet provider:

```tsx
import { WalletProvider } from '@/components/WalletProvider';

function App() {
  return (
    <WalletProvider>
      {/* Application components */}
    </WalletProvider>
  );
}
```

## Step 5: Update App Components

Find and update all components that use the UnifiedWalletProvider/useUnifiedWallet:

1. Change import statements from `import { useUnifiedWallet } from './UnifiedWalletProvider'` to `import { useWallet } from './WalletProvider'`
2. Update references from `useUnifiedWallet()` to `useWallet()`
3. Remove any references to `switchToAptos()`, `connectAptos()`, etc.
4. Remove any Aptos-specific UI elements and conditional rendering

## Step 6: Update .env Files and Config

1. Remove any Aptos-specific environment variables
2. Update any documentation about environment variables

## Step 7: Update Documentation

Update README.md and other documentation to:
1. Remove mentions of Aptos
2. Focus solely on EVM integration
3. Update setup instructions
4. Update contract interaction examples
5. Update wallet connection instructions

## Testing Checklist

- [ ] Wallet connection works
- [ ] Network detection works
- [ ] Network switching works
- [ ] Balance fetching works
- [ ] Contract creation works
- [ ] Contract interaction works
- [ ] Error handling works
- [ ] UI displays correctly
- [ ] No references to Aptos remain in the UI

## Deployment

1. Build the application
2. Test thoroughly
3. Deploy to your hosting provider
4. Monitor for any issues

## Troubleshooting

If you encounter issues during the migration:

1. Check browser console for errors
2. Verify wallet connections
3. Ensure correct network configuration
4. Check contract ABIs match deployed contracts
5. Verify environment variables
