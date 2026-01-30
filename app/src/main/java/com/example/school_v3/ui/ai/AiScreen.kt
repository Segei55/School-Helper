package com.example.school_v3.ui.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.school_v3.data.AuthManager
import com.example.school_v3.ui.settings.PremiumBanner
import com.example.school_v3.ui.theme.AccentBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiScreen(navController: NavController, aiViewModel: AiViewModel) {
    val showPremiumBanner by aiViewModel.showPremiumBanner

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Нейросеть", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { aiViewModel.clearChat() }) {
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
        AiChatScreen(modifier = Modifier.padding(padding), viewModel = aiViewModel)
        
        if (showPremiumBanner) {
            PremiumBanner(
                onDismiss = { aiViewModel.dismissPremiumBanner() },
                onGoToSettings = { 
                    aiViewModel.dismissPremiumBanner()
                    navController.navigate("settings")
                }
            )
        }
    }
}

@Composable
fun AiChatScreen(modifier: Modifier = Modifier, viewModel: AiViewModel) {
    var inputMessage by remember { mutableStateOf("") }
    val chatHistory by viewModel.chatHistory
    val isLoading by viewModel.isLoading
    val messageCount by viewModel.messageCount
    val listState = rememberLazyListState()
    
    val context = LocalContext.current
    val authManager = remember { AuthManager.getInstance(context) }
    val isPremium by authManager.isPremiumFlow.collectAsState()

    LaunchedEffect(chatHistory.size) {
        if (chatHistory.isNotEmpty()) {
            listState.animateScrollToItem(0)
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        Card(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(40.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.SmartToy, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("модель", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                    Text("DeepSeek R1", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                Spacer(modifier = Modifier.weight(1f))
                
                // Плашка лимита отображается только для обычных пользователей
                if (!isPremium) {
                    Text(
                        "Лимит: $messageCount/8", 
                        fontSize = 12.sp, 
                        color = if (messageCount >= 8) Color.Red else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            if (chatHistory.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.size(100.dp).clip(RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Psychology, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(60.dp))
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("DeepSeek R1", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Ваш умный помощник на базе DeepSeek. Решает задачи, пишет код и объясняет сложные темы.",
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 20.sp
                    )
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    reverseLayout = true
                ) {
                    if (isLoading && chatHistory.lastOrNull()?.isUser == true) {
                        item { LoadingMessage() }
                    }
                    items(chatHistory.reversed()) { message ->
                        ChatMessageItem(message)
                    }
                }
            }
        }

        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(28.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextField(
                    value = inputMessage,
                    onValueChange = { inputMessage = it },
                    placeholder = { Text("Спроси меня о чем угодно...", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
                    modifier = Modifier.weight(1f),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                    ),
                    maxLines = 4
                )
                
                if (isLoading) {
                    IconButton(onClick = { viewModel.cancelGeneration() }) {
                        Icon(Icons.Default.Stop, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                    }
                } else {
                    IconButton(
                        onClick = { 
                            if (inputMessage.isNotBlank()) {
                                viewModel.sendMessage(inputMessage)
                                inputMessage = ""
                            }
                        },
                        enabled = inputMessage.isNotBlank()
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = if (inputMessage.isNotBlank()) AccentBlue else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun ChatMessageItem(message: UiChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = if (message.isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(0.85f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (message.isUser) AccentBlue else MaterialTheme.colorScheme.surface
            )
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = message.text, color = if (message.isUser) Color.White else MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
fun LoadingMessage() {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.Start) {
        Card(
            modifier = Modifier.fillMaxWidth(0.85f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = AccentBlue)
                Spacer(modifier = Modifier.width(12.dp))
                Text("Обдумываю...", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
            }
        }
    }
}
