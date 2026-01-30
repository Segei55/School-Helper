package com.example.school_v3.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val settingsDataStore = SettingsDataStore(application)

    val isDarkMode: StateFlow<Boolean> = settingsDataStore.isDarkMode
        .stateIn(viewModelScope, SharingStarted.Lazily, true)

    fun setDarkMode(isDarkMode: Boolean) {
        viewModelScope.launch {
            settingsDataStore.setDarkMode(isDarkMode)
        }
    }
}
