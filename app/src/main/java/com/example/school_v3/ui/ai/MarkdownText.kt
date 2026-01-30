package com.example.school_v3.ui.ai

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.sp

@Composable
fun MarkdownText(
    markdown: String,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified
) {
    val annotatedString = buildAnnotatedString {
        var processed = markdown
            // 1. Обработка дробей \frac{num}{den} -> (num)/(den)
            .replace("""\\frac\{(.*?)\}\{(.*?)\}""".toRegex()) { 
                "(${it.groupValues[1]})/(${it.groupValues[2]})" 
            }
            // 2. Убираем технические скобки LaTeX \( \) \[ \]
            .replace("\\(", "").replace("\\)", "").replace("\\[", "").replace("\\]", "")
            // 3. Спецсимволы
            .replace("\\cdot", "·")
            .replace("\\quad", "  ")
            .replace("\\pm", "±")
            .replace("\\ge", "≥")
            .replace("\\le", "≤")
            .replace("\\ne", "≠")
            .replace("\\times", "×")
            .replace("\\div", "÷")
            // 4. Корень \sqrt{x} -> √x
            .replace("""\\sqrt\{(.*?)\}""".toRegex()) { "√${it.groupValues[1]}" }
            .replace("\\sqrt", "√")
            // 5. Текст внутри формул \text{...} -> ...
            .replace("""\\text\{(.*?)\}""".toRegex()) { it.groupValues[1] }
            // 6. Степени ^2, ^{10}
            .replace("""\^\{(.*?)\}""".toRegex()) { "^${it.groupValues[1]}" }
            .replace("^2", "²").replace("^3", "³")
            // 7. Индексы _1, _{10}
            .replace("""_\{(.*?)\}""".toRegex()) { "_${it.groupValues[1]}" }
            .replace("_1", "₁").replace("_2", "₂").replace("_3", "₃")
            .replace("_n", "ₙ").replace("_i", "ᵢ")
            // 8. Финальная чистка оставшихся технических фигурных скобок, если они одиночные
            .replace("{", "").replace("}", "")

        val lines = processed.lines()
        lines.forEachIndexed { index, line ->
            val trimmedLine = line.trim()
            
            if (trimmedLine.isEmpty()) {
                if (index < lines.size - 1) append("\n")
                return@forEachIndexed
            }

            // Заголовки: ### Название или 4. Название
            val headerMatch = "^(#{1,6}|\\d+\\.)\\s*(.*)".toRegex().find(trimmedLine)
            if (headerMatch != null) {
                val prefix = headerMatch.groupValues[1]
                val content = headerMatch.groupValues[2]
                
                val isNumericHeader = prefix.endsWith(".")
                val fontSize = if (isNumericHeader) 17.sp else {
                    when (prefix.length) {
                        1 -> 22.sp
                        2 -> 20.sp
                        3 -> 18.sp
                        else -> 16.sp
                    }
                }

                withStyle(style = SpanStyle(
                    fontWeight = FontWeight.Bold, 
                    fontSize = fontSize, 
                    color = if (isNumericHeader) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                )) {
                    append(prefix)
                    if (content.isNotEmpty()) {
                        append(" ")
                        appendFormattedInline(content)
                    }
                }
            } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
                append(" • ")
                appendFormattedInline(trimmedLine.substring(2))
            } else {
                appendFormattedInline(line)
            }

            if (index < lines.size - 1) {
                append("\n")
            }
        }
    }

    Text(
        text = annotatedString,
        modifier = modifier,
        style = MaterialTheme.typography.bodyMedium,
        color = if (color != Color.Unspecified) color else MaterialTheme.colorScheme.onSurfaceVariant,
        lineHeight = 22.sp
    )
}

private fun AnnotatedString.Builder.appendFormattedInline(text: String) {
    val boldRegex = """\*\*(.*?)\*\*""".toRegex()
    var lastIndex = 0

    boldRegex.findAll(text).forEach { match ->
        append(text.substring(lastIndex, match.range.first))
        withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
            append(match.groupValues[1])
        }
        lastIndex = match.range.last + 1
    }
    append(text.substring(lastIndex))
}
