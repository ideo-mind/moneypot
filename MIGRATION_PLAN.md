# Migration Plan: Creditcoin EVM Integration and Aptos Removal

This document outlines the step-by-step process for removing Aptos support from the Money Pot application and focusing exclusively on Creditcoin EVM integration.

## Files to Delete

These Aptos-specific files should be deleted completely:

- `/src/lib/aptos.ts`
- `/src/abis/_0xea89ef9798a210009339ea6105c2008d8e154f8b5ae1807911c86320ea03ff3f.ts`
- Any other Aptos-specific ABIs in `/src/abis` directory
- Any Move modules or Aptos contract code

## Files to Rename

For clarity, rename these files to reflect EVM-only functionality:

- `/src/components/UnifiedWalletProvider.tsx` → `/src/components/WalletProvider.tsx`
- `/src/components/UnifiedWalletConnectButton.tsx` → `/src/components/WalletConnectButton.tsx`

## Files to Modify

### 1. WalletProvider.tsx (previously UnifiedWalletProvider.tsx)

Remove:
- `AptosWalletAdapterProvider` imports and implementation
- `PetraWallet` and any other Aptos wallet imports
- `Network` import from "@aptos-labs/ts-sdk"
- `connectAptos`, `switchToAptos` methods
- `aptos` wallet type (only keep `evm`)
- Aptos wallet type checking in the provider
- Aptos wallet error handling

### 2. WalletConnectButton.tsx (previously UnifiedWalletConnectButton.tsx)

Remove:
- `useWallet` import from "@aptos-labs/wallet-adapter-react"
- `aptos` import and Aptos contract functions
- Aptos balance fetching logic
- Wallet type switching UI
- Aptos wallet connection dropdown section
- Aptos network handling

### 3. Package.json

Remove all Aptos-related dependencies:
- `@aptos-labs/ts-sdk`
- `@aptos-labs/wallet-adapter-react`
- `@martianwallet/aptos-wallet-adapter`
- `@nightlylabs/aptos-wallet-adapter-plugin`
- `@openblockhq/aptos-wallet-adapter`
- `@rise-wallet/wallet-adapter`
- `@tp-lab/aptos-wallet-adapter`
- `@trustwallet/aptos-wallet-adapter`
- `@welldone-studio/aptos-wallet-adapter`
- `@typemove/aptos`
- `@typemove/move`
- `msafe-plugin-wallet-adapter`
- `petra-plugin-wallet-adapter`

### 4. Main Application Components

Update any components that use the wallet provider:
- Change imports to use the new provider names
- Remove any Aptos-specific conditional rendering
- Update function calls to use EVM contract methods only

### 5. Configuration Files

- Update any environment variables to remove Aptos-related configurations
- Ensure all Creditcoin EVM configurations are properly set

### 6. Documentation

Update all documentation to remove Aptos mentions and focus on Creditcoin EVM:
- README.md
- API documentation
- User guides

## Testing

After migration, test thoroughly:
1. Wallet connection
2. Network detection and switching
3. Balance fetching
4. Contract interactions:
   - Creating a pot
   - Attempting a pot
   - Getting pot data
   - Getting user balance
   - Getting active pots
   - Other contract functions

## Implementation Notes

When implementing these changes:

1. **Break changes into smaller PRs** if possible to make review easier
2. Use a clear commit message format (e.g., "refactor: remove Aptos support from WalletProvider")
3. Add appropriate tests for EVM-only functionality
4. Update any CI/CD pipelines to remove Aptos-related steps

## Post-Migration Cleanup

After successful migration and testing:

1. Remove any unused dependencies with `npm prune`
2. Update project documentation to reflect EVM-only support
3. Consider creating an EVM testnet guide for users
