package com.example.school_v3.ui.grades

import android.app.Application
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.school_v3.ui.login.LoginViewModel
import com.example.school_v3.ui.settings.PremiumBanner
import com.example.school_v3.ui.theme.AccentBlue
import com.example.school_v3.ui.theme.AccentGreen
import com.example.school_v3.ui.theme.AccentPurple
import com.example.school_v3.ui.theme.AccentRed
import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

@Serializable
data class Grade(val value: Int, val subject: String, val timestamp: Long = System.currentTimeMillis())

val subjects = listOf(
    "Алгебра", "Биология", "Теория Вероятности И Статистика", "География", "Геометрия",
    "Английский язык", "Информатика", "История", "Литература", "ОБиЗР",
    "Обществознание", "Русский язык", "Физика", "Физкультура", "Химия"
)
const val OVERALL_AVERAGE = "Общий обзор"

class GradesViewModelFactory(private val application: Application, private val loginViewModel: LoginViewModel) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(GradesViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return GradesViewModel(application, loginViewModel) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradesScreen(navController: NavController, loginViewModel: LoginViewModel) {
    val context = LocalContext.current
    val gradesViewModel: GradesViewModel = viewModel(factory = GradesViewModelFactory(context.applicationContext as Application, loginViewModel))
    val gradeList by gradesViewModel.grades.collectAsState()
    val isLoading by gradesViewModel.isLoading.collectAsState()
    val isPremium by gradesViewModel.isPremium.collectAsState()
    val errorMessage by gradesViewModel.errorMessage.collectAsState()

    var isDropdownExpanded by remember { mutableStateOf(false) }
    var selectedSubject by remember { mutableStateOf(OVERALL_AVERAGE) }
    var showClearDialog by remember { mutableStateOf(false) }
    var showPremiumBanner by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            gradesViewModel.clearError()
        }
    }

    val filteredGrades by remember(selectedSubject, gradeList) {
        derivedStateOf {
            if (selectedSubject == OVERALL_AVERAGE) gradeList else gradeList.filter { it.subject == selectedSubject }
        }
    }

    val average by remember(filteredGrades) {
        derivedStateOf {
            if (filteredGrades.isNotEmpty()) filteredGrades.map { it.value }.average() else 0.0
        }
    }

    if (showClearDialog) {
        ConfirmationDialog(
            title = if (selectedSubject == OVERALL_AVERAGE) "Удалить все оценки?" else "Удалить оценки для предмета \"${selectedSubject}\"?",
            text = "Это действие нельзя будет отменить.",
            onConfirm = {
                gradesViewModel.clearGrades(if (selectedSubject == OVERALL_AVERAGE) null else selectedSubject)
                showClearDialog = false
            },
            onDismiss = { showClearDialog = false }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Оценки", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        bottomBar = {
            GradesBottomBar(
                isLoading = isLoading,
                isPremium = isPremium,
                onClear = { showClearDialog = true },
                onExport = { gradesViewModel.exportGrades() },
                onImport = { gradesViewModel.importGrades() },
                showPremiumBanner = { showPremiumBanner = true }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                item {
                    Text(
                        text = "ВЫБЕРИТЕ ПРЕДМЕТ",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth().padding(start = 4.dp, bottom = 4.dp)
                    )
                    ExposedDropdownMenuBox(
                        expanded = isDropdownExpanded,
                        onExpandedChange = { isDropdownExpanded = !isDropdownExpanded }
                    ) {
                        OutlinedTextField(
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth(),
                            readOnly = true,
                            value = selectedSubject,
                            onValueChange = {},
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isDropdownExpanded) },
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AccentBlue,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surface
                            )
                        )
                        ExposedDropdownMenu(
                            expanded = isDropdownExpanded,
                            onDismissRequest = { isDropdownExpanded = false },
                            modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                        ) {
                            DropdownMenuItem(
                                text = { Text(OVERALL_AVERAGE, color = MaterialTheme.colorScheme.onSurface) },
                                onClick = {
                                    selectedSubject = OVERALL_AVERAGE
                                    isDropdownExpanded = false
                                }
                            )
                            subjects.forEach { subject ->
                                DropdownMenuItem(
                                    text = { Text(subject, color = MaterialTheme.colorScheme.onSurface) },
                                    onClick = {
                                        selectedSubject = subject
                                        isDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                }

                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = if (selectedSubject == OVERALL_AVERAGE) "СРЕДНИЙ БАЛЛ ПО ВСЕМ ПРЕДМЕТАМ" else "СРЕДНИЙ БАЛЛ ($selectedSubject)",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = String.format("%.2f", average),
                                    style = MaterialTheme.typography.displaySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = AccentBlue
                                )
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.TrendingUp, contentDescription = null, tint = AccentBlue)
                                }
                            }
                        }
                    }
                }

                if (selectedSubject == OVERALL_AVERAGE && gradeList.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(20.dp))
                        if (isPremium) {
                            GradesChart(gradeList = gradeList)
                        } else {
                            GradesPremiumBanner(onUnlockClick = { showPremiumBanner = true })
                        }
                    }
                }

                if (selectedSubject != OVERALL_AVERAGE) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            val grades = listOf(2, 3, 4, 5)
                            val colors = listOf(AccentRed, AccentPurple, AccentGreen, AccentBlue)
                            grades.forEachIndexed { index, grade ->
                                Button(
                                    onClick = { gradesViewModel.addGrade(Grade(value = grade, subject = selectedSubject)) },
                                    modifier = Modifier.weight(1f).height(50.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = colors[index])
                                ) {
                                    Text(grade.toString(), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        text = "ИСТОРИЯ ОЦЕНОК (${if (selectedSubject == OVERALL_AVERAGE) "ВСЕ" else selectedSubject.uppercase()})",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth().padding(start = 4.dp, bottom = 8.dp)
                    )
                }

                items(filteredGrades.reversed()) { grade ->
                    GradeHistoryItem(grade = grade, onDelete = { gradesViewModel.removeGrade(it) })
                }
                
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }

            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.primary)
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
}

