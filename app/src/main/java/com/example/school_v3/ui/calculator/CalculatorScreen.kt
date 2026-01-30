package com.example.school_v3.ui.calculator

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.filled.CenterFocusWeak
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.GridOff
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.FormatBold
import androidx.compose.material.icons.filled.FormatItalic
import androidx.compose.material.icons.filled.FormatUnderlined
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.school_v3.data.AuthManager
import com.example.school_v3.ui.settings.PremiumBanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.withContext
import net.objecthunter.exp4j.ExpressionBuilder
import java.util.Locale
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.roundToLong

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalculatorScreen(viewModel: CalculatorViewModel = viewModel(), navController: NavController) {
    val context = LocalContext.current
    val authManager = remember { AuthManager.getInstance(context) }
    val isPremium = authManager.isPremium()
    var showPremiumBanner by remember { mutableStateOf(false) }

    val calculatorTypes = listOf("Обычный", "Научный", "Функции")
    val selectedTabIndex = viewModel.selectedTabIndex

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Калькулятор") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding)
        ) {
            ScrollableTabRow(
                selectedTabIndex = selectedTabIndex.intValue,
                modifier = Modifier.fillMaxWidth(),
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex.intValue]),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            ) {
                calculatorTypes.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTabIndex.intValue == index,
                        onClick = { 
                            if (index == 2 && !isPremium) {
                                showPremiumBanner = true
                            } else {
                                selectedTabIndex.intValue = index
                            }
                        },
                        text = { Text(text = title) },
                        selectedContentColor = MaterialTheme.colorScheme.onSurface,
                        unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            when (selectedTabIndex.intValue) {
                0 -> StandardCalculator(viewModel)
                1 -> ScientificCalculator(viewModel)
                2 -> FunctionGrapher(viewModel)
            }
        }
    }

    if (showPremiumBanner) {
        PremiumBanner(
            onDismiss = { showPremiumBanner = false },
            onGoToSettings = {
                showPremiumBanner = false
                navController.navigate("settings")
            }
        )
    }
}

