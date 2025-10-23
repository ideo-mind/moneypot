import { VERIFIER_API_URL } from "@/config"
import { CHAIN_DEFAULT } from "@/config/viem"
import { hashMessage, recoverMessageAddress } from "viem"

export interface EVMVerifierResponse {
  success: boolean
  message?: string
  data?: any
}

export interface EVMRegisterOptions {
  public_key: string
}

export interface EVMRegisterPayload {
  pot_id: string
  "1p": string
  legend: Record<string, string>
  iat: number
  iss: string
  exp: number
}

export interface EVMAuthenticateOptions {
  challenges: Array<{
    id: string
    type: string
    question: string
    options?: string[]
  }>
  colors?: Record<string, string>
  directions?: Record<string, string>
}

export interface EVMAuthenticatePayload {
  solutions: Array<{
    challenge_id: string
    answer: string
  }>
  attempt_id: string
  wallet: string
}

class EVMVerifierServiceClient {
  private baseUrl: string
  private chainId: number

  constructor(
    baseUrl: string = VERIFIER_API_URL,
    chainId: number = CHAIN_DEFAULT.id
  ) {
    this.baseUrl = baseUrl
    this.chainId = chainId
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      MONEYPOT_CHAIN: this.chainId.toString(),
      ...additionalHeaders,
    }

    const config: RequestInit = {
      method,
      headers,
    }

    if (body && method !== "GET") {
      config.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`EVM Verifier API Error (${endpoint}):`, error)
      throw error
    }
  }

  async healthCheck(): Promise<EVMVerifierResponse> {
    return this.makeRequest<EVMVerifierResponse>("/health")
  }

  async registerOptions(): Promise<EVMRegisterOptions> {
    return this.makeRequest<EVMRegisterOptions>("/evm/register/options", "POST")
  }

  async registerVerify(
    encryptedPayload: string,
    publicKey: string,
    signature: string
  ): Promise<EVMVerifierResponse> {
    return this.makeRequest<EVMVerifierResponse>(
      "/evm/register/verify",
      "POST",
      {
        encrypted_payload: encryptedPayload,
        public_key: publicKey,
        signature,
      }
    )
  }

  async authenticateOptions(
    attemptId: string,
    signature: string
  ): Promise<EVMAuthenticateOptions> {
    return this.makeRequest<EVMAuthenticateOptions>(
      "/evm/authenticate/options",
      "POST",
      {
        attempt_id: attemptId,
        signature,
      }
    )
  }

  async authenticateVerify(
    solutions: Array<{ challenge_id: string; answer: string }>,
    attemptId: string,
    wallet: string
  ): Promise<EVMVerifierResponse> {
    return this.makeRequest<EVMVerifierResponse>(
      "/evm/authenticate/verify",
      "POST",
      {
        solutions,
        attempt_id: attemptId,
        wallet,
      }
    )
  }

  async airdrop(
    encryptedPayload: string,
    signature: string
  ): Promise<EVMVerifierResponse> {
    return this.makeRequest<EVMVerifierResponse>("/evm/airdrop", "POST", {
      encrypted_payload: encryptedPayload,
      signature,
    })
  }

  // Helper method to create signature for EVM messages using Web3OnboardKit wallet
  static async createEVMSignature(
    wallet: any,
    message: string
  ): Promise<string> {
    try {
      if (!wallet || !wallet.provider) {
        throw new Error("No wallet provider available")
      }

      // Use Web3OnboardKit's wallet to sign the message
      const signature = await wallet.provider.request({
        method: "personal_sign",
        params: [message, wallet.accounts[0].address],
      })

      return signature
    } catch (error) {
      console.error("Failed to create EVM signature:", error)
      throw error
    }
  }

  // Helper method to encrypt payload (simplified hex encoding for MVP)
  static encryptPayload(payload: any): string {
    try {
      const jsonString = JSON.stringify(payload)
      return Buffer.from(jsonString, "utf-8").toString("hex")
    } catch (error) {
      console.error("Failed to encrypt payload:", error)
      throw error
    }
  }
}

export const evmVerifierService = new EVMVerifierServiceClient()
export { EVMVerifierServiceClient }
export default EVMVerifierServiceClient

// Helper function to get authentication options with colors and directions
export const getAuthOptions = async (
  attemptId: string,
  walletAddress: string
): Promise<EVMAuthenticateOptions> => {
  try {
    // Get the connected wallet to create a signature
    const { getConnectedWallet } = await import("@/lib/web3onboard")
    const wallet = getConnectedWallet()

    if (!wallet) {
      throw new Error("No wallet connected")
    }

    // Create a signature for authentication
    const message = JSON.stringify({ attemptId, walletAddress })
    const signature = await EVMVerifierServiceClient.createEVMSignature(
      wallet,
      message
    )

    // Call the actual API
    const authOptions = await evmVerifierService.authenticateOptions(
      attemptId,
      signature
    )

    return authOptions
  } catch (error) {
    console.error("Failed to get auth options:", error)
    // Fallback to mock data if API fails
    return {
      challenges: [],
      colors: CHAIN_DEFAULT.custom.moneypot.colors || {
        red: "#ef4444",
        green: "#22c55e",
        blue: "#3b82f6",
        yellow: "#eab308",
      },
      directions: CHAIN_DEFAULT.custom.moneypot.directions || {
        up: "U",
        down: "D",
        left: "L",
        right: "R",
      },
    }
  }
}
