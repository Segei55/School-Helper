package com.example.school_v3.ui.stopwatch

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class StopwatchViewModel : ViewModel() {
    var isRunning = mutableStateOf(false)
    var timeInMillis = mutableStateOf(0L)
    val laps = mutableStateListOf<String>()
    
    private var stopwatchJob: Job? = null

    fun toggleRunning() {
        isRunning.value = !isRunning.value
        if (isRunning.value) {
            startStopwatch()
        } else {
            stopStopwatch()
        }
    }

    private fun startStopwatch() {
        stopwatchJob?.cancel()
        val startTime = System.currentTimeMillis() - timeInMillis.value
        stopwatchJob = viewModelScope.launch {
            while (isRunning.value) {
                timeInMillis.value = System.currentTimeMillis() - startTime
                // Обновляем раз в 30 мс для плавности (~33 FPS), 
                // что значительно снижает нагрузку на CPU по сравнению с 10 мс
                delay(30)
            }
        }
    }

    private fun stopStopwatch() {
        stopwatchJob?.cancel()
    }

    fun reset() {
        isRunning.value = false
        stopStopwatch()
        timeInMillis.value = 0L
        laps.clear()
    }

    fun addLap(lapTime: String) {
        laps.add(lapTime)
    }

    override fun onCleared() {
        super.onCleared()
        stopStopwatch()
    }
}
