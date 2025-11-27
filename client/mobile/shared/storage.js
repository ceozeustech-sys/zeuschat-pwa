const store = {}

export async function getItem(k) {
  return store[k] || null
}

export async function setItem(k, v) {
  store[k] = v
}

export async function removeItem(k) {
  delete store[k]
}

