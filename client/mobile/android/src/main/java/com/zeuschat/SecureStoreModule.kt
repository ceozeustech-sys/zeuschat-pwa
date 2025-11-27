package com.zeuschat

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureStoreModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "SecureStore"
  private val alias = "ZEUSCHAT_SECURE_KEY"
  private val prefs: SharedPreferences by lazy { ctx.getSharedPreferences("zeus_secure_store", Context.MODE_PRIVATE) }

  @ReactMethod
  fun getItem(key: String, promise: Promise) {
    val s = prefs.getString(key, null)
    if (s == null) { promise.resolve(null); return }
    try {
      val parts = s.split(":")
      if (parts.size != 2) { promise.resolve(null); return }
      val iv = Base64.decode(parts[0], Base64.DEFAULT)
      val data = Base64.decode(parts[1], Base64.DEFAULT)
      val sk = getOrCreateKey()
      val c = Cipher.getInstance("AES/GCM/NoPadding")
      c.init(Cipher.DECRYPT_MODE, sk, GCMParameterSpec(128, iv))
      val out = c.doFinal(data)
      promise.resolve(String(out, Charsets.UTF_8))
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun setItem(key: String, value: String, promise: Promise) {
    try {
      val sk = getOrCreateKey()
      val c = Cipher.getInstance("AES/GCM/NoPadding")
      c.init(Cipher.ENCRYPT_MODE, sk)
      val iv = c.iv
      val data = c.doFinal(value.toByteArray(Charsets.UTF_8))
      val ivB64 = Base64.encodeToString(iv, Base64.NO_WRAP)
      val dataB64 = Base64.encodeToString(data, Base64.NO_WRAP)
      prefs.edit().putString(key, "$ivB64:$dataB64").apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun removeItem(key: String, promise: Promise) {
    prefs.edit().remove(key).apply()
    promise.resolve(true)
  }

  private fun getOrCreateKey(): SecretKey {
    val ks = KeyStore.getInstance("AndroidKeyStore")
    ks.load(null)
    val existing = ks.getEntry(alias, null)
    if (existing is KeyStore.SecretKeyEntry) return existing.secretKey
    val kg = KeyGenerator.getInstance("AES", "AndroidKeyStore")
    val spec = android.security.keystore.KeyGenParameterSpec.Builder(alias,
      android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256)
      .build()
    kg.init(spec)
    return kg.generateKey()
  }
}

