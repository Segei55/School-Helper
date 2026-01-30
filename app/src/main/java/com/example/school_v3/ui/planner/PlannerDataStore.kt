package com.example.school_v3.ui.planner

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.plannerDataStore: DataStore<Preferences> by preferencesDataStore(name = "planner")

class PlannerDataStore(context: Context) {
    private val dataStore = context.plannerDataStore

    companion object {
        private val REMINDERS_KEY = stringPreferencesKey("reminders_list")
        private val NEXT_ID_KEY = intPreferencesKey("next_id")
    }

    val remindersFlow: Flow<List<Reminder>> = dataStore.data.map { preferences ->
        val remindersJson = preferences[REMINDERS_KEY] ?: "[]"
        try {
            Json.decodeFromString<List<Reminder>>(remindersJson)
        } catch (e: Exception) {
            emptyList()
        }
    }

    val nextIdFlow: Flow<Int> = dataStore.data.map { preferences ->
        preferences[NEXT_ID_KEY] ?: 0
    }

    suspend fun saveReminders(reminders: List<Reminder>) {
        dataStore.edit { preferences ->
            preferences[REMINDERS_KEY] = Json.encodeToString(reminders)
        }
    }

    suspend fun saveNextId(id: Int) {
        dataStore.edit { preferences ->
            preferences[NEXT_ID_KEY] = id
        }
    }
}
