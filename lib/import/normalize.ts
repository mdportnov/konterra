export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  if (phone.startsWith('+')) return '+' + digits
  return digits
}

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }

  return dp[m][n]
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4) {
    const maxDist = Math.max(a.length, b.length) <= 6 ? 1 : 2
    if (levenshtein(a, b) <= maxDist) return true
  }
  return false
}

export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb) return true

  const tokensA = na.split(' ').filter(Boolean)
  const tokensB = nb.split(' ').filter(Boolean)

  if (tokensA.length === 0 || tokensB.length === 0) return false

  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB
  const longer = tokensA.length > tokensB.length ? tokensA : tokensB

  if (shorter.length === 1 && longer.length === 1) {
    return tokensMatch(shorter[0], longer[0])
  }

  const usedIndices = new Set<number>()
  let matched = 0
  for (const st of shorter) {
    for (let i = 0; i < longer.length; i++) {
      if (usedIndices.has(i)) continue
      if (tokensMatch(st, longer[i])) {
        usedIndices.add(i)
        matched++
        break
      }
    }
  }

  return matched >= shorter.length && shorter.length >= 1 && longer.length - matched <= 1
}
