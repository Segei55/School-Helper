package com.example.school_v3.ui.grades

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

private val Context.gradesDataStore: DataStore<Preferences> by preferencesDataStore(name = "grades")

class GradesDataStore(context: Context) {
    private val dataStore = context.gradesDataStore

    companion object {
        private val GRADES_KEY = stringPreferencesKey("grades_list")
    }

    val gradesFlow: Flow<List<Grade>> = dataStore.data.map { preferences ->
        val gradesJson = preferences[GRADES_KEY] ?: "[]"
        try {
            Json.decodeFromString<List<Grade>>(gradesJson)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveGrades(grades: List<Grade>) {
        dataStore.edit { preferences ->
            preferences[GRADES_KEY] = Json.encodeToString(grades)
        }
    }
}
