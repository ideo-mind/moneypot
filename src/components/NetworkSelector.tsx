import React from 'react';
import { useWallet } from '@/components/WalletProvider';
import { NETWORKS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Network, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NetworkSelector() {
  const { walletState, connectEVM, disconnect } = useWallet();

  const getCurrentNetwork = () => {
    if (!walletState?.type) return null;
    return NETWORKS.CREDITCOIN;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Network</CardTitle>
      </CardHeader>
      <CardContent>
        {walletState?.type ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-3">
                  <Network className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">{NETWORKS.CREDITCOIN.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Chain ID: {NETWORKS.CREDITCOIN.chainId}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              <DropdownMenuItem
                onClick={() => {}}
                className="flex items-center gap-3"
              >
                <Badge className="bg-brand-green h-8 w-8 flex items-center justify-center p-0 rounded-full">
                  <Network className="h-4 w-4 text-white" />
                </Badge>
                <div>
                  <div className="font-medium">{NETWORKS.CREDITCOIN.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Chain ID: {NETWORKS.CREDITCOIN.chainId}
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              onClick={connectEVM}
              variant="outline"
              className="w-full justify-start"
            >
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-500 h-8 w-8 flex items-center justify-center p-0 rounded-full">
                  <Network className="h-4 w-4 text-white" />
                </Badge>
                <div className="text-left">
                  <div className="font-medium">{NETWORKS.CREDITCOIN.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Chain ID: {NETWORKS.CREDITCOIN.chainId}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
