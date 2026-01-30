package com.example.school_v3.ui.notes

import android.app.Application
import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FormatBold
import androidx.compose.material.icons.filled.FormatItalic
import androidx.compose.material.icons.filled.FormatUnderlined
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.school_v3.data.AuthManager
import com.example.school_v3.ui.login.LoginViewModel
import com.example.school_v3.ui.settings.PremiumBanner
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.Polymorphic
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Serializable
sealed class ContentBlock {
    abstract val id: String
}

@Serializable
data class StyleRange(val start: Int, val end: Int, val isBold: Boolean, val isItalic: Boolean, val isUnderlined: Boolean)

@Serializable
@SerialName("TextBlock")
data class TextBlock(
    val text: String = "",
    val styles: List<StyleRange> = emptyList(),
    override val id: String = UUID.randomUUID().toString()
) : ContentBlock()

@Serializable
data class Note(
    val id: Long,
    var title: String,
    var content: List<@Polymorphic ContentBlock>,
    val timestamp: Long
)

class NoteRepository(private val context: Context) {
    private val file = File(context.filesDir, "notes.json")
    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        serializersModule = SerializersModule {
            polymorphic(ContentBlock::class) {
                subclass(TextBlock::class)
            }
        }
    }

    fun loadNotes(): List<Note> {
        if (!file.exists()) return emptyList()
        val content = file.readText()
        if (content.isBlank()) return emptyList()

        return try {
            json.decodeFromString(ListSerializer(Note.serializer()), content)
        } catch (_: Exception) {
            file.delete()
            emptyList()
        }
    }

    fun saveNotes(notes: List<Note>) {
        file.writeText(json.encodeToString(ListSerializer(Note.serializer()), notes))
    }
}

