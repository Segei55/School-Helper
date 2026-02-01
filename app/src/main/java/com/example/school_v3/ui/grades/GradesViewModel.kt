package com.example.school_v3.ui.grades

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.school_v3.data.AuthManager
import com.example.school_v3.data.googledrive.GoogleDriveRestManager
import com.example.school_v3.ui.login.LoginViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class GradesViewModel(application: Application, private val loginViewModel: LoginViewModel) : AndroidViewModel(application) {

    private val dataStore = GradesDataStore(application)
    private val _grades = MutableStateFlow<List<Grade>>(emptyList())
    val grades: StateFlow<List<Grade>> = _grades.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val googleDriveRestManager = GoogleDriveRestManager(application)
    private val authManager = AuthManager.getInstance(application)
    
    val isPremium: StateFlow<Boolean> = authManager.isPremiumFlow

    init {
        viewModelScope.launch {
            _grades.value = dataStore.gradesFlow.first()
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    private fun saveLocally() {
        viewModelScope.launch {
            dataStore.saveGrades(_grades.value)
        }
    }

    fun addGrade(grade: Grade) {
        _grades.value = _grades.value + grade
        saveLocally()
    }

    fun removeGrade(grade: Grade) {
        _grades.value = _grades.value - grade
        saveLocally()
    }

    fun clearGrades(subject: String?) {
        if (subject == null || subject == OVERALL_AVERAGE) {
            _grades.value = emptyList()
        } else {
            _grades.value = _grades.value.filter { it.subject != subject }
        }
        saveLocally()
    }

    fun exportGrades() {
        viewModelScope.launch {
            val token = authManager.getAccessToken()
            if (token == null) {
                Log.w("GradesViewModel", "No access token, cannot export")
                _errorMessage.value = "Не удалось выполнить экспорт. Попробуйте войти в аккаунт заново."
                return@launch
            }
            _isLoading.value = true
            try {
                val gradesJson = Json.encodeToString(_grades.value)
                val result = googleDriveRestManager.uploadFile("grades.json", gradesJson)
                if (result != null) {
                    Log.d("GradesViewModel", "Exported successfully")
                } else {
                    _errorMessage.value = "Не удалось выполнить экспорт. Попробуйте войти в аккаунт заново."
                }
            } catch (e: Exception) {
                Log.e("GradesViewModel", "Export error", e)
                _errorMessage.value = "Не удалось выполнить экспорт. Попробуйте войти в аккаунт заново."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun importGrades() {
        viewModelScope.launch {
            val token = authManager.getAccessToken()
            if (token == null) {
                Log.w("GradesViewModel", "No access token, cannot import")
                _errorMessage.value = "Не удалось выполнить импорт. Попробуйте войти в аккаунт заново."
                return@launch
            }
            _isLoading.value = true
            try {
                val gradesJson = googleDriveRestManager.downloadFile("grades.json")
                if (gradesJson != null) {
                    try {
                        val importedGrades = Json.decodeFromString<List<Grade>>(gradesJson)
                        _grades.value = importedGrades
                        saveLocally()
                        Log.d("GradesViewModel", "Imported successfully")
                    } catch (e: Exception) {
                        Log.e("GradesViewModel", "Parse error", e)
                        _errorMessage.value = "Не удалось выполнить импорт. Попробуйте войти в аккаунт заново."
                    }
                } else {
                    _errorMessage.value = "Не удалось выполнить импорт. Попробуйте войти в аккаунт заново."
                }
            } catch (e: Exception) {
                Log.e("GradesViewModel", "Import error", e)
                _errorMessage.value = "Не удалось выполнить импорт. Попробуйте войти в аккаунт заново."
            } finally {
                _isLoading.value = false
            }
        }
    }
}
