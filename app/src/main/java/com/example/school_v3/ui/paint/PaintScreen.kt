package com.example.school_v3.ui.paint

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint as AndroidPaint
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.drag
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Colorize
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FormatColorFill
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material.icons.outlined.CleaningServices
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.school_v3.ui.theme.AccentPurple
import java.io.OutputStream

data class DrawingPath(
    val path: Path,
    val color: Color,
    val strokeWidth: Float,
    val isEraser: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaintScreen(viewModel: PaintViewModel = viewModel()) {
    val context = LocalContext.current
    val paths = viewModel.paths
    var brushColor by viewModel::brushColor
    var canvasColor by viewModel::canvasColor
    val strokeWidth = viewModel.strokeWidth
    var isEraserMode by viewModel::isEraserMode
    var pathUpdated by viewModel::pathUpdated
    var showBrushSettings by viewModel::showBrushSettings
    var showColorPicker by viewModel::showColorPicker

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Рисовалка", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { viewModel.undo() }) {
                        Icon(Icons.Default.Undo, contentDescription = "Отмена", tint = MaterialTheme.colorScheme.onBackground)
                    }
                    IconButton(onClick = { viewModel.clear() }) {
                        Icon(Icons.Default.Delete, contentDescription = "Очистить", tint = MaterialTheme.colorScheme.onBackground)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Toolbar
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.padding(8.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { showBrushSettings = !showBrushSettings }) {
                        Icon(Icons.Default.Brush, contentDescription = "Размер кисти", tint = if (showBrushSettings) AccentPurple else MaterialTheme.colorScheme.onSurface)
                    }

                    // Brush color
                    IconButton(onClick = { showColorPicker = PickerType.FOREGROUND }) {
                        Icon(Icons.Default.Palette, contentDescription = "Цвет кисти", tint = brushColor)
                    }

                    // Canvas color
                    IconButton(onClick = { showColorPicker = PickerType.BACKGROUND }) {
                        Icon(Icons.Default.FormatColorFill, contentDescription = "Цвет фона", tint = canvasColor.let { if (it == Color.White) MaterialTheme.colorScheme.onSurface else it })
                    }

                    IconButton(onClick = { isEraserMode = !isEraserMode }) {
                        Icon(
                            imageVector = Icons.Outlined.CleaningServices,
                            contentDescription = "Ластик",
                            tint = if (isEraserMode) AccentPurple else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }

                    IconButton(onClick = { 
                        saveDrawing(context, paths, canvasColor)
                    }) {
                        Icon(Icons.Default.Download, contentDescription = "Сохранить", tint = Color(0xFF23A559))
                    }
                }
            }

            if (showBrushSettings) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Толщина", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            Spacer(Modifier.weight(1f))
                            Text(strokeWidth.floatValue.toInt().toString(), color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                        }
                        Slider(
                            value = strokeWidth.floatValue,
                            onValueChange = { strokeWidth.floatValue = it },
                            valueRange = 2f..100f,
                            colors = SliderDefaults.colors(
                                thumbColor = AccentPurple,
                                activeTrackColor = AccentPurple,
                                inactiveTrackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        )
                    }
                }
            }

            // Canvas
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(canvasColor)
                    .pointerInput(isEraserMode, brushColor, strokeWidth.floatValue) {
                        detectDragGestures(
                            onDragStart = {
                                paths.add(DrawingPath(Path().apply { moveTo(it.x, it.y) }, brushColor, strokeWidth.floatValue, isEraserMode))
                            },
                            onDrag = { change, _ ->
                                paths.lastOrNull()?.path?.lineTo(change.position.x, change.position.y)
                                pathUpdated++
                            }
                        )
                    }
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    pathUpdated.let {
                        drawIntoCanvas { canvas ->
                            canvas.nativeCanvas.saveLayer(null, null)
                            
                            paths.forEach { dp ->
                                drawPath(
                                    path = dp.path,
                                    color = dp.color,
                                    style = Stroke(dp.strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round),
                                    blendMode = if (dp.isEraser) BlendMode.Clear else BlendMode.SrcOver
                                )
                            }
                            canvas.nativeCanvas.restore()
                        }
                    }
                }
                Text(
                    "ТВОРЧЕСКОЕ ПРОСТРАНСТВО",
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    if (showColorPicker != null) {
        ModernColorPickerDialog(
            initialColor = if (showColorPicker == PickerType.FOREGROUND) brushColor else canvasColor,
            onDismiss = { showColorPicker = null },
            onColorSelected = { color ->
                if (showColorPicker == PickerType.FOREGROUND) brushColor = color
                else canvasColor = color
                showColorPicker = null
            }
        )
    }
}

enum class PickerType { FOREGROUND, BACKGROUND }

