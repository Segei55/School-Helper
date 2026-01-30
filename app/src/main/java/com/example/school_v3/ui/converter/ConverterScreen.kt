package com.example.school_v3.ui.converter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.school_v3.ui.theme.AccentBlue

// --- Data Structures ---
data class Conversion(val fromUnit: String, val toUnit: String, val convert: (Double) -> Double)
sealed class ConversionListItem {
    data class Header(val name: String, val key: String) : ConversionListItem()
    data class ConversionItem(val conversion: Conversion, val parentKey: String) : ConversionListItem()
}

data class ConversionCategory(val name: String, val conversions: List<Conversion>)

val subjects = listOf(
    "Математика", "Физика", "Химия", "Информатика"
)

val conversionData = mapOf(
    "Математика" to listOf(
        ConversionCategory(
            name = "Длина",
            conversions = listOf(
                Conversion("Метры", "Сантиметры") { it * 100 },
                Conversion("Сантиметры", "Метры") { it / 100 },
                Conversion("Километры", "Метры") { it * 1000 },
                Conversion("Метры", "Километры") { it / 1000 },
                Conversion("Дюймы", "Сантиметры") { it * 2.54 },
                Conversion("Сантиметры", "Дюймы") { it / 2.54 },
                Conversion("Футы", "Метры") { it * 0.3048 },
                Conversion("Метры", "Футы") { it / 0.3048 }
            )
        ),
        ConversionCategory(
            name = "Площадь",
            conversions = listOf(
                Conversion("Кв. метры", "Кв. сантиметры") { it * 10000 },
                Conversion("Кв. сантиметры", "Кв. метры") { it / 10000 },
                Conversion("Гектары", "Кв. метры") { it * 10000 },
                Conversion("Кв. метры", "Гектары") { it / 10000 },
                Conversion("Акры", "Кв. метры") { it * 4046.86 },
                Conversion("Кв. метры", "Акры") { it / 4046.86 }
            )
        ),
        ConversionCategory(
            name = "Объем",
            conversions = listOf(
                Conversion("Литры", "Миллилитры") { it * 1000 },
                Conversion("Миллилитры", "Литры") { it / 1000 },
                Conversion("Куб. метры", "Литры") { it * 1000 },
                Conversion("Литры", "Куб. метры") { it / 1000 }
            )
        )
    ),
    "Физика" to listOf(
        ConversionCategory(
            name = "Масса",
            conversions = listOf(
                Conversion("Граммы", "Килограммы") { it / 1000 },
                Conversion("Килограммы", "Граммы") { it * 1000 },
                Conversion("Тонны", "Килограммы") { it * 1000 },
                Conversion("Килограммы", "Тонны") { it / 1000 }
            )
        ),
        ConversionCategory(
            name = "Температура",
            conversions = listOf(
                Conversion("Цельсий", "Фаренгейт") { it * 9 / 5 + 32 },
                Conversion("Фаренгейт", "Цельсий") { (it - 32) * 5 / 9.0 },
                Conversion("Цельсий", "Кельвин") { it + 273.15 },
                Conversion("Кельвин", "Цельсий") { it - 273.15 }
            )
        ),
        ConversionCategory(
            name = "Скорость",
            conversions = listOf(
                Conversion("м/с", "км/ч") { it * 3.6 },
                Conversion("км/ч", "м/с") { it / 3.6 }
            )
        ),
        ConversionCategory(
            name = "Энергия",
            conversions = listOf(
                Conversion("Джоули", "Калории") { it * 0.239006 },
                Conversion("Калории", "Джоули") { it / 0.239006 }
            )
        ),
        ConversionCategory(
            name = "Мощность",
            conversions = listOf(
                Conversion("Ватты", "л.с.") { it / 735.5 },
                Conversion("л.с.", "Ватты") { it * 735.5 }
            )
        )
    ),
    "Химия" to listOf(
        ConversionCategory(
            name = "Количество вещества",
            conversions = listOf(
                Conversion("Моль", "ммоль") { it * 1000 },
                Conversion("ммоль", "Моль") { it / 1000 }
            )
        ),
        ConversionCategory(
            name = "Давление",
            conversions = listOf(
                Conversion("Паскаль", "Атмосфера") { it / 101325 },
                Conversion("Атмосфера", "Паскаль") { it * 101325 },
                Conversion("Паскаль", "Бар") { it / 100000 },
                Conversion("Бар", "Паскаль") { it * 100000 }
            )
        )
    ),
    "Информатика" to listOf(
        ConversionCategory(
            name = "Хранение данных",
            conversions = listOf(
                Conversion("Байты", "Килобайты") { it / 1024 },
                Conversion("Килобайты", "Мегабайты") { it / 1024 },
                Conversion("Мегабайты", "Гигабайты") { it / 1024 },
                Conversion("Гигабайты", "Терабайты") { it / 1024 }
            )
        ),
        ConversionCategory(
            name = "Скорость передачи данных",
            conversions = listOf(
                Conversion("Мбит/с", "МБ/с") { it / 8 },
                Conversion("МБ/с", "Мбит/с") { it * 8 }
            )
        )
    )
)


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConverterScreen() {
    var isDropdownExpanded by remember { mutableStateOf(false) }
    var selectedSubject by remember { mutableStateOf(subjects[0]) }
    var searchQuery by remember { mutableStateOf("") }

    val listItems = remember(selectedSubject, searchQuery) {
        val isSearching = searchQuery.isNotBlank()
        
        // Если поиск пустой - берем только текущий предмет, иначе - все предметы
        val subjectsToProcess = if (isSearching) conversionData else mapOf(selectedSubject to (conversionData[selectedSubject] ?: emptyList()))

        subjectsToProcess.flatMap { (subjectName, categories) ->
            categories.mapNotNull { category ->
                val filteredConversions = category.conversions.filter {
                    it.fromUnit.contains(searchQuery, ignoreCase = true) ||
                    it.toUnit.contains(searchQuery, ignoreCase = true) ||
                    category.name.contains(searchQuery, ignoreCase = true) ||
                    subjectName.contains(searchQuery, ignoreCase = true)
                }
                if (filteredConversions.isNotEmpty()) {
                    // Если ищем везде, добавляем название предмета в заголовок
                    val headerName = if (isSearching) "$subjectName: ${category.name}" else category.name
                    val headerKey = "header-$subjectName-${category.name}"
                    
                    val items = listOf(ConversionListItem.Header(headerName, headerKey)) + 
                                filteredConversions.map { ConversionListItem.ConversionItem(it, headerKey) }
                    items
                } else {
                    null
                }
            }.flatten()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Конвертер") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Поиск
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Найти конвертер", fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AccentBlue,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            ExposedDropdownMenuBox(expanded = isDropdownExpanded, onExpandedChange = { if (searchQuery.isEmpty()) isDropdownExpanded = !isDropdownExpanded }) {
                OutlinedTextField(
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    readOnly = true,
                    value = if (searchQuery.isNotEmpty()) "Поиск по всем предметам" else selectedSubject,
                    onValueChange = {},
                    label = { Text("Предмет") },
                    trailingIcon = { if (searchQuery.isEmpty()) ExposedDropdownMenuDefaults.TrailingIcon(expanded = isDropdownExpanded) },
                    shape = RoundedCornerShape(12.dp),
                    enabled = searchQuery.isEmpty(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentBlue,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        disabledBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                        disabledTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        disabledContainerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)
                    )
                )
                if (searchQuery.isEmpty()) {
                    ExposedDropdownMenu(
                        expanded = isDropdownExpanded,
                        onDismissRequest = { isDropdownExpanded = false },
                        modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                    ) {
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
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (listItems.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "Ничего не найдено", 
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(
                        items = listItems,
                        key = { item ->
                            when (item) {
                                is ConversionListItem.Header -> item.key
                                is ConversionListItem.ConversionItem -> "${item.parentKey}-${item.conversion.fromUnit}-${item.conversion.toUnit}"
                            }
                        }
                    ) { item ->
                        when (item) {
                            is ConversionListItem.Header -> {
                                Text(
                                    item.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            is ConversionListItem.ConversionItem -> {
                                ConversionCard(conversion = item.conversion)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ConversionCard(conversion: Conversion) {
    var inputValue by remember { mutableStateOf("") }
    var resultValue by remember { mutableStateOf("") }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "${conversion.fromUnit} -> ${conversion.toUnit}", 
                style = MaterialTheme.typography.labelLarge, 
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = inputValue,
                    onValueChange = { inputValue = it },
                    placeholder = { Text("0.0", fontSize = 14.sp) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentBlue,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        focusedContainerColor = MaterialTheme.colorScheme.background,
                        unfocusedContainerColor = MaterialTheme.colorScheme.background
                    )
                )
                
                Button(
                    onClick = {
                        val value = inputValue.toDoubleOrNull()
                        if (value != null) {
                            resultValue = String.format("%.4f", conversion.convert(value))
                        } else {
                            resultValue = "?"
                        }
                    },
                    modifier = Modifier.height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentBlue)
                ) {
                    Text("=", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
            
            if (resultValue.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "Результат: $resultValue",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
