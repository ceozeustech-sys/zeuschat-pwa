package com.zeuschat

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CaptureGuardModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "CaptureGuardModule"
  @ReactMethod
  fun enableSecure() {
    val a = currentActivity ?: return
    a.runOnUiThread { a.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE) }
  }
}

