package com.example.school_v3.ui.timer

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.school_v3.ui.theme.AccentBlue
import com.example.school_v3.ui.theme.AccentRed
import kotlin.math.abs

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimerScreen(viewModel: TimerViewModel = viewModel()) {
    val totalTime = viewModel.totalTime
    val timeLeft = viewModel.timeLeft
    val isRunning = viewModel.isRunning
    val isFinished = viewModel.isFinished
    val overTime = viewModel.overTime

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Таймер", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(
                modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(48.dp))
                
                if (!isRunning && !isFinished && totalTime == 0L) {
                    TimePicker(onTimeSelected = { h, m, s ->
                        if (h != -1) viewModel.selectedHours = h
                        if (m != -1) viewModel.selectedMinutes = m
                        if (s != -1) viewModel.selectedSeconds = s
                    })
                } else {
                    TimerDisplay(timeLeft, totalTime)
                }

                Spacer(modifier = Modifier.height(64.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { viewModel.resetTimer() },
                        modifier = Modifier.size(56.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                    }

                    Button(
                        onClick = {
                            if (isRunning) viewModel.pauseTimer()
                            else viewModel.startTimer()
                        },
                        modifier = Modifier.size(80.dp),
                        shape = CircleShape,
                        colors = ButtonDefaults.buttonColors(containerColor = if (isRunning) AccentRed else AccentBlue)
                    ) {
                        Icon(if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(32.dp))
                    }

                    Spacer(modifier = Modifier.width(56.dp))
                }
            }

            if (isFinished) {
                FinishedScreen(overTime) {
                    viewModel.resetTimer()
                }
            }
        }
    }
}

@Composable
fun TimePicker(onTimeSelected: (Int, Int, Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            NumberPicker(range = 0..23, onValueChange = { onTimeSelected(it, -1, -1) })
            Text("ЧАСЫ", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
        }
        Text(":", fontSize = 32.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 8.dp).padding(bottom = 20.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            NumberPicker(range = 0..59, onValueChange = { onTimeSelected(-1, it, -1) })
            Text("МИНУТЫ", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
        }
        Text(":", fontSize = 32.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 8.dp).padding(bottom = 20.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            NumberPicker(range = 0..59, onValueChange = { onTimeSelected(-1, -1, it) })
            Text("СЕКУНДЫ", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NumberPicker(range: IntRange, onValueChange: (Int) -> Unit) {
    val items = remember { range.toList() }
    val listSize = items.size
    val infiniteCount = 10000
    val initialIndex = infiniteCount / 2 - (infiniteCount / 2 % listSize)
    
    val itemHeight = 50.dp
    val lazyListState = rememberLazyListState(initialFirstVisibleItemIndex = initialIndex)
    val snapBehavior = rememberSnapFlingBehavior(lazyListState = lazyListState)

    val centralItemIndex by remember {
        derivedStateOf {
            val layoutInfo = lazyListState.layoutInfo
            val visibleItems = layoutInfo.visibleItemsInfo
            if (visibleItems.isEmpty()) return@derivedStateOf -1
            val viewportCenter = (layoutInfo.viewportStartOffset + layoutInfo.viewportEndOffset) / 2
            visibleItems.minByOrNull { abs((it.offset + it.size / 2) - viewportCenter) }?.index ?: -1
        }
    }

    LaunchedEffect(centralItemIndex) {
        if (centralItemIndex != -1) {
            onValueChange(items[centralItemIndex % listSize])
        }
    }

    Box(modifier = Modifier.height(180.dp).width(70.dp), contentAlignment = Alignment.Center) {
        // Фоновая плашка выбора
        Box(modifier = Modifier.fillMaxWidth().height(itemHeight).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant))
        
        LazyColumn(
            state = lazyListState,
            flingBehavior = snapBehavior,
            contentPadding = PaddingValues(vertical = (180.dp - itemHeight) / 2),
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxSize()
        ) {
            items(infiniteCount) { index ->
                val actualIndex = index % listSize
                val isCenter = centralItemIndex == index
                
                Box(
                    modifier = Modifier.height(itemHeight).fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "%02d".format(items[actualIndex]),
                        fontSize = if (isCenter) 32.sp else 24.sp,
                        color = if (isCenter) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        fontWeight = if (isCenter) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }
    }
}

@Composable
fun TimerDisplay(timeLeft: Long, totalTime: Long) {
    val trackColor = MaterialTheme.colorScheme.surfaceVariant
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(280.dp)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 12.dp.toPx()
            val progress = if (totalTime > 0) (timeLeft.toFloat() / totalTime.toFloat()) else 0f
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = strokeWidth)
            )
            drawArc(
                color = AccentBlue,
                startAngle = -90f,
                sweepAngle = 360 * progress,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = formatTime(timeLeft), fontSize = 56.sp, fontWeight = FontWeight.Light, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
fun FinishedScreen(overTime: Long, onStop: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.85f)).clickable(enabled = false) {},
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("ВРЕМЯ ВЫШЛО", color = AccentRed, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(16.dp))
            Text(text = "-" + formatTime(overTime), fontSize = 64.sp, color = Color.White, fontWeight = FontWeight.Light)
            Spacer(modifier = Modifier.height(48.dp))
            Button(
                onClick = onStop, 
                modifier = Modifier.height(56.dp).width(200.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentRed)
            ) {
                Text("СТОП", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
            }
        }
    }
}

fun formatTime(time: Long): String {
    val h = (time / 1000) / 3600
    val m = ((time / 1000) % 3600) / 60
    val s = (time / 1000) % 60
    return "%02d:%02d:%02d".format(h, m, s)
}