@Composable
fun GradesBottomBar(
    isLoading: Boolean,
    isPremium: Boolean,
    onClear: () -> Unit,
    onExport: () -> Unit,
    onImport: () -> Unit,
    showPremiumBanner: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Button(
            onClick = onClear,
            modifier = Modifier.weight(1.3f).height(48.dp),
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 8.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Icon(Icons.Default.SettingsBackupRestore, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.tertiary)
            Spacer(modifier = Modifier.width(4.dp))
            Text("Очистить", color = MaterialTheme.colorScheme.tertiary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Visible)
        }
        Button(
            onClick = { if (isPremium) onExport() else showPremiumBanner() },
            enabled = !isLoading,
            modifier = Modifier.weight(1f).height(48.dp),
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 4.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.width(4.dp))
            Text("Эксп.", color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, maxLines = 1)
        }
        Button(
            onClick = { if (isPremium) onImport() else showPremiumBanner() },
            enabled = !isLoading,
            modifier = Modifier.weight(1f).height(48.dp),
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 4.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.width(4.dp))
            Text("Имп.", color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, maxLines = 1)
        }
    }
}

@Composable
fun GradesPremiumBanner(onUnlockClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.surface,
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    )
                )
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawCircle(
                    color = AccentBlue.copy(alpha = 0.05f),
                    radius = size.minDimension / 1.5f,
                    center = Offset(size.width * 0.9f, size.height * 0.1f)
                )
                drawCircle(
                    color = AccentPurple.copy(alpha = 0.05f),
                    radius = size.minDimension / 2f,
                    center = Offset(size.width * 0.1f, size.height * 0.9f)
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Surface(
                    modifier = Modifier.size(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF59E0B).copy(alpha = 0.15f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "График успеваемости",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "Доступно только в Premium",
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = onUnlockClick,
                    modifier = Modifier
                        .width(180.dp)
                        .height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    contentPadding = PaddingValues()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color(0xFF6366F1), Color(0xFFEC4899))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Разблокировать",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun GradesChart(gradeList: List<Grade>) {
    val subjectAverages = remember(gradeList) {
        gradeList.groupBy { it.subject }
            .mapValues { (_, grades) -> grades.map { it.value }.average() }
            .toList()
            .sortedBy { it.first }
    }

    val textMeasurer = rememberTextMeasurer()
    val scrollState = rememberScrollState()
    var selectedIndex by remember { mutableStateOf<Int?>(null) }

    val labelStyle = TextStyle(
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        BoxWithConstraints(modifier = Modifier.padding(16.dp)) {
            val chartMaxWidth = maxWidth
            
            Column(
                modifier = Modifier.fillMaxHeight().padding(bottom = 40.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                listOf("5", "4", "3", "2").forEach { label ->
                    Text(text = label, style = labelStyle)
                }
            }

            Box(
                modifier = Modifier
                    .padding(start = 24.dp)
                    .horizontalScroll(scrollState)
            ) {
                val barWidth = 56.dp
                val spacing = 24.dp
                val startPadding = 20.dp
                
                val contentWidth = startPadding + (barWidth + spacing) * subjectAverages.size
                val canvasWidth = maxOf(chartMaxWidth - 24.dp, contentWidth)

                Canvas(
                    modifier = Modifier
                        .width(canvasWidth)
                        .fillMaxHeight()
                        .pointerInput(subjectAverages) {
                            val barWidthPx = barWidth.toPx()
                            val spacingPx = spacing.toPx()
                            val startPaddingPx = startPadding.toPx()
                            detectTapGestures { offset ->
                                val index = ((offset.x - startPaddingPx) / (barWidthPx + spacingPx)).toInt()
                                if (index in subjectAverages.indices) {
                                    selectedIndex = if (selectedIndex == index) null else index
                                } else {
                                    selectedIndex = null
                                }
                            }
                        }
                ) {
                    val barWidthPx = barWidth.toPx()
                    val spacingPx = spacing.toPx()
                    val startPaddingPx = startPadding.toPx()
                    val chartAreaHeight = size.height - 40.dp.toPx()
                    val gridLines = listOf(5f, 4f, 3f, 2f)
                    
                    gridLines.forEach { value ->
                        val y = chartAreaHeight - ((value - 1f) / 4f) * chartAreaHeight
                        drawLine(
                            color = Color.Gray.copy(alpha = 0.2f),
                            start = Offset(0f, y),
                            end = Offset(size.width, y),
                            strokeWidth = 1.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                        )
                    }

                    // 1. Рисуем столбцы
                    subjectAverages.forEachIndexed { index, (_, avg) ->
                        val left = startPaddingPx + index * (barWidthPx + spacingPx)
                        val top = chartAreaHeight - ((avg.toFloat() - 1f) / 4f) * chartAreaHeight

                        val color = when (avg.roundToInt()) {
                            2 -> AccentRed
                            3 -> AccentPurple
                            4 -> AccentGreen
                            else -> AccentBlue
                        }

                        if (selectedIndex == index) {
                            drawRoundRect(
                                color = color.copy(alpha = 0.15f),
                                topLeft = Offset(left - 4.dp.toPx(), 0f),
                                size = Size(barWidthPx + 8.dp.toPx(), chartAreaHeight + 4.dp.toPx()),
                                cornerRadius = CornerRadius(12.dp.toPx())
                            )
                        }

                        drawRoundRect(
                            color = if (selectedIndex == index) color else color.copy(alpha = 0.8f),
                            topLeft = Offset(left, top),
                            size = Size(barWidthPx, chartAreaHeight - top),
                            cornerRadius = CornerRadius(8.dp.toPx())
                        )
                    }

                    // 2. Рисуем названия (после всех столбцов, чтобы не перекрывались)
                    subjectAverages.forEachIndexed { index, (subject, _) ->
                        val left = startPaddingPx + index * (barWidthPx + spacingPx)
                        val labelPaddingPx = 8.dp.toPx()
                        
                        val measuredText = textMeasurer.measure(
                            text = subject,
                            style = labelStyle,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            constraints = Constraints(maxWidth = (barWidthPx + spacingPx * 0.9f).toInt())
                        )
                        
                        drawText(
                            textLayoutResult = measuredText,
                            topLeft = Offset(
                                left + (barWidthPx - measuredText.size.width) / 2f,
                                chartAreaHeight + labelPaddingPx
                            )
                        )
                    }

                    // 3. Рисуем тултип для выбранного
                    if (selectedIndex != null) {
                        val index = selectedIndex!!
                        val (subject, avg) = subjectAverages[index]
                        val left = startPaddingPx + index * (barWidthPx + spacingPx)
                        val top = chartAreaHeight - ((avg.toFloat() - 1f) / 4f) * chartAreaHeight
                        
                        val tooltipText = "$subject: ${String.format("%.2f", avg)}"
                        val measuredTooltip = textMeasurer.measure(
                            text = tooltipText,
                            style = labelStyle.copy(color = Color.White, fontSize = 11.sp)
                        )
                        
                        val tooltipPaddingPx = 8.dp.toPx()
                        val hPadding = 12.dp.toPx()
                        val vPadding = 6.dp.toPx()
                        
                        val tooltipWidth = measuredTooltip.size.width + hPadding * 2
                        val tooltipHeight = measuredTooltip.size.height + vPadding * 2
                        
                        var tx = left + (barWidthPx - tooltipWidth) / 2f
                        if (tx < 4.dp.toPx()) tx = 4.dp.toPx()
                        if (tx + tooltipWidth > size.width - 4.dp.toPx()) {
                            tx = size.width - tooltipWidth - 4.dp.toPx()
                        }
                        
                        val ty = (top - tooltipHeight - tooltipPaddingPx).coerceAtLeast(4.dp.toPx())

                        drawRoundRect(
                            color = Color.Black.copy(alpha = 0.85f),
                            topLeft = Offset(tx, ty),
                            size = Size(tooltipWidth, tooltipHeight),
                            cornerRadius = CornerRadius(10.dp.toPx())
                        )
                        drawText(
                            textLayoutResult = measuredTooltip,
                            topLeft = Offset(tx + hPadding, ty + vPadding)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun GradeHistoryItem(grade: Grade, onDelete: (Grade) -> Unit) {
    val color = when (grade.value) {
        2 -> AccentRed
        3 -> AccentPurple
        4 -> AccentGreen
        5 -> AccentBlue
        else -> Color.White
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(6.dp)
                    .height(64.dp)
                    .background(color)
            )
            
            Row(
                modifier = Modifier
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(color.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = grade.value.toString(),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = color
                        )
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = grade.subject,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(Date(grade.timestamp)),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                IconButton(onClick = { onDelete(grade) }) {
                    Icon(Icons.Default.Delete, contentDescription = "Удалить", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
fun ConfirmationDialog(title: String, text: String, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = title, color = MaterialTheme.colorScheme.onSurface) },
        text = { Text(text = text, color = MaterialTheme.colorScheme.onSurfaceVariant) },
        containerColor = MaterialTheme.colorScheme.surface,
        confirmButton = {
            TextButton(onClick = onConfirm) { Text("Удалить", color = MaterialTheme.colorScheme.error) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Отмена", color = MaterialTheme.colorScheme.onSurface) }
        }
    )
}