@Composable
fun StandardCalculator(viewModel: CalculatorViewModel) {
    val display = viewModel.standardDisplay
    val previewResult = viewModel.standardPreviewResult
    val scrollState = rememberScrollState()
    val scrollTarget = remember { mutableIntStateOf(Int.MAX_VALUE) }

    LaunchedEffect(display.value) {
        scrollState.scrollTo(scrollTarget.intValue)
        scrollTarget.intValue = Int.MAX_VALUE
        try {
            val expression = display.value.replace("×", "*").replace("÷", "/").replace(",", ".")
            val result = ExpressionBuilder(expression).build().evaluate()
            previewResult.value = result.toString()
        } catch (e: Exception) {
            previewResult.value = ""
        }
    }

    val onButtonClick: (String) -> Unit = onButtonClick@{ label ->
        try {
            when (label) {
                "AC" -> {
                    display.value = "0"
                    previewResult.value = ""
                }
                "()" -> {
                    val current = display.value
                    if (current == "0" || current == "Error") {
                        display.value = "("
                        return@onButtonClick
                    }
                    val openParenCount = current.count { it == '(' }
                    val closeParenCount = current.count { it == ')' }
                    val lastChar = current.last()

                    if (lastChar.isDigit() || lastChar == ')') {
                        if (openParenCount > closeParenCount) {
                            display.value += ")"
                        } else {
                            display.value += "×("
                        }
                    } else if (lastChar in "÷×-+" || lastChar == '(') {
                        display.value += "("
                    }
                }
                "%" -> {
                    if (display.value != "0" && display.value != "Error") {
                        val result = ExpressionBuilder(display.value).build().evaluate() / 100
                        display.value = result.toString()
                    }
                }
                "=" -> {
                    display.value = previewResult.value
                    previewResult.value = ""
                }
                "⌫" -> {
                    if (display.value.length > 1) {
                        display.value = display.value.dropLast(1)
                    }
                    else {
                        display.value = "0"
                    }
                }
                in listOf("÷", "×", "-", "+") -> {
                    val current = display.value
                    if (current == "0" && label == "-") {
                        display.value = "-"
                        return@onButtonClick
                    }
                    if (current.isEmpty() || current == "Error" || current.last() == '(') {
                        if (label == "-") display.value += label
                        return@onButtonClick
                    }

                    val lastChar = current.last()
                    if (lastChar in "÷×-+") {
                        display.value = current.dropLast(1) + label
                    }
                    else {
                        display.value += label
                    }
                }
                "," -> {
                    val current = display.value
                    if (current == "Error") {
                        display.value = "0,"
                        return@onButtonClick
                    }
                    val lastChar = current.lastOrNull()

                    val operators = charArrayOf('+', '-', '×', '÷', '(')
                    val lastOperatorIndex = current.lastIndexOfAny(operators)
                    val currentNumber = if(lastOperatorIndex == -1) current else current.substring(lastOperatorIndex + 1)

                    if (!currentNumber.contains(",")) {
                        if (lastChar != null && (lastChar in "÷×-+" || lastChar == '(')) {
                            display.value += "0,"
                        } else {
                            display.value += ","
                        }
                    }
                }
                else -> { // Numbers
                    if (display.value == "0" || display.value == "Error") {
                        display.value = label
                    }
                    else {
                        display.value += label
                    }
                }
            }
        } catch (_: Exception) {
            display.value = "Error"
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Bottom
    ) {
        BasicTextField(
            value = display.value,
            onValueChange = {},
            readOnly = true,
            maxLines = 1,
            textStyle = TextStyle(
                fontSize = 48.sp,
                textAlign = TextAlign.End,
                color = MaterialTheme.colorScheme.onSurface
            ),
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(scrollState)
        )
        Text(
            text = previewResult.value,
            style = TextStyle(
                fontSize = 24.sp,
                textAlign = TextAlign.End,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            ),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            maxLines = 1
        )

        val buttons = listOf(
            listOf("AC", "()", "%", "÷"),
            listOf("7", "8", "9", "×"),
            listOf("4", "5", "6", "-"),
            listOf("1", "2", "3", "+"),
            listOf("0", ",", "⌫", "=")
        )

        buttons.forEach { row ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { label ->
                    CalculatorButton(label = label, onClick = { onButtonClick(label) }, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun ScientificCalculator(viewModel: CalculatorViewModel) {
    val display = viewModel.scientificDisplay
    val previewResult = viewModel.scientificPreviewResult
    val scrollState = rememberScrollState()
    val scrollTarget = remember { mutableIntStateOf(Int.MAX_VALUE) }

    LaunchedEffect(display.value) {
        scrollState.scrollTo(scrollTarget.intValue)
        scrollTarget.intValue = Int.MAX_VALUE
        try {
            val expression = display.value
                .replace("×", "*")
                .replace("÷", "/")
                .replace(",", ".")
                .replace("√", "sqrt")
                .replace("π", "pi")
                .replace("e", "2.718281828459045")
                .replace("log", "log10")
                .replace("ln", "log")

            if (expression.isNotBlank() && expression != "Error") { // Only calculate if not blank or error
                val result = ExpressionBuilder(expression).build().evaluate()
                previewResult.value = result.toString()
            } else {
                previewResult.value = ""
            }
        } catch (e: Exception) {
            previewResult.value = ""
        }
    }

    val onButtonClick: (String) -> Unit = onButtonClick@{ label ->
        try {
            when (label) {
                "AC" -> {
                    display.value = "0"
                    previewResult.value = ""
                }
                "()" -> {
                    val current = display.value
                    if (current == "0" || current == "Error") {
                        display.value = "("
                        return@onButtonClick
                    }
                    val openParenCount = current.count { it == '(' }
                    val closeParenCount = current.count { it == ')' }
                    val lastChar = current.last()

                    if (lastChar.isDigit() || lastChar == ')') {
                        if (openParenCount > closeParenCount) {
                            display.value += ")"
                        } else {
                            display.value += "×("
                        }
                    } else if (lastChar in "÷×-+" || lastChar == '(') {
                        display.value += "("
                    }
                }
                "%" -> {
                    if (display.value != "0" && display.value != "Error") {
                        val result = ExpressionBuilder(display.value).build().evaluate() / 100
                        display.value = result.toString()
                    }
                }
                "=" -> {
                    display.value = previewResult.value
                    previewResult.value = ""
                }
                "⌫" -> {
                    if (display.value.length > 1) {
                        display.value = display.value.dropLast(1)
                    }
                    else {
                        display.value = "0"
                    }
                }
                in listOf("÷", "×", "-", "+", "^") -> {
                    val current = display.value
                    if (current == "0" && label == "-") {
                        display.value = "-"
                        return@onButtonClick
                    }
                    if (current.isEmpty() || current == "Error" || current.last() == '(') {
                        if (label == "-") display.value += label
                        return@onButtonClick
                    }

                    val lastChar = current.last()
                    if (lastChar in "÷×-+") {
                        display.value = current.dropLast(1) + label
                    }
                    else {
                        display.value += label
                    }
                }
                // Scientific functions
                in listOf("sin", "cos", "tan", "log", "ln", "√") -> {
                    if (display.value == "0" || display.value == "Error") {
                        display.value = "$label("
                    } else {
                        val lastChar = display.value.last()
                        if (lastChar.isDigit() || lastChar == ')') {
                            display.value += "×$label("
                        } else {
                            display.value += "$label("
                        }
                    }
                }
                "π", "e" -> {
                    if (display.value == "0" || display.value == "Error") {
                        display.value = label
                    }
                    else {
                        val lastChar = display.value.last()
                        if (lastChar.isDigit() || lastChar == ')') {
                            display.value += "×$label"
                        } else {
                            display.value += label
                        }
                    }
                }
                "," -> {
                    val current = display.value
                    if (current == "Error") {
                        display.value = "0,"
                        return@onButtonClick
                    }
                    val lastChar = current.lastOrNull()

                    val operators = charArrayOf('+', '-', '×', '÷', '(', '^')
                    val lastOperatorIndex = current.lastIndexOfAny(operators)
                    val currentNumber = if(lastOperatorIndex == -1) current else current.substring(lastOperatorIndex + 1)

                    if (!currentNumber.contains(",")) {
                        if (lastChar != null && (lastChar in "÷×-+" || lastChar == '(' || lastChar == '^')) {
                            display.value += "0,"
                        }
                        else {
                            display.value += ","
                        }
                    }
                }
                else -> { // Numbers
                    if (display.value == "0" || display.value == "Error") {
                        display.value = label
                    }
                    else {
                        display.value += label
                    }
                }
            }
        } catch (_: Exception) {
            display.value = "Error"
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(8.dp),
        verticalArrangement = Arrangement.Bottom
    ) {
        BasicTextField(
            value = display.value,
            onValueChange = {},
            readOnly = true,
            maxLines = 1,
            textStyle = TextStyle(
                fontSize = 48.sp,
                textAlign = TextAlign.End,
                color = MaterialTheme.colorScheme.onSurface
            ),
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
        )
        Text(
            text = previewResult.value,
            style = TextStyle(
                fontSize = 24.sp,
                textAlign = TextAlign.End,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            ),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            maxLines = 1
        )

        val buttons = listOf(
            listOf("sin", "cos", "tan", "log", "ln"),
            listOf("√", "^", "e", "π", "()"),
            listOf("AC", "%", "÷", "×", "⌫"),
            listOf("7", "8", "9", "-"),
            listOf("4", "5", "6", "+"),
            listOf("1", "2", "3", "="),
            listOf("0", ",")
        )

        buttons.forEach { row ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                row.forEach { label ->
                    CalculatorButton(
                        label = label,
                        onClick = { onButtonClick(label) },
                        modifier = Modifier.weight(1f),
                        isScientific = true
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalComposeUiApi::class)
@Composable
fun FunctionGrapher(viewModel: CalculatorViewModel) {
    var functionText by viewModel::functionText
    var isFullscreen by viewModel::isFullscreen
    var scale by viewModel::scale
    var offsetX by viewModel::offsetX
    var offsetY by viewModel::offsetY
    var isSnapToGrid by viewModel::isSnapToGridEnabled
    var selectedPoint by viewModel::selectedPoint
    
    var path by remember { mutableStateOf(Path()) }
    // Overscan cache to prevent shaking
    var cachedPathOffsetX by remember { mutableFloatStateOf(0f) }
    var cachedPathOffsetY by remember { mutableFloatStateOf(0f) }
    var cachedScale by remember { mutableFloatStateOf(100f) }

    val expression = remember(functionText) {
        if (functionText.isBlank()) {
            null
        } else {
            try {
                val processedText = functionText
                    .replace("√", "sqrt")
                    .replace("π", "pi")
                    .replace("e", "2.718281828459045")
                ExpressionBuilder(processedText).variable("x").build()
            } catch (_: Exception) {
                null
            }
        }
    }

    LaunchedEffect(expression) {
        selectedPoint?.let { (x, _) ->
            try {
                val newY = expression?.setVariable("x", x)?.evaluate() ?: 0.0
                selectedPoint = x to newY
            } catch (_: Exception) {
                selectedPoint = null
            }
        }
    }

    val onFunctionButtonClick: (String) -> Unit = { label ->
        when (label) {
            "AC" -> functionText = ""
            "⌫" -> if (functionText.isNotEmpty()) functionText = functionText.dropLast(1)
            "√" -> functionText += "sqrt("
            "sin", "cos", "tan", "log" -> functionText += "$label("
            "()" -> {
                 val openCount = functionText.count { it == '(' }
                 val closeCount = functionText.count { it == ')' }
                 if (openCount > closeCount) functionText += ")" else functionText += "("
            }
            else -> {
                if (functionText == "x^2" && label !in listOf("+", "-", "*", "/", "^")) {
                    functionText = label
                } else {
                    functionText += label
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(if (isFullscreen) 0.dp else 16.dp),
    ) {
        if (!isFullscreen) {
            OutlinedTextField(
                value = functionText,
                onValueChange = { functionText = it },
                label = { Text("f(x) =") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface
                )
            )
            Spacer(Modifier.height(8.dp))
        }

        val gridColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
        val majorGridColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.15f)
        val axisColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        val labelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f).toArgb()
        val functionColor = MaterialTheme.colorScheme.primary
        val canvasBackgroundColor = MaterialTheme.colorScheme.surface

        BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
            val density = LocalDensity.current
            val canvasWidth = with(density) { maxWidth.toPx() }
            val canvasHeight = with(density) { maxHeight.toPx() }

            LaunchedEffect(expression, canvasWidth, canvasHeight) {
                if (canvasWidth == 0f || expression == null) {
                    path = Path()
                    return@LaunchedEffect
                }

                snapshotFlow { Triple(scale, offsetX, offsetY) }
                    .collectLatest { (currentScale, currentOffsetX, currentOffsetY) ->
                        val scaleRatio = if (cachedScale != 0f) currentScale / cachedScale else 1f
                        val panDist = abs(currentOffsetX - cachedPathOffsetX) + abs(currentOffsetY - cachedPathOffsetY)
                        
                        // Адаптивная задержка: если изменения сильные, реагируем быстрее
                        val delayTime = when {
                            scaleRatio < 0.7f || scaleRatio > 1.4f -> 30L
                            panDist > 200f -> 50L
                            else -> 100L
                        }
                        kotlinx.coroutines.delay(delayTime)
                        
                        withContext(Dispatchers.Default) {
                            val newPath = Path()
                            val yAxisX = canvasWidth / 2f + currentOffsetX
                            val xAxisY = canvasHeight / 2f + currentOffsetY
                            
                            // Увеличиваем оверскан для плавного панорамирования
                            val startPx = (-canvasWidth * 2).toInt()
                            val endPx = (canvasWidth * 3).toInt()
                            
                            var firstPoint = true
                            var lastPy: Float? = null

                            for (px in startPx..endPx) {
                                val x = (px.toDouble() - yAxisX) / currentScale
                                try {
                                    val yVal = expression.setVariable("x", x).evaluate()
                                    val py = (xAxisY - (yVal * currentScale)).toFloat()

                                    if (py.isFinite()) {
                                        // Порог для предотвращения артефактов при огромных координатах
                                        val limit = 20000f 
                                        
                                        // Детекция разрывов (асимптоты)
                                        val isJump = lastPy != null && abs(py - lastPy!!) > canvasHeight * 5f
                                        
                                        if (firstPoint || isJump) {
                                            newPath.moveTo(px.toFloat(), py.coerceIn(-limit, limit))
                                            firstPoint = false
                                        } else {
                                            // Если обе точки далеко за пределами экрана с одной стороны - 
                                            // используем moveTo, чтобы не рисовать горизонтальную линию на границе
                                            val bothWayAbove = py > limit && lastPy!! > limit
                                            val bothWayBelow = py < -limit && lastPy!! < -limit
                                            
                                            if (bothWayAbove || bothWayBelow) {
                                                newPath.moveTo(px.toFloat(), py.coerceIn(-limit, limit))
                                            } else {
                                                newPath.lineTo(px.toFloat(), py.coerceIn(-limit, limit))
                                            }
                                        }
                                        lastPy = py
                                    } else {
                                        firstPoint = true
                                        lastPy = null
                                    }
                                } catch (_: Exception) {
                                    firstPoint = true
                                    lastPy = null
                                }
                            }
                            withContext(Dispatchers.Main) {
                                path = newPath
                                cachedPathOffsetX = currentOffsetX
                                cachedPathOffsetY = currentOffsetY
                                cachedScale = currentScale
                            }
                        }
                    }
            }

            Canvas(modifier = Modifier
                .fillMaxSize()
                .background(canvasBackgroundColor)
                .pointerInput(isSnapToGrid) {
                    detectTransformGestures(
                        onGesture = { centroid, pan, zoom, _ ->
                            val oldScale = scale
                            scale = (scale * zoom).coerceIn(10f, 5000f)
                            
                            val centerX = canvasWidth / 2f
                            val centerY = canvasHeight / 2f
                            
                            offsetX = (offsetX + pan.x) * (scale / oldScale) + (centerX - centroid.x) * (scale / oldScale - 1f)
                            offsetY = (offsetY + pan.y) * (scale / oldScale) + (centerY - centroid.y) * (scale / oldScale - 1f)
                        }
                    )
                }
                .pointerInput(expression, isSnapToGrid) {
                    detectTapGestures { offset ->
                        val yAxisX = canvasWidth / 2f + offsetX
                        val rawX = ((offset.x - yAxisX) / scale).toDouble()
                        val x = if (isSnapToGrid) rawX.roundToLong().toDouble() else rawX
                        
                        try {
                            val y = expression?.setVariable("x", x)?.evaluate() ?: 0.0
                            selectedPoint = x to y
                        } catch (_: Exception) {
                            selectedPoint = null
                        }
                    }
                }
            ) {
                clipRect {
                    val yAxisX = size.width / 2f + offsetX
                    val xAxisY = size.height / 2f + offsetY

                    // Dynamic Grid
                    val targetGridPx = 150f
                    val unitsPerGridRaw = targetGridPx / scale
                    val log = floor(log10(unitsPerGridRaw.toDouble()))
                    val pow10 = 10.0.pow(log)
                    val ratio = unitsPerGridRaw / pow10
                    
                    val unitsPerGrid = when {
                        ratio < 1.5 -> 1.0 * pow10
                        ratio < 3.5 -> 2.0 * pow10
                        ratio < 7.5 -> 5.0 * pow10
                        else -> 10.0 * pow10
                    }
                    
                    val gridPx = (unitsPerGrid * scale).toFloat()

                    val textPaint = Paint().apply {
                        color = labelColor
                        textSize = 28f
                        textAlign = Paint.Align.CENTER
                        isAntiAlias = true
                        setShadowLayer(5f, 0f, 0f, canvasBackgroundColor.toArgb())
                    }

                    // Draw grid & labels
                    val precision = max(0, -floor(log10(unitsPerGrid)).toInt())
                    val startX = ((-yAxisX) / gridPx).toInt() - 2
                    val endX = ((size.width - yAxisX) / gridPx).toInt() + 2
                    for (i in startX..endX) {
                        val gx = yAxisX + i * gridPx
                        drawLine(color = if (i % 5 == 0) majorGridColor else gridColor, start = Offset(gx, 0f), end = Offset(gx, size.height), strokeWidth = 1f)
                        
                        if (i != 0) {
                            val labelValue = i * unitsPerGrid
                            val label = if (precision == 0) labelValue.toLong().toString() else String.format(Locale.US, "%.${precision}f", labelValue)
                            drawContext.canvas.nativeCanvas.drawText(label, gx, xAxisY + 35f, textPaint)
                        }
                    }

                    val startY = ((-xAxisY) / gridPx).toInt() - 2
                    val endY = ((size.height - xAxisY) / gridPx).toInt() + 2
                    textPaint.textAlign = Paint.Align.RIGHT
                    for (i in startY..endY) {
                        val gy = xAxisY + i * gridPx
                        drawLine(color = if (i % 5 == 0) majorGridColor else gridColor, start = Offset(0f, gy), end = Offset(size.width, gy), strokeWidth = 1f)
                        
                        if (i != 0) {
                            val labelValue = -i * unitsPerGrid
                            val label = if (precision == 0) labelValue.toLong().toString() else String.format(Locale.US, "%.${precision}f", labelValue)
                            drawContext.canvas.nativeCanvas.drawText(label, yAxisX - 10f, gy + 10f, textPaint)
                        }
                    }

                    // Draw Axes
                    drawLine(color = axisColor, start = Offset(0f, xAxisY), end = Offset(size.width, xAxisY), strokeWidth = 3f)
                    drawLine(color = axisColor, start = Offset(yAxisX, 0f), end = Offset(yAxisX, size.height), strokeWidth = 3f)

                    // Draw Function with smooth scaling and panning
                    if (expression != null && functionText.isNotBlank()) {
                        val originX_cached = size.width / 2f + cachedPathOffsetX
                        val originY_cached = size.height / 2f + cachedPathOffsetY
                        val s = if (cachedScale != 0f) scale / cachedScale else 1f
                        
                        withTransform({
                            translate(yAxisX, xAxisY)
                            scale(s, s, pivot = Offset.Zero)
                            translate(-originX_cached, -originY_cached)
                        }) {
                            val strokeWidth = (7f / s).coerceIn(1f, 20f)
                            drawPath(path = path, color = functionColor.copy(alpha = 0.3f), style = Stroke(width = strokeWidth * 2f))
                            drawPath(path = path, color = functionColor, style = Stroke(width = strokeWidth))
                        }
                    }
                    
                    // Draw selected point
                    selectedPoint?.let { (x, y) ->
                        val px = yAxisX + (x * scale).toFloat()
                        val py = xAxisY - (y * scale).toFloat()
                        
                        if (px in -50f..(size.width + 50f) && py in -50f..(size.height + 50f)) {
                            drawLine(
                                color = Color.Gray.copy(alpha = 0.5f),
                                start = Offset(px, py),
                                end = Offset(px, xAxisY),
                                strokeWidth = 2f,
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
                            )
                            drawLine(
                                color = Color.Gray.copy(alpha = 0.5f),
                                start = Offset(px, py),
                                end = Offset(yAxisX, py),
                                strokeWidth = 2f,
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
                            )
                            
                            drawCircle(color = Color(0xFFFFA500), radius = 12f, center = Offset(px, py))
                            drawCircle(color = Color.White, radius = 6f, center = Offset(px, py))
                        }
                    }
                }
            }
            
            Column(modifier = Modifier.align(Alignment.TopStart).padding(12.dp)) {
                selectedPoint?.let { (x, y) ->
                    Box(modifier = Modifier
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.8f), RoundedCornerShape(8.dp))
                        .padding(8.dp)
                    ) {
                        Column {
                            Text("X: ${java.lang.String.format(Locale.US, "%.2f", x)}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("Y: ${java.lang.String.format(Locale.US, "%.2f", y)}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Column(modifier = Modifier.align(Alignment.TopEnd).padding(4.dp)) {
                IconButton(onClick = { isFullscreen = !isFullscreen }) {
                    Icon(if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                }
                IconButton(onClick = { isSnapToGrid = !isSnapToGrid }) {
                    Icon(if (isSnapToGrid) Icons.Default.GridOn else Icons.Default.GridOff, contentDescription = null, tint = if (isSnapToGrid) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                }
                IconButton(onClick = { 
                    offsetX = 0f
                    offsetY = 0f
                    scale = 100f
                }) {
                    Icon(Icons.Default.CenterFocusWeak, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                }
            }
        }

        if (!isFullscreen) {
            Spacer(Modifier.height(8.dp))
            val buttons = listOf(
                listOf("sin", "cos", "tan", "log", "()"),
                listOf("7", "8", "9", "/", "AC"),
                listOf("4", "5", "6", "*", "⌫"),
                listOf("1", "2", "3", "-", "+"),
                listOf("0", ".", "x", "^", "√")
            )
            Column {
                buttons.forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        row.forEach { label ->
                            CalculatorButton(
                                label = label,
                                onClick = { onFunctionButtonClick(label) },
                                modifier = Modifier.weight(1f),
                                isScientific = true
                            )
                        }
                    }
                }
            }
        }
    }
}


@Composable
fun CalculatorButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isScientific: Boolean = false
) {
    val color = when (label) {
        "AC", "()", "%" -> MaterialTheme.colorScheme.secondaryContainer
        "÷", "×", "-", "+", "=", "/", "*" -> MaterialTheme.colorScheme.primaryContainer
        "sin", "cos", "tan", "log", "ln", "√", "^", "π", "e" -> MaterialTheme.colorScheme.tertiaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant
    }

    val contentColor = when (label) {
        "AC", "()", "%" -> MaterialTheme.colorScheme.onSecondaryContainer
        "÷", "×", "-", "+", "=", "/", "*" -> MaterialTheme.colorScheme.onPrimaryContainer
        "sin", "cos", "tan", "log", "ln", "√", "^", "π", "e" -> MaterialTheme.colorScheme.onTertiaryContainer
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Button(
        modifier = modifier
            .size(if (isScientific) 64.dp else 80.dp),
        shape = CircleShape,
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = contentColor),
        onClick = onClick,
        contentPadding = if (isScientific) PaddingValues(0.dp) else ButtonDefaults.ContentPadding
    ) {
        if (label == "⌫") {
            Icon(Icons.AutoMirrored.Filled.Backspace, contentDescription = "Backspace", tint = contentColor)
        } else {
            Text(
                text = label,
                fontSize = if (isScientific) 14.sp else if (label.length > 1) 20.sp else 32.sp,
                maxLines = 1,
                softWrap = false,
                color = contentColor
            )
        }
    }
}