class NotesViewModelFactory(private val application: Application, private val loginViewModel: LoginViewModel) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(NotesViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return NotesViewModel(application, loginViewModel) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

@Composable
fun NotesApp(loginViewModel: LoginViewModel, rootNavController: NavController) {
    val context = LocalContext.current
    val notesViewModel: NotesViewModel = viewModel(factory = NotesViewModelFactory(context.applicationContext as Application, loginViewModel))
    val notes by notesViewModel.notes.collectAsState()
    val isLoading by notesViewModel.isLoading.collectAsState()

    val notesNavController = rememberNavController()

    NavHost(navController = notesNavController, startDestination = "notes_list") {
        composable("notes_list") {
            Box(modifier = Modifier.fillMaxSize()) {
                NotesListScreen(
                    navController = notesNavController,
                    rootNavController = rootNavController,
                    notesViewModel = notesViewModel,
                    notes = notes,
                    onAddNote = { title ->
                        val newNote = Note(
                            id = (notes.maxOfOrNull { note -> note.id } ?: -1) + 1,
                            title = title,
                            content = listOf(TextBlock("")),
                            timestamp = System.currentTimeMillis()
                        )
                        notesViewModel.addNote(newNote)
                        notesNavController.navigate("note_detail/${newNote.id}")
                    },
                    onDeleteNotes = { idsToDelete ->
                        notesViewModel.deleteNotes(idsToDelete)
                    }
                )
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
            }
        }
        composable("note_detail/{noteId}") { backStackEntry ->
            val noteId = backStackEntry.arguments?.getString("noteId")?.toLongOrNull()
            val note = notes.find { it.id == noteId }
            if (note != null) {
                NoteDetailScreen(navController = notesNavController, note = note, onSave = { updatedNote ->
                    notesViewModel.updateNote(updatedNote)
                })
            } else {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error: Note with ID $noteId not found.")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesListScreen(
    navController: NavController,
    rootNavController: NavController,
    notesViewModel: NotesViewModel,
    notes: List<Note>,
    onAddNote: (String) -> Unit,
    onDeleteNotes: (Set<Long>) -> Unit
) {
    var showCreateDialog by remember { mutableStateOf(false) }
    var inSelectionMode by remember { mutableStateOf(false) }
    var selectedNoteIds by remember { mutableStateOf(emptySet<Long>()) }
    var showDeleteConfirmationDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val authManager = remember { AuthManager.getInstance(context) }
    val isPremium = authManager.isPremium()
    var showPremiumBanner by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            if (inSelectionMode) {
                TopAppBar(
                    title = { Text("${selectedNoteIds.size}") },
                    navigationIcon = {
                        IconButton(onClick = {
                            inSelectionMode = false
                            selectedNoteIds = emptySet()
                        }) {
                            Icon(Icons.Default.Close, "Close selection mode")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showDeleteConfirmationDialog = true }) {
                            Icon(Icons.Default.Delete, "Delete selected notes")
                        }
                    }
                )
            } else {
                TopAppBar(
                    title = { Text("Заметки") },
                    actions = {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Меню")
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(text = { Text("Импорт") }, onClick = {
                                if (isPremium) notesViewModel.importNotes() else showPremiumBanner = true
                                showMenu = false
                            })
                            DropdownMenuItem(text = { Text("Экспорт") }, onClick = {
                                if (isPremium) notesViewModel.exportNotes() else showPremiumBanner = true
                                showMenu = false
                            })
                        }
                    }
                )
            }
        },
        floatingActionButton = {
            if (!inSelectionMode) {
                FloatingActionButton(onClick = { showCreateDialog = true }) { Icon(Icons.Default.Add, "Создать заметку") }
            }
        }
    ) { padding ->
        if (notes.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) { Text("Создайте свою первую заметку!") }
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                val sortedNotes = notes.sortedByDescending { it.timestamp }
                items(items = sortedNotes, key = { it.id }) { note ->
                    val isSelected = selectedNoteIds.contains(note.id)
                    NoteListItem(
                        note = note,
                        isSelected = isSelected,
                        onClick = {
                            if (inSelectionMode) {
                                selectedNoteIds = if (isSelected) {
                                    selectedNoteIds - note.id
                                } else {
                                    selectedNoteIds + note.id
                                }
                                if (selectedNoteIds.isEmpty()) {
                                    inSelectionMode = false
                                }
                            } else {
                                navController.navigate("note_detail/${note.id}")
                            }
                        },
                        onLongClick = {
                            if (!inSelectionMode) {
                                inSelectionMode = true
                                selectedNoteIds += note.id
                            }
                        }
                    )
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateNoteDialog(onDismiss = { showCreateDialog = false }, onCreate = { onAddNote(it); showCreateDialog = false })
    }
    if (showDeleteConfirmationDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmationDialog = false },
            title = { Text("Подтверждение") },
            text = { Text("Вы уверены, что хотите удалить выбранные заметки (${selectedNoteIds.size})?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDeleteNotes(selectedNoteIds)
                        inSelectionMode = false
                        selectedNoteIds = emptySet()
                        showDeleteConfirmationDialog = false
                    }
                ) { Text("Удалить") }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirmationDialog = false }) { Text("Отмена") } }
        )
    }

    if (showPremiumBanner) {
        PremiumBanner(
            onDismiss = { showPremiumBanner = false },
            onGoToSettings = {
                showPremiumBanner = false
                rootNavController.navigate("settings")
            }
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NoteListItem(note: Note, isSelected: Boolean, onClick: () -> Unit, onLongClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .combinedClickable(onClick = onClick, onLongClick = onLongClick),
        colors = if (isSelected) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer) else CardDefaults.cardColors()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = note.title, style = MaterialTheme.typography.titleMedium)
            Text(
                text = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(Date(note.timestamp)),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

enum class TextStyleType { BOLD, ITALIC, UNDERLINE }

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
fun NoteDetailScreen(navController: NavController, note: Note, onSave: (Note) -> Unit) {
    var showRenameDialog by remember { mutableStateOf(false) }
    val contentBlocks = remember { note.content.toMutableList() }
    
    var showTextFormattingToolbar by remember { mutableStateOf(false) }
    val tfvMap = remember { mutableStateMapOf<String, TextFieldValue>() }
    var activeBlockId by remember { mutableStateOf<String?>(null) }
    
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val bringIntoViewRequesters = remember { mutableStateMapOf<String, BringIntoViewRequester>() }
    val textLayoutResults = remember { mutableStateMapOf<String, TextLayoutResult>() }
    val isImeVisible = WindowInsets.isImeVisible

    fun scrollToCursor(blockId: String) {
        val layoutResult = textLayoutResults[blockId]
        val tfv = tfvMap[blockId]
        val requester = bringIntoViewRequesters[blockId]
        if (layoutResult != null && tfv != null && requester != null) {
            scope.launch {
                val cursorRect = layoutResult.getCursorRect(tfv.selection.start)
                // Добавляем отступ сверху и снизу (примерно 400 пикселей), чтобы курсор был в центре внимания
                val margin = 400f 
                requester.bringIntoView(
                    cursorRect.copy(
                        top = (cursorRect.top - margin).coerceAtLeast(0f),
                        bottom = cursorRect.bottom + margin
                    )
                )
            }
        } else {
            scope.launch {
                bringIntoViewRequesters[blockId]?.bringIntoView()
            }
        }
    }

    // Автопрокрутка к курсору при появлении клавиатуры
    LaunchedEffect(isImeVisible) {
        if (isImeVisible && activeBlockId != null) {
            delay(300) 
            scrollToCursor(activeBlockId!!)
        }
    }
    
    fun buildUpdatedBlocks(): List<ContentBlock> {
        return contentBlocks.map {
            if (it is TextBlock) {
                tfvMap[it.id]?.let { tfv ->
                    val annotatedString = tfv.annotatedString
                    val textLength = annotatedString.length

                    val points = mutableSetOf(0, textLength)
                    annotatedString.spanStyles.forEach { span ->
                        if (span.item.fontWeight != null || span.item.fontStyle != null || span.item.textDecoration != null) {
                            if (span.start < textLength) points.add(span.start)
                            if (span.end < textLength) points.add(span.end)
                        }
                    }
                    val sortedPoints = points.sorted().distinct()

                    val resolvedStyles = mutableListOf<StyleRange>()

                    for (j in 0 until sortedPoints.size - 1) {
                        val start = sortedPoints[j]
                        val end = sortedPoints[j + 1]
                        if (start == end) continue

                        val checkIndex = start

                        var isSegmentBold = false
                        var isSegmentItalic = false
                        var isSegmentUnderlined = false
                        
                        for (span in annotatedString.spanStyles) {
                            if (span.start <= checkIndex && span.end > checkIndex) {
                                if (span.item.fontWeight == FontWeight.Bold) isSegmentBold = true
                                else if (span.item.fontWeight == FontWeight.Normal) isSegmentBold = false
                                
                                if (span.item.fontStyle == FontStyle.Italic) isSegmentItalic = true
                                else if (span.item.fontStyle == FontStyle.Normal) isSegmentItalic = false

                                if (span.item.textDecoration == TextDecoration.Underline) isSegmentUnderlined = true
                                else if (span.item.textDecoration == null) isSegmentUnderlined = false
                            }
                        }

                        if (isSegmentBold || isSegmentItalic || isSegmentUnderlined) {
                            resolvedStyles.add(StyleRange(start, end, isSegmentBold, isSegmentItalic, isSegmentUnderlined))
                        }
                    }

                    val newStyles = mutableListOf<StyleRange>()
                    resolvedStyles.forEach { current ->
                        if (newStyles.isEmpty()) {
                            newStyles.add(current)
                        } else {
                            val last = newStyles.last()
                            if (last.end == current.start && 
                                last.isBold == current.isBold && 
                                last.isItalic == current.isItalic &&
                                last.isUnderlined == current.isUnderlined) {
                                newStyles[newStyles.lastIndex] = last.copy(end = current.end)
                            } else {
                                newStyles.add(current)
                            }
                        }
                    }
                    
                    val finalNewStyles = newStyles.filter { it.start < it.end }

                    it.copy(text = tfv.text, styles = finalNewStyles)
                } ?: it
            } else {
                it
            }
        }
    }

    val onBack: () -> Unit = {
        val updatedBlocks = buildUpdatedBlocks()
        val updatedNote = note.copy(
            content = updatedBlocks,
            timestamp = System.currentTimeMillis()
        )
        onSave(updatedNote)
        navController.popBackStack()
    }

    BackHandler(onBack = onBack)

    val onToggleStyle: (String, TextStyleType) -> Unit = { blockId, styleType ->
        tfvMap[blockId]?.let { tfv ->
            val selection = tfv.selection
            if (!selection.collapsed) {
                
                val isAlreadyActive = when (styleType) {
                    TextStyleType.BOLD -> tfv.annotatedString.spanStyles.any { style -> style.item.fontWeight == FontWeight.Bold && selection.intersects(TextRange(style.start, style.end)) }
                    TextStyleType.ITALIC -> tfv.annotatedString.spanStyles.any { style -> style.item.fontStyle == FontStyle.Italic && selection.intersects(TextRange(style.start, style.end)) }
                    TextStyleType.UNDERLINE -> tfv.annotatedString.spanStyles.any { style -> style.item.textDecoration == TextDecoration.Underline && selection.intersects(TextRange(style.start, style.end)) }
                }

                val styleToAdd = when (styleType) {
                    TextStyleType.BOLD -> if (isAlreadyActive) SpanStyle(fontWeight = FontWeight.Normal) else SpanStyle(fontWeight = FontWeight.Bold)
                    TextStyleType.ITALIC -> if (isAlreadyActive) SpanStyle(fontStyle = FontStyle.Normal) else SpanStyle(fontStyle = FontStyle.Italic)
                    TextStyleType.UNDERLINE -> if (isAlreadyActive) SpanStyle(textDecoration = null) else SpanStyle(textDecoration = TextDecoration.Underline)
                }
                
                val newString = buildAnnotatedString {
                    append(tfv.annotatedString)
                    addStyle(styleToAdd, selection.start, selection.end)
                }
                tfvMap[blockId] = tfv.copy(annotatedString = newString)
            }
        }
    }
    
    Scaffold(
        modifier = Modifier.fillMaxSize().imePadding(), 
        topBar = {
            TopAppBar(
                title = { Text(
                    note.title,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { showRenameDialog = true })
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Назад") } }
            )
        },
        bottomBar = {
            BottomAppBar {
                if (showTextFormattingToolbar) {
                    activeBlockId?.let { TextFormattingToolbar(
                        onToggleStyle = { styleType -> onToggleStyle(it, styleType) }, 
                        onClose = { showTextFormattingToolbar = false }
                    ) }
                } else {
                    MainToolbar(
                        onShowFormattingToolbar = { showTextFormattingToolbar = true }
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            itemsIndexed(items = contentBlocks, key = { _, block -> block.id }) { _, block ->
                when (block) {
                    is TextBlock -> {
                        val focusRequester = remember { FocusRequester() }
                        val bringIntoViewRequester = bringIntoViewRequesters.getOrPut(block.id) { BringIntoViewRequester() }
                        
                        val initialTfv = remember(block.id) { 
                            tfvMap.getOrPut(block.id) {
                                val annotatedString = buildAnnotatedString {
                                    append(block.text)
                                    block.styles.forEach { style ->
                                        addStyle(
                                            SpanStyle(
                                                fontWeight = if (style.isBold) FontWeight.Bold else FontWeight.Normal,
                                                fontStyle = if (style.isItalic) FontStyle.Italic else FontStyle.Normal,
                                                textDecoration = if (style.isUnderlined) TextDecoration.Underline else null
                                            ), 
                                            style.start, 
                                            style.end
                                        )
                                    }
                                }
                                TextFieldValue(annotatedString, TextRange(block.text.length))
                            }
                        }
                        
                        var tfvState by remember(block.id) { mutableStateOf(initialTfv) }

                        LaunchedEffect(tfvMap[block.id]) {
                            tfvMap[block.id]?.let {
                                tfvState = it
                            }
                        }

                        // Используем BasicTextField для доступа к onTextLayout и точного скролла к курсору
                        BasicTextField(
                            value = tfvState,
                            onValueChange = { newValue: TextFieldValue ->
                                val oldTfv = tfvState
                                
                                if (newValue.text == oldTfv.text) {
                                    val finalNewValue = newValue.copy(annotatedString = oldTfv.annotatedString)
                                    tfvState = finalNewValue
                                    tfvMap[block.id] = finalNewValue
                                    scrollToCursor(block.id)
                                } else {
                                    val newAnnotatedString = buildAnnotatedString {
                                        append(newValue.text)
                                        val diff = newValue.text.length - oldTfv.text.length
                                        val cursor = newValue.selection.end
                                        
                                        oldTfv.annotatedString.spanStyles.forEach { span ->
                                            if (span.item.fontWeight != null || span.item.fontStyle != null || span.item.textDecoration != null) {
                                                val oldStart = span.start
                                                val oldEnd = span.end
                                                var newStart = oldStart
                                                var newEnd = oldEnd
                                                
                                                if (oldStart < cursor && oldEnd > cursor) {
                                                    newEnd += diff
                                                } else if (oldEnd <= cursor) {
                                                    // Без изменений
                                                } else {
                                                    newStart += diff
                                                    newEnd += diff
                                                }

                                                newStart = newStart.coerceAtLeast(0)
                                                newEnd = newEnd.coerceAtMost(newValue.text.length)

                                                if (newStart < newEnd) {
                                                    addStyle(span.item, newStart, newEnd)
                                                }
                                            }
                                        }
                                    }

                                    val finalNewValue = newValue.copy(annotatedString = newAnnotatedString)
                                    tfvState = finalNewValue
                                    tfvMap[block.id] = finalNewValue
                                    scrollToCursor(block.id)
                                }
                            },
                            onTextLayout = { textLayoutResults[block.id] = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .bringIntoViewRequester(bringIntoViewRequester)
                                .focusRequester(focusRequester)
                                .onFocusChanged { 
                                    if (it.isFocused) {
                                        activeBlockId = block.id
                                        scope.launch {
                                            delay(350)
                                            scrollToCursor(block.id)
                                        }
                                    }
                                },
                            textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                            decorationBox = { innerTextField ->
                                Box {
                                    if (tfvState.text.isEmpty()) {
                                        Text(
                                            "Введите текст...",
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                        )
                                    }
                                    innerTextField()
                                }
                            }
                        )
                    }
                }
            }
            
            item {
                Spacer(modifier = Modifier.height(250.dp))
            }
        }
    }

    if (showRenameDialog) {
        RenameNoteDialog(
            currentTitle = note.title,
            onDismiss = { showRenameDialog = false },
            onRename = { newTitle ->
                val updatedNote = note.copy(
                    title = newTitle,
                    timestamp = System.currentTimeMillis()
                )
                onSave(updatedNote)
                showRenameDialog = false
            }
        )
    }
}

@Composable
fun MainToolbar(onShowFormattingToolbar: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
        IconButton(onClick = onShowFormattingToolbar) { Icon(Icons.Default.TextFields, "Форматирование текста") }
    }
}

@Composable
fun TextFormattingToolbar(onToggleStyle: (TextStyleType) -> Unit, onClose: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
        IconButton(onClick = { onToggleStyle(TextStyleType.BOLD) }) { Icon(Icons.Default.FormatBold, "Bold") }
        IconButton(onClick = { onToggleStyle(TextStyleType.ITALIC) }) { Icon(Icons.Default.FormatItalic, "Italic") }
        IconButton(onClick = { onToggleStyle(TextStyleType.UNDERLINE) }) { Icon(Icons.Default.FormatUnderlined, "Underline") }
        Spacer(modifier = Modifier.weight(1f))
        IconButton(onClick = onClose) { Icon(Icons.Default.Close, "Закрыть") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateNoteDialog(onDismiss: () -> Unit, onCreate: (String) -> Unit) {
    var title by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss,
        title = { Text("Новая заметка") },
        text = { TextField(value = title, onValueChange = { title = it }, label = { Text("Введите заголовок") }) },
        confirmButton = { TextButton(onClick = { if (title.isNotBlank()) onCreate(title) }) { Text("Создать") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RenameNoteDialog(currentTitle: String, onDismiss: () -> Unit, onRename: (String) -> Unit) {
    var title by remember { mutableStateOf(currentTitle) }
    AlertDialog(onDismissRequest = onDismiss,
        title = { Text("Переименовать заметку") },
        text = { TextField(value = title, onValueChange = { title = it }, label = { Text("Новый заголовок") }) },
        confirmButton = { TextButton(onClick = { if (title.isNotBlank()) onRename(title) }) { Text("Переименовать") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } }
    )
}
