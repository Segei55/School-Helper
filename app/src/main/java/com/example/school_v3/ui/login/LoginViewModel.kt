package com.example.school_v3.ui.login

import android.app.Application
import android.content.Context
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.school_v3.data.AuthManager
import com.example.school_v3.data.api.SchoolHelperApiService
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import com.google.android.gms.tasks.Task
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

class LoginViewModel(application: Application) : AndroidViewModel(application) {

    private val auth: FirebaseAuth = Firebase.auth
    private val authManager = AuthManager.getInstance(application)

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState

    private val _firebaseUser = MutableStateFlow(auth.currentUser)
    val firebaseUser: StateFlow<com.google.firebase.auth.FirebaseUser?> = _firebaseUser

    private val _googleSignInAccount = MutableStateFlow<GoogleSignInAccount?>(null)
    val googleSignInAccount: StateFlow<GoogleSignInAccount?> = _googleSignInAccount

    private val _navigateToMain = MutableStateFlow(false)
    val navigateToMain: StateFlow<Boolean> = _navigateToMain

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    // Новый поток для динамического обновления данных профиля в UI
    private val _authDataUpdated = MutableStateFlow(0)
    val authDataUpdated: StateFlow<Int> = _authDataUpdated

    init {
        checkLoginStatus()
        backgroundSubscriptionCheck()
    }

    private fun checkLoginStatus() {
        val hasAccessToken = authManager.getAccessToken() != null
        val isOfflineAnonymous = authManager.isOfflineAnonymous()
        val hasFirebaseUser = auth.currentUser != null
        
        if (hasAccessToken || isOfflineAnonymous || hasFirebaseUser) {
            _isLoggedIn.value = true
            _navigateToMain.value = true
            _googleSignInAccount.value = GoogleSignIn.getLastSignedInAccount(getApplication())
        }
    }

    fun backgroundSubscriptionCheck() {
        val email = authManager.getEmail()
        val key = authManager.getAuthKey()
        
        if (email != null && key != null) {
            viewModelScope.launch {
                try {
                    val api = Retrofit.Builder()
                        .baseUrl("https://school-helper.ru/")
                        .addConverterFactory(Json { ignoreUnknownKeys = true }.asConverterFactory("application/json".toMediaType()))
                        .build()
                        .create(SchoolHelperApiService::class.java)
                        
                    val response = api.checkSubscription(email = email, key = key)
                    if (response.isSuccessful) {
                        val body = response.body()
                        if (body != null) {
                            authManager.setPremium(body.is_premium)
                            _authDataUpdated.value += 1 // Триггерим обновление UI
                            Log.d("SubscriptionCheck", "Status updated. Premium: ${body.is_premium}")
                        }
                    }
                } catch (e: Exception) {
                    Log.e("SubscriptionCheck", "Check failed")
                }
            }
        }
    }

    fun onWebAuthSuccess() {
        _isLoggedIn.value = true
        _loginState.value = LoginState.Success
        _navigateToMain.value = true
        _authDataUpdated.value += 1 // Важно: уведомляем об обновлении данных
        backgroundSubscriptionCheck()
    }

    fun setGoogleSignInAccount(account: GoogleSignInAccount?) {
        _googleSignInAccount.value = account
    }

    fun signInWithGoogle(idToken: String) {
        _loginState.value = LoginState.Loading
        viewModelScope.launch {
            try {
                val credential = GoogleAuthProvider.getCredential(idToken, null)
                val result = auth.signInWithCredential(credential).await()
                authManager.setOfflineAnonymous(false)
                _firebaseUser.value = result.user
                _isLoggedIn.value = true
                _loginState.value = LoginState.Success
                _navigateToMain.value = true
                _authDataUpdated.value += 1
            } catch (e: Exception) {
                Log.e("LoginViewModel", "Sign-in failed")
                _loginState.value = LoginState.Error("Ошибка входа")
            }
        }
    }

    fun signInAnonymously() {
        // Локальная идентификация без вызова Firebase
        authManager.setOfflineAnonymous(true)
        _firebaseUser.value = null 
        _isLoggedIn.value = true
        _loginState.value = LoginState.Success
        _navigateToMain.value = true
        _authDataUpdated.value += 1
    }

    fun signOut(context: Context) {
        viewModelScope.launch {
            try {
                auth.signOut()
                GoogleSignIn.getClient(context, GoogleSignInOptions.DEFAULT_SIGN_IN).signOut().await()
                authManager.clear()
                _firebaseUser.value = null
                _googleSignInAccount.value = null
                _isLoggedIn.value = false
                _loginState.value = LoginState.Idle
                _navigateToMain.value = false
                _authDataUpdated.value += 1
            } catch (e: Exception) {
                Log.e("LoginViewModel", "Sign out error")
            }
        }
    }

    fun onNavigationHandled() {
        _navigateToMain.value = false
    }
}

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    object Success : LoginState() 
    data class Error(val message: String) : LoginState()
}

suspend fun <T> Task<T>.await(): T = suspendCoroutine { continuation ->
    addOnSuccessListener { result ->
        continuation.resume(result)
    }
    addOnFailureListener { exception ->
        continuation.resumeWithException(exception)
    }
}
