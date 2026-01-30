package com.example.school_v3.ui.planner

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.EventNote
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.school_v3.receivers.ReminderReceiver
import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

@Serializable
data class Reminder(
    val id: Int, 
    val date: String, 
    val time: String, 
    val text: String, 
    val reminderTimeMinutes: Int,
    val isCompleted: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlannerScreen(viewModel: PlannerViewModel = viewModel()) {
    var yearMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var showDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current
    
    val reminders by viewModel.reminders.collectAsState()
    val remindersForSelectedDate by remember(reminders, selectedDate) { 
        derivedStateOf { reminders.filter { LocalDate.parse(it.date) == selectedDate } } 
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Планировщик", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showDialog = true },
                containerColor = Color(0xFFA182FF),
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Добавить задачу")
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            CalendarView(
                yearMonth = yearMonth,
                selectedDate = selectedDate,
                onMonthChange = { yearMonth = it },
                onDateSelected = { selectedDate = it }
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                Text(
                    text = "Задачи на ${selectedDate.format(DateTimeFormatter.ofPattern("dd MMMM", Locale.forLanguageTag("ru")))}",
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(vertical = 8.dp)
                )

                Card(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    if (remindersForSelectedDate.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.AutoMirrored.Filled.EventNote, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f), modifier = Modifier.size(48.dp))
                            Text("Задач нет", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f), fontSize = 14.sp)
                        }
                    } else {
                        LazyColumn(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                            items(remindersForSelectedDate, key = { it.id }) { reminder ->
                                ReminderItem(
                                    reminder = reminder,
                                    onDelete = { 
                                        viewModel.removeReminder(it)
                                        cancelReminder(context, it.id)
                                    },
                                    onToggleComplete = {
                                        viewModel.toggleReminderCompletion(it)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        AddReminderDialog(
            selectedDate = selectedDate,
            onDismiss = { showDialog = false },
            onConfirm = { time, reminderText, minutes ->
                val newReminder = Reminder(0, selectedDate.toString(), time.toString(), reminderText, minutes)
                viewModel.addReminder(newReminder) { scheduledReminder ->
                    scheduleReminder(context, scheduledReminder)
                }
                showDialog = false
            }
        )
    }
}

@Composable
fun CalendarView(yearMonth: YearMonth, selectedDate: LocalDate, onMonthChange: (YearMonth) -> Unit, onDateSelected: (LocalDate) -> Unit) {
    val daysInMonth = yearMonth.lengthOfMonth()
    val firstDayOfMonth = yearMonth.atDay(1)
    val daysFromPrevMonth = (firstDayOfMonth.dayOfWeek.value - 1) % 7
    val days = (1..daysInMonth).map { yearMonth.atDay(it) }
    val today = LocalDate.now()

    Card(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { onMonthChange(yearMonth.minusMonths(1)) }) {
                    Icon(Icons.Default.ChevronLeft, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(
                    text = "${yearMonth.month.getDisplayName(TextStyle.FULL, Locale.forLanguageTag("ru")).replaceFirstChar { it.uppercase() }} ${yearMonth.year}", 
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 18.sp
                )
                IconButton(onClick = { onMonthChange(yearMonth.plusMonths(1)) }) {
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                listOf("ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС").forEach { day ->
                    Text(
                        text = day,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            LazyVerticalGrid(columns = GridCells.Fixed(7), modifier = Modifier.height(220.dp)) {
                items(daysFromPrevMonth) { Box(Modifier) }
                items(days) { day ->
                    val isSelected = day == selectedDate
                    val isPast = day.isBefore(today)
                    val isToday = day == today
                    
                    Box(
                        modifier = Modifier
                            .aspectRatio(1f)
                            .padding(2.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) Color(0xFFA182FF) else Color.Transparent)
                            .clickable { onDateSelected(day) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = day.dayOfMonth.toString(),
                            color = when {
                                isSelected -> Color.White
                                isPast -> Color.Gray.copy(alpha = 0.5f)
                                isToday -> Color(0xFFA182FF)
                                else -> MaterialTheme.colorScheme.onSurface
                            },
                            fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ReminderItem(reminder: Reminder, onDelete: (Reminder) -> Unit, onToggleComplete: (Reminder) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (reminder.isCompleted) 
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f) 
            else 
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Schedule, 
                    contentDescription = null, 
                    modifier = Modifier.size(16.dp), 
                    tint = if (reminder.isCompleted) Color.Gray else Color(0xFFA182FF)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = reminder.time, 
                    color = if (reminder.isCompleted) Color.Gray else MaterialTheme.colorScheme.onSurface, 
                    fontWeight = FontWeight.Bold, 
                    fontSize = 14.sp,
                    textDecoration = if (reminder.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                )
                if (reminder.reminderTimeMinutes > 0) {
                    Text(
                        " (напомнить за ${reminder.reminderTimeMinutes} мин)",
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = if (reminder.isCompleted) 0.5f else 1f),
                        fontSize = 12.sp
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                
                IconButton(onClick = { onToggleComplete(reminder) }, modifier = Modifier.size(24.dp)) {
                    Icon(
                        imageVector = Icons.Default.Check, 
                        contentDescription = "Завершить",
                        tint = if (reminder.isCompleted) Color(0xFF4CAF50) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(18.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(8.dp))
                
                IconButton(onClick = { onDelete(reminder) }, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = reminder.text, 
                color = if (reminder.isCompleted) Color.Gray else MaterialTheme.colorScheme.onSurface, 
                fontSize = 14.sp,
                textDecoration = if (reminder.isCompleted) TextDecoration.LineThrough else TextDecoration.None
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddReminderDialog(selectedDate: LocalDate, onDismiss: () -> Unit, onConfirm: (LocalTime, String, Int) -> Unit) {
    val timeState = rememberTimePickerState(is24Hour = true)
    var text by remember { mutableStateOf("") }
    var reminderMinutes by remember { mutableStateOf("") }
    val now = LocalDateTime.now()

    val isTimeInPast = remember(timeState.hour, timeState.minute, selectedDate) {
        val selectedDateTime = LocalDateTime.of(selectedDate, LocalTime.of(timeState.hour, timeState.minute))
        selectedDateTime.isBefore(now)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        title = { Text("Новая задача", color = MaterialTheme.colorScheme.onSurface) },
        text = {
            LazyColumn(horizontalAlignment = Alignment.CenterHorizontally) {
                item {
                    TimePicker(state = timeState)
                }
                if (isTimeInPast) {
                    item {
                        Text(
                            "Выбрано прошедшее время", 
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
                item {
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = text, 
                        onValueChange = { text = it }, 
                        label = { Text("Что нужно сделать?") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFA182FF),
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
                item {
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = reminderMinutes, 
                        onValueChange = { if (it.all { char -> char.isDigit() }) reminderMinutes = it }, 
                        label = { Text("Напомнить за (мин):") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFA182FF),
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { 
                    val minutes = reminderMinutes.toIntOrNull() ?: 0
                    onConfirm(LocalTime.of(timeState.hour, timeState.minute), text, minutes) 
                },
                enabled = !isTimeInPast && text.isNotBlank(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFA182FF),
                    disabledContainerColor = Color.Gray.copy(alpha = 0.5f)
                )
            ) { Text("Добавить", color = Color.White) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Отмена", color = MaterialTheme.colorScheme.onSurface) }
        }
    )
}

fun scheduleReminder(context: Context, reminder: Reminder) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = Intent(context, ReminderReceiver::class.java).apply {
        putExtra("reminder_text", reminder.text)
        putExtra("reminder_id", reminder.id)
    }

    val dateTime = LocalDateTime.of(LocalDate.parse(reminder.date), LocalTime.parse(reminder.time))
    val triggerTime = dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

    if (triggerTime < System.currentTimeMillis()) return

    val mainPendingIntent = PendingIntent.getBroadcast(
        context, reminder.id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    
    val canScheduleExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        alarmManager.canScheduleExactAlarms()
    } else {
        true
    }

    if (canScheduleExact) {
        try {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, mainPendingIntent)
        } catch (e: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, mainPendingIntent)
        }
    } else {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, mainPendingIntent)
    }

    if (reminder.reminderTimeMinutes > 0) {
        val earlyTriggerTime = dateTime.minusMinutes(reminder.reminderTimeMinutes.toLong())
            .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        
        if (earlyTriggerTime > System.currentTimeMillis()) {
            val earlyIntent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra("reminder_text", "Напоминание: ${reminder.text} (через ${reminder.reminderTimeMinutes} мин)")
                putExtra("reminder_id", reminder.id + 100000)
            }
            val earlyPendingIntent = PendingIntent.getBroadcast(
                context, reminder.id + 100000, earlyIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            if (canScheduleExact) {
                try {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, earlyTriggerTime, earlyPendingIntent)
                } catch (e: SecurityException) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, earlyTriggerTime, earlyPendingIntent)
                }
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, earlyTriggerTime, earlyPendingIntent)
            }
        }
    }
}

fun cancelReminder(context: Context, reminderId: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = Intent(context, ReminderReceiver::class.java)
    
    val pendingIntent = PendingIntent.getBroadcast(
        context, reminderId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    alarmManager.cancel(pendingIntent)
    
    val earlyPendingIntent = PendingIntent.getBroadcast(
        context, reminderId + 100000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    alarmManager.cancel(earlyPendingIntent)
}
