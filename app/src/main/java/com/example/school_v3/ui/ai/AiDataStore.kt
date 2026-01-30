package com.example.school_v3.ui.ai

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.aiDataStore: DataStore<Preferences> by preferencesDataStore(name = "ai_chat")

class AiDataStore(context: Context) {
    private val dataStore = context.aiDataStore

    companion object {
        private val CHAT_HISTORY_KEY = stringPreferencesKey("chat_history")
    }

    val chatHistoryFlow: Flow<List<UiChatMessage>> = dataStore.data.map { preferences ->
        val chatJson = preferences[CHAT_HISTORY_KEY] ?: "[]"
        try {
            Json.decodeFromString<List<UiChatMessage>>(chatJson)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveChatHistory(history: List<UiChatMessage>) {
        dataStore.edit { preferences ->
            preferences[CHAT_HISTORY_KEY] = Json.encodeToString(history)
        }
    }
}
