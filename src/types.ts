export interface AccountInfo {
  username: string
  email: string
}

export interface Obj {
  accounts: Record<string, AccountInfo>
}