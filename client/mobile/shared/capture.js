import { NativeModules, NativeEventEmitter, Platform } from 'react-native'

const mod = NativeModules && NativeModules.CaptureGuardModule
let emitter

export function enableSecure() {
  if (Platform.OS === 'android' && mod && mod.enableSecure) mod.enableSecure()
}

export function observeCapture(handler) {
  if (Platform.OS === 'ios' && mod) {
    if (!emitter) emitter = new NativeEventEmitter(mod)
    const sub = emitter.addListener('ScreenCaptureDidChange', handler)
    return () => sub.remove()
  }
  return () => {}
}

