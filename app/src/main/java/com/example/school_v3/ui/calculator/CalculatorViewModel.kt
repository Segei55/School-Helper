package com.example.school_v3.ui.calculator

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class CalculatorViewModel : ViewModel() {
    // Shared
    var selectedTabIndex = mutableIntStateOf(0)

    // Standard
    var standardDisplay = mutableStateOf("0")
    var standardPreviewResult = mutableStateOf("")

    // Scientific
    var scientificDisplay = mutableStateOf("0")
    var scientificPreviewResult = mutableStateOf("")

    // Grapher
    var functionText by mutableStateOf("x^2")
    var isFullscreen by mutableStateOf(false)
    var scale by mutableFloatStateOf(50f)
    var offsetX by mutableFloatStateOf(0f)
    var offsetY by mutableFloatStateOf(0f)

    // New Grapher features
    var isSnapToGridEnabled by mutableStateOf(false)
    var selectedPoint by mutableStateOf<Pair<Double, Double>?>(null)
}