@Composable
fun ModernColorPickerDialog(
    initialColor: Color,
    onDismiss: () -> Unit,
    onColorSelected: (Color) -> Unit
) {
    var hsv by remember {
        val hsvArray = FloatArray(3)
        android.graphics.Color.colorToHSV(initialColor.toArgb(), hsvArray)
        mutableStateOf(Triple(hsvArray[0], hsvArray[1], hsvArray[2]))
    }

    val currentColor = Color(android.graphics.Color.HSVToColor(floatArrayOf(hsv.first, hsv.second, hsv.third)))

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { onColorSelected(currentColor) }) { Text("Выбрать") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Отмена") }
        },
        title = null,
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(4.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // SV Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .pointerInput(Unit) {
                            awaitEachGesture {
                                val down = awaitFirstDown()
                                val s = (down.position.x / size.width).coerceIn(0f, 1f)
                                val v = 1f - (down.position.y / size.height).coerceIn(0f, 1f)
                                hsv = Triple(hsv.first, s, v)
                                drag(down.id) { change ->
                                    val s2 = (change.position.x / size.width).coerceIn(0f, 1f)
                                    val v2 = 1f - (change.position.y / size.height).coerceIn(0f, 1f)
                                    hsv = Triple(hsv.first, s2, v2)
                                }
                            }
                        }
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val hueColor = Color(android.graphics.Color.HSVToColor(floatArrayOf(hsv.first, 1f, 1f)))
                        drawRect(
                            brush = Brush.horizontalGradient(
                                colors = listOf(Color.White, hueColor)
                            )
                        )
                        drawRect(
                            brush = Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black)
                            )
                        )
                        
                        // Selector
                        val x = hsv.second * size.width
                        val y = (1f - hsv.third) * size.height
                        drawCircle(
                            color = Color.White,
                            radius = 6.dp.toPx(),
                            center = Offset(x, y),
                            style = Stroke(width = 2.dp.toPx())
                        )
                        drawCircle(
                            color = Color.Black,
                            radius = 7.dp.toPx(),
                            center = Offset(x, y),
                            style = Stroke(width = 0.5.dp.toPx())
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Hue Slider and Preview
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Colorize,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = Color.DarkGray
                    )
                    
                    Spacer(modifier = Modifier.width(12.dp))
                    
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(currentColor)
                            .border(1.dp, Color.LightGray, CircleShape)
                    )
                    
                    Spacer(modifier = Modifier.width(12.dp))

                    // Hue Slider
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(12.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .pointerInput(Unit) {
                                awaitEachGesture {
                                    val down = awaitFirstDown()
                                    val h = (down.position.x / size.width).coerceIn(0f, 1f) * 360f
                                    hsv = Triple(h, hsv.second, hsv.third)
                                    drag(down.id) { change ->
                                        val h2 = (change.position.x / size.width).coerceIn(0f, 1f) * 360f
                                        hsv = Triple(h2, hsv.second, hsv.third)
                                    }
                                }
                            }
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val colors = listOf(
                                Color.Red, Color.Yellow, Color.Green,
                                Color.Cyan, Color.Blue, Color.Magenta, Color.Red
                            )
                            drawRect(brush = Brush.horizontalGradient(colors))
                            
                            // Selector
                            val x = (hsv.first / 360f) * size.width
                            drawCircle(
                                color = Color.White,
                                radius = 8.dp.toPx(),
                                center = Offset(x, size.height / 2),
                                style = Stroke(width = 2.dp.toPx())
                            )
                            drawCircle(
                                color = Color.Black.copy(alpha = 0.3f),
                                radius = 9.dp.toPx(),
                                center = Offset(x, size.height / 2),
                                style = Stroke(width = 1.dp.toPx())
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // RGB Inputs
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RgbField(label = "R", value = (currentColor.red * 255).toInt())
                    RgbField(label = "G", value = (currentColor.green * 255).toInt())
                    RgbField(label = "B", value = (currentColor.blue * 255).toInt())
                    
                    Column(
                        modifier = Modifier
                            .border(1.dp, Color.LightGray, RoundedCornerShape(4.dp))
                            .padding(2.dp)
                    ) {
                        Icon(Icons.Default.KeyboardArrowUp, null, Modifier.size(16.dp), Color.Gray)
                        Icon(Icons.Default.KeyboardArrowDown, null, Modifier.size(16.dp), Color.Gray)
                    }
                }
            }
        }
    )
}

@Composable
fun RgbField(label: String, value: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .width(55.dp)
                .border(1.dp, Color.LightGray, RoundedCornerShape(4.dp))
                .padding(vertical = 6.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                value.toString(),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color.Black
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            fontSize = 11.sp,
            color = Color.Gray,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun saveDrawing(context: Context, paths: List<DrawingPath>, bgColor: Color) {
    val width = 1080
    val height = 1920
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    
    // Сначала заливаем фон
    canvas.drawColor(bgColor.toArgb())
    
    // Используем слой для корректной работы ластика (Mode.CLEAR)
    // Без слоя CLEAR прорезает все до прозрачности, которая в итоговом файле может стать черной
    val saveCount = canvas.saveLayer(0f, 0f, width.toFloat(), height.toFloat(), null)
    
    val paint = AndroidPaint().apply {
        isAntiAlias = true
        style = AndroidPaint.Style.STROKE
        strokeCap = AndroidPaint.Cap.ROUND
        strokeJoin = AndroidPaint.Join.ROUND
    }
    
    paths.forEach { dp ->
        paint.color = dp.color.toArgb()
        paint.strokeWidth = dp.strokeWidth
        if (dp.isEraser) {
            paint.xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.CLEAR)
        } else {
            paint.xfermode = null
        }
        canvas.drawPath(dp.path.asAndroidPath(), paint)
    }
    
    // Объединяем слой с основным холстом. Прозрачные области (ластик) не изменят цвет фона под ними.
    canvas.restoreToCount(saveCount)
    
    val filename = "SchoolV3_Paint_${System.currentTimeMillis()}.png"
    var fos: OutputStream? = null
    
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val resolver = context.contentResolver
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            val imageUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
            fos = imageUri?.let { resolver.openOutputStream(it) }
        } else {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) downloadsDir.mkdirs()
            val image = java.io.File(downloadsDir, filename)
            fos = java.io.FileOutputStream(image)
        }
        
        fos?.use {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
            Toast.makeText(context, "Сохранено в Загрузки: $filename", Toast.LENGTH_LONG).show()
        }
    } catch (e: Exception) {
        Toast.makeText(context, "Ошибка сохранения: ${e.message}", Toast.LENGTH_SHORT).show()
    }
}
