package com.example.school_v3.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable

@Serializable
data class WebAuthData(
    val email: String? = null,
    val name: String? = null,
    val picture: String? = null,
    val license_key: String? = null,
    val is_premium: Boolean = false,
    val premium_until: String? = null,
    val access_token: String? = null
)

class AuthManager private constructor(context: Context) {
    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)

    private val _isPremiumFlow = MutableStateFlow(isPremium())
    val isPremiumFlow: StateFlow<Boolean> = _isPremiumFlow

    companion object {
        private const val KEY_EMAIL = "email"
        private const val KEY_NAME = "name"
        private const val KEY_PICTURE = "picture"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_IS_PREMIUM = "is_premium"
        private const val KEY_AUTH_KEY = "key"
        private const val KEY_UNTIL = "until"
        private const val KEY_OFFLINE_ANON = "offline_anonymous"

        @Volatile
        private var INSTANCE: AuthManager? = null

        fun getInstance(context: Context): AuthManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AuthManager(context).also { INSTANCE = it }
            }
        }
    }

    fun saveAuthData(
        email: String?,
        name: String?,
        picture: String?,
        accessToken: String?,
        isPremium: Boolean,
        key: String?,
        until: String?
    ) {
        prefs.edit().apply {
            putString(KEY_EMAIL, email)
            putString(KEY_NAME, name)
            putString(KEY_PICTURE, picture)
            putString(KEY_ACCESS_TOKEN, accessToken)
            putBoolean(KEY_IS_PREMIUM, isPremium)
            putString(KEY_AUTH_KEY, key)
            putString(KEY_UNTIL, until)
            putBoolean(KEY_OFFLINE_ANON, false)
            apply()
        }
        _isPremiumFlow.value = isPremium
    }

    fun saveAuthData(
        email: String?,
        name: String?,
        picture: String?,
        accessToken: String?,
        isPremium: String?,
        key: String?,
        until: String?
    ) {
        saveAuthData(email, name, picture, accessToken, isPremium == "1", key, until)
    }

    fun setPremium(active: Boolean) {
        prefs.edit().putBoolean(KEY_IS_PREMIUM, active).apply()
        _isPremiumFlow.value = active
    }

    fun getAuthKey(): String? = prefs.getString(KEY_AUTH_KEY, null)
    fun getUntilDate(): String? = prefs.getString(KEY_UNTIL, null)

    fun setOfflineAnonymous(isAnon: Boolean) {
        prefs.edit().putBoolean(KEY_OFFLINE_ANON, isAnon).apply()
    }

    fun isOfflineAnonymous(): Boolean = prefs.getBoolean(KEY_OFFLINE_ANON, false)
    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    fun getEmail(): String? = prefs.getString(KEY_EMAIL, null)
    fun getName(): String? = prefs.getString(KEY_NAME, null)
    fun getPicture(): String? = prefs.getString(KEY_PICTURE, null)
    fun isPremium(): Boolean = prefs.getBoolean(KEY_IS_PREMIUM, false)

    fun clear() {
        prefs.edit().clear().apply()
        _isPremiumFlow.value = false
    }
}
