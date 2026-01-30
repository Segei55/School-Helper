package com.example.school_v3.ui.settings

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlin.random.Random

@Composable
fun PremiumBanner(
    onDismiss: () -> Unit,
    onGoToSettings: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .clip(RoundedCornerShape(28.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(1.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
            ) {
                // Header с градиентом
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xFFEC4899), Color(0xFFF59E0B))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    ParticlesEffect()
                    
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Surface(
                            modifier = Modifier.size(70.dp),
                            shape = RoundedCornerShape(20.dp),
                            color = Color.White
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.WorkspacePremium,
                                    contentDescription = null,
                                    tint = Color(0xFFF59E0B),
                                    modifier = Modifier.size(40.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "PREMIUM ДОСТУП",
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            letterSpacing = 1.sp
                        )
                    }
                    
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color.White.copy(alpha = 0.7f))
                    }
                }

                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Синхронизация и бэкапы доступны в Premium.\nРазблокируйте все возможности School Helper прямо сейчас!",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                        textAlign = TextAlign.Center,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    PremiumFeatureItem(Icons.Default.AutoAwesome, "Безлимитный ИИ и история чатов", Color(0xFFF472B6))
                    PremiumFeatureItem(Icons.Default.CloudUpload, "Импорт/Экспорт и облако", Color(0xFFFBBF24))
                    PremiumFeatureItem(Icons.Default.Timeline, "Графики и напоминания", Color(0xFF60A5FA))

                    Spacer(modifier = Modifier.height(32.dp))

                    Button(
                        onClick = onGoToSettings,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Получить Premium", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumFeatureItem(icon: ImageVector, text: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Text(text, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun ParticlesEffect() {
    val particles = remember {
        List(15) {
            ParticleData(
                x = Random.nextFloat(),
                y = Random.nextFloat(),
                size = Random.nextFloat() * 4f + 2f,
                speed = Random.nextFloat() * 1000 + 2000,
                delay = Random.nextInt(2000)
            )
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "particles")

    // Создаем анимации вне Canvas, так как DrawScope не является Composable контекстом
    val animations = particles.mapIndexed { index, particle ->
        val scale = infiniteTransition.animateFloat(
            initialValue = 0.5f,
            targetValue = 1.5f,
            animationSpec = infiniteRepeatable(
                animation = tween(particle.speed.toInt(), delayMillis = particle.delay, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "scale_$index"
        )

        val alpha = infiniteTransition.animateFloat(
            initialValue = 0.1f,
            targetValue = 0.6f,
            animationSpec = infiniteRepeatable(
                animation = tween(particle.speed.toInt(), delayMillis = particle.delay, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "alpha_$index"
        )
        scale to alpha
    }

    Canvas(modifier = Modifier.fillMaxSize()) {
        particles.forEachIndexed { index, particle ->
            val (scaleState, alphaState) = animations[index]
            drawCircle(
                color = Color.White,
                radius = particle.size * scaleState.value,
                center = Offset(size.width * particle.x, size.height * particle.y),
                alpha = alphaState.value
            )
        }
    }
}

data class ParticleData(
    val x: Float,
    val y: Float,
    val size: Float,
    val speed: Float,
    val delay: Int
)
