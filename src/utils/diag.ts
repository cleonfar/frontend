import { reactive } from 'vue'

export const diag = reactive({
  lastUrl: '' as string,
  lastResponse: '' as string,
  lastError: '' as string,
})

export function setDiag(url: string, res?: any, err?: any) {
  diag.lastUrl = url || ''
  diag.lastResponse = res ? (typeof res === 'string' ? res : JSON.stringify(res)) : ''
  diag.lastError = err ? (err?.message ?? String(err)) : ''
}
