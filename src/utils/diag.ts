import { reactive } from 'vue'

type DiagEntry = {
  url: string
  method?: string
  response?: string
  error?: string
  ts: number
}

export const diag = reactive({
  lastUrl: '' as string,
  lastResponse: '' as string,
  lastError: '' as string,
  history: [] as DiagEntry[],
})

export function setDiag(url: string, res?: any, err?: any, method?: string) {
  const response = res ? (typeof res === 'string' ? res : JSON.stringify(res)) : ''
  const error = err ? (err?.message ?? String(err)) : ''
  diag.lastUrl = url || ''
  diag.lastResponse = response
  diag.lastError = error

  // Push into history (keep last 5)
  diag.history.push({ url: url || '', method, response, error, ts: Date.now() })
  if (diag.history.length > 5) {
    diag.history.splice(0, diag.history.length - 5)
  }
}
