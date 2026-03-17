export function idFromPath(p: string) {
  return Buffer.from(p, 'utf-8').toString('base64url')
}

export function pathFromId(id: string) {
  return Buffer.from(id, 'base64url').toString('utf-8')
}

