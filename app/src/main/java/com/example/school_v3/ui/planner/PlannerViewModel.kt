package com.example.school_v3.ui.planner

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class PlannerViewModel(application: Application) : AndroidViewModel(application) {
    private val dataStore = PlannerDataStore(application)

    private val _reminders = MutableStateFlow<List<Reminder>>(emptyList())
    val reminders: StateFlow<List<Reminder>> = _reminders.asStateFlow()

    private var nextId = 0

    init {
        viewModelScope.launch {
            _reminders.value = dataStore.remindersFlow.first()
            nextId = dataStore.nextIdFlow.first()
        }
    }

    fun addReminder(reminder: Reminder, onScheduled: (Reminder) -> Unit) {
        val reminderWithId = reminder.copy(id = nextId++)
        val updatedList = _reminders.value + reminderWithId
        _reminders.value = updatedList
        saveLocally()
        onScheduled(reminderWithId)
    }

    fun removeReminder(reminder: Reminder) {
        val updatedList = _reminders.value.filter { it.id != reminder.id }
        _reminders.value = updatedList
        saveLocally()
    }

    fun toggleReminderCompletion(reminder: Reminder) {
        val updatedList = _reminders.value.map {
            if (it.id == reminder.id) it.copy(isCompleted = !it.isCompleted) else it
        }
        _reminders.value = updatedList
        saveLocally()
    }

    private fun saveLocally() {
        viewModelScope.launch {
            dataStore.saveReminders(_reminders.value)
            dataStore.saveNextId(nextId)
        }
    }
}
