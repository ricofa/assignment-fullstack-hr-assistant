import { LensClient } from '@anvia/lens'

// The eval commands load the root .env before this module runs.
export const lens = new LensClient({
  baseUrl: process.env.ANVIA_LENS_BASE_URL,
  publicKey: process.env.ANVIA_LENS_PUBLIC_KEY,
  secretKey: process.env.ANVIA_LENS_SECRET_KEY,
  serviceName: 'pt-bisi-hr',
})

export const lensObserver = lens.observer({ captureMode: 'full' })
