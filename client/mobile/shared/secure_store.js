import { NativeModules } from 'react-native'
import * as mem from './storage'

const NativeSecure = NativeModules && NativeModules.SecureStore

export async function getItem(k) {
  if (NativeSecure && NativeSecure.getItem) return NativeSecure.getItem(k)
  return mem.getItem(k)
}

export async function setItem(k, v) {
  if (NativeSecure && NativeSecure.setItem) return NativeSecure.setItem(k, v)
  return mem.setItem(k, v)
}

export async function removeItem(k) {
  if (NativeSecure && NativeSecure.removeItem) return NativeSecure.removeItem(k)
  return mem.removeItem(k)
}

