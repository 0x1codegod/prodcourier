import {lisk, liskSepolia, sepolia  } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'


// Get projectId from https://cloud.reown.com
export const projectId = "37cce39e14cf0dac0adaeb18f4c4ef0c";

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [lisk, liskSepolia, sepolia ] as [AppKitNetwork, ...AppKitNetwork[]]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig