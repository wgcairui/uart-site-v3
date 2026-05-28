import { create } from 'zustand'

interface UserStore {
  user: Partial<Uart.UserInfo>
  terminals: Uart.Terminal[]
  isSimulated: boolean
  setUser: (user: Partial<Uart.UserInfo>) => void
  setTerminals: (terminals: Uart.Terminal[]) => void
  setSimulated: (isSimulated: boolean) => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: {},
  terminals: [],
  isSimulated: false,
  setUser: (user) => set({ user }),
  setTerminals: (terminals) => set({ terminals }),
  setSimulated: (isSimulated) => set({ isSimulated }),
}))
