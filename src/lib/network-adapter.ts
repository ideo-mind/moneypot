import React from 'react';
import { useWallet } from '@/components/WalletProvider';
import { useEVMPotStore } from '@/store/evm-pot-store';
import { evmContractService } from '@/lib/evm-api';
import { evmVerifierService, EVMVerifierServiceClient } from '@/lib/evm-verifier-api';
import { getConnectedWallet } from '@/lib/web3onboard';

export interface CreatePotParams {
  amount: number;
  duration: number;
  fee: number;
  password: string;
  colorMap: Record<string, string>;
}

export interface AttemptPotParams {
  potId: string;
}

export interface VerifyAttemptParams {
  attemptId: string;
  success: boolean;
}

export interface NetworkClient {
  createPot(params: CreatePotParams): Promise<string>;
  attemptPot(params: AttemptPotParams): Promise<string>;
  verifyAttempt(params: VerifyAttemptParams): Promise<boolean>;
  getPot(potId: string): Promise<any>;
  getActivePots(): Promise<string[]>;
  getAllPots(): Promise<string[]>;
  expirePot(potId: string): Promise<boolean>;
}

class NetworkAdapter {
  private walletType: string | null = null;
  private walletAddress: string | null = null;
  private evmClient: EVMClient | null = null;

  constructor() {
    this.evmClient = new EVMClient();
  }

  setWallet(type: string, address: string) {
    this.walletType = type;
    this.walletAddress = address;

    // Initialize clients with wallet info
    if (type === 'evm') {
      // Set wallet account for EVM client if connected
      const wallet = getConnectedWallet();
      if (wallet) {
        evmContractService.setWalletClient(wallet.accounts[0]);
      }
    }
  }

  get client(): NetworkClient {
    if (this.walletType === 'evm') {
      return this.evmClient!;
    } 
    throw new Error('No wallet connected or unsupported wallet type');
  }

  get currentWalletType(): string | null {
    return this.walletType;
  }
}

class EVMClient implements NetworkClient {
  async createPot(params: CreatePotParams): Promise<string> {
    const amount = BigInt(Math.floor(params.amount * 10 ** 6));
    const fee = BigInt(Math.floor(params.fee * 10 ** 6));
    const durationSeconds = BigInt(params.duration * 60 * 60);
    
    // Store password with verifier service
    const oneFaAddress = await evmVerifierService.storePassword(
      params.password,
      params.colorMap
    );

    return evmContractService.createPot({
      amount,
      durationSeconds,
      fee,
      oneFaAddress,
    });
  }

  async attemptPot(params: AttemptPotParams): Promise<string> {
    const potId = BigInt(params.potId);
    return evmContractService.attemptPot({ potId });
  }

  async verifyAttempt(params: VerifyAttemptParams): Promise<boolean> {
    const attemptId = BigInt(params.attemptId);
    await evmContractService.attemptCompleted(attemptId.toString(), params.success);
    return true;
  }

  async getPot(potId: string): Promise<any> {
    return evmContractService.getPot(potId);
  }

  async getActivePots(): Promise<string[]> {
    return evmContractService.getActivePots();
  }

  async getAllPots(): Promise<string[]> {
    return evmContractService.getPots();
  }

  async expirePot(potId: string): Promise<boolean> {
    try {
      await evmContractService.expirePot(potId);
      return true;
    } catch (error) {
      console.error("Failed to expire pot:", error);
      return false;
    }
  }
}

export const useNetworkAdapter = () => {
  const { walletState } = useWallet();
  const evmStore = useEVMPotStore();
  
  const adapter = new NetworkAdapter();
  
  // Set wallet info when wallet state changes
  React.useEffect(() => {
    if (walletState?.type && walletState?.address) {
      adapter.setWallet(walletState.type, walletState.address);
    }
  }, [walletState]);

  return { adapter };
};
