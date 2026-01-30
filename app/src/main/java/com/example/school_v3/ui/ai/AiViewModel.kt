package com.example.school_v3.ui.ai

import android.app.Application
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.school_v3.ai.ChatRequest
import com.example.school_v3.ai.aiService
import com.example.school_v3.data.AuthManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import retrofit2.HttpException
import com.example.school_v3.ai.ChatMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Serializable
data class UiChatMessage(val text: String, val isUser: Boolean)

class AiViewModel(application: Application) : AndroidViewModel(application) {
    private val dataStore = AiDataStore(application)
    private val authManager = AuthManager.getInstance(application)
    private val initialMessage = UiChatMessage("Привет! Чем могу помочь?", isUser = false)
    
    private val _chatHistory = mutableStateOf(listOf(initialMessage))
    val chatHistory: State<List<UiChatMessage>> = _chatHistory

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    private var generationJob: Job? = null

    private val prefs = application.getSharedPreferences("ai_limits", android.content.Context.MODE_PRIVATE)
    private val _messageCount = mutableStateOf(0)
    val messageCount: State<Int> = _messageCount

    private val _showPremiumBanner = mutableStateOf(false)
    val showPremiumBanner: State<Boolean> = _showPremiumBanner

    init {
        viewModelScope.launch {
            val savedHistory = dataStore.chatHistoryFlow.first()
            if (savedHistory.isNotEmpty()) {
                _chatHistory.value = savedHistory
            }
            checkDailyLimit()
        }
    }

    private fun checkDailyLimit() {
        // Если пользователь Premium, счетчик не имеет значения
        if (authManager.isPremium()) {
            _messageCount.value = 0
            return
        }

        val today = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(Date())
        val lastDate = prefs.getString("last_date", "")
        if (today != lastDate) {
            prefs.edit().putString("last_date", today).putInt("count", 0).apply()
            _messageCount.value = 0
        } else {
            _messageCount.value = prefs.getInt("count", 0)
        }
    }

    private fun incrementMessageCount() {
        if (!authManager.isPremium()) {
            _messageCount.value += 1
            prefs.edit().putInt("count", _messageCount.value).apply()
        } else {
            // Для Premium всегда 0
            _messageCount.value = 0
        }
    }

    fun dismissPremiumBanner() {
        _showPremiumBanner.value = false
    }

    fun clearChat() {
        cancelGeneration()
        _chatHistory.value = listOf(initialMessage)
        saveHistory()
    }

    fun cancelGeneration() {
        generationJob?.cancel()
        _isLoading.value = false
    }

    fun sendMessage(userMessage: String) {
        if (userMessage.isBlank()) return
        
        val isPremium = authManager.isPremium()
        
        // Лимиты проверяются только для не-Premium пользователей
        if (!isPremium && _messageCount.value >= 8) {
            _showPremiumBanner.value = true
            return
        }

        _chatHistory.value = _chatHistory.value + UiChatMessage(userMessage.trim(), isUser = true)
        saveHistory()
        _isLoading.value = true
        incrementMessageCount()

        generationJob = viewModelScope.launch {
            try {
                val messages = buildChatMessages()
                val request = ChatRequest(model = "tngtech/deepseek-r1t2-chimera:free", messages = messages)

                val response = aiService.api.getCompletion(request)
                val assistantResponseRaw = response.choices.firstOrNull()?.message?.content
                    ?: "Не удалось получить ответ от OpenRouter."
                
                val assistantResponse = assistantResponseRaw.trim()
                _chatHistory.value = _chatHistory.value + UiChatMessage(assistantResponse, isUser = false)
                saveHistory()

            } catch (e: HttpException) {
                _chatHistory.value = _chatHistory.value + UiChatMessage("Ошибка сети. Попробуйте позже.", isUser = false)
            } catch (e: CancellationException) {
                // Ignore
            } catch (e: Exception) {
                _chatHistory.value = _chatHistory.value + UiChatMessage("Произошла ошибка: ${e.message}", isUser = false)
            } finally {
                _isLoading.value = false
                saveHistory()
            }
        }
    }

    private fun buildChatMessages(): List<ChatMessage> {
        return _chatHistory.value.map {
            ChatMessage(role = if (it.isUser) "user" else "assistant", content = it.text)
        }
    }

    private fun saveHistory() {
        viewModelScope.launch {
            dataStore.saveChatHistory(_chatHistory.value)
        }
    }
}
