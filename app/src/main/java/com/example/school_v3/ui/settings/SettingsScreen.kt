package com.example.school_v3.ui.settings

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.example.school_v3.data.AuthManager
import com.example.school_v3.ui.login.LoginViewModel
import com.example.school_v3.ui.theme.AccentBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController, loginViewModel: LoginViewModel, settingsViewModel: SettingsViewModel) {
    val currentUser by loginViewModel.firebaseUser.collectAsState()
    val isLoggedIn by loginViewModel.isLoggedIn.collectAsState()
    val dataUpdateTrigger by loginViewModel.authDataUpdated.collectAsState()
    
    val context = LocalContext.current
    val isDarkMode by settingsViewModel.isDarkMode.collectAsState()
    
    val authManager = remember { AuthManager.getInstance(context) }
    val isPremium by authManager.isPremiumFlow.collectAsState()
    val premiumUntil = remember(isLoggedIn, dataUpdateTrigger) { authManager.getUntilDate() }
    
    val webName = remember(isLoggedIn, dataUpdateTrigger) { authManager.getName() }
    val webEmail = remember(isLoggedIn, dataUpdateTrigger) { authManager.getEmail() }
    val webPicture = remember(isLoggedIn, dataUpdateTrigger) { authManager.getPicture() }
    val isOfflineAnon = remember(isLoggedIn, dataUpdateTrigger) { authManager.isOfflineAnonymous() }

    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(isLoggedIn) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            if (!isLoggedIn) { 
                navController.navigate("login") { 
                    popUpTo(navController.graph.id) { inclusive = true } 
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Настройки", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад", tint = MaterialTheme.colorScheme.onBackground)
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.padding(24.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            UserAvatar(currentUser?.photoUrl?.toString() ?: webPicture)
                            Spacer(modifier = Modifier.width(20.dp))
                            Column {
                                val displayName = webName ?: currentUser?.displayName?.takeIf { it.isNotBlank() } ?: "Пользователь"
                                val displayEmail = webEmail ?: if (currentUser?.isAnonymous == true || isOfflineAnon) {
                                    "Автономный режим"
                                } else {
                                    currentUser?.email ?: ""
                                }
                                
                                Text(
                                    text = displayName,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                if (displayEmail.isNotBlank()) {
                                    Text(
                                        text = displayEmail,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                        
                        PremiumPanel(
                            isAnonymous = (currentUser?.isAnonymous == true || isOfflineAnon) && webEmail == null,
                            isPremium = isPremium,
                            premiumUntil = premiumUntil,
                            isDarkMode = isDarkMode,
                            onActivate = { code ->
                                if (code.isNotBlank() && code == authManager.getAuthKey()) {
                                    authManager.setPremium(true)
                                }
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }

            item {
                SettingsSection(icon = Icons.Default.Settings, title = "Оформление") {
                    SettingsItem(text = "Тёмная тема") {
                        Switch(
                            checked = isDarkMode,
                            onCheckedChange = { settingsViewModel.setDarkMode(it) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = AccentBlue,
                                uncheckedThumbColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                uncheckedTrackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        )
                    }
                }
            }

            item {
                SettingsSection(icon = Icons.Default.Info, title = "О приложении") {
                    SettingsItem(text = "Версия") {
                        Text("Бета 0.1.0", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                    }
                    SettingsItem(text = "Разработчик") {
                        Text("Sihmer", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                    }
                }
            }

            item {
                SettingsSection(icon = Icons.Default.Person, title = "Аккаунт") {
                    Button(
                        onClick = { loginViewModel.signOut(context) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Выйти из системы", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(32.dp)) }
        }
    }
}

@Composable
fun PremiumPanel(
    isAnonymous: Boolean,
    isPremium: Boolean,
    premiumUntil: String?,
    isDarkMode: Boolean,
    onActivate: (String) -> Unit
) {
    var activationCode by remember { mutableStateOf("") }
    val context = LocalContext.current

    val containerBg = if (isDarkMode) Color(0xFF1E1E2E).copy(alpha = 0.8f) else Color(0xFFF3F4F6)
    val textColor = if (isDarkMode) Color.White else Color(0xFF1F2937)
    val subTextColor = if (isDarkMode) Color.White.copy(alpha = 0.6f) else Color(0xFF4B5563)
    val inputBg = if (isDarkMode) Color(0xFF2D2D44) else Color.White
    val buttonBg = if (isDarkMode) Color(0xFF4B5563) else Color(0xFFE5E7EB)
    val buttonText = if (isDarkMode) Color.White else Color(0xFF111827)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .border(
                width = 1.dp,
                brush = Brush.horizontalGradient(listOf(Color(0xFF6366F1), Color(0xFFA855F7), Color(0xFFEC4899))),
                shape = RoundedCornerShape(20.dp)
            )
            .background(containerBg, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xFFFACC15).copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFEAB308), modifier = Modifier.size(26.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text("School Helper Premium", fontWeight = FontWeight.ExtraBold, color = textColor, fontSize = 17.sp)
                    Text(
                        if (isPremium) {
                            if (!premiumUntil.isNullOrBlank()) "Ваша подписка активна! Срок истечения: $premiumUntil"
                            else "Ваша подписка активна!"
                        } else "Разблокируйте все функции, купив подписку на сайте",
                        color = subTextColor,
                        fontSize = 13.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            when {
                isAnonymous -> {
                    Button(
                        onClick = {
                            val url = "https://school-helper.ru/#/auth?mode=app"
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isDarkMode) Color(0xFF2D2D44) else Color(0xFFE0E7FF)
                        ),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Login, contentDescription = null, tint = Color(0xFF6366F1))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            "Войти для активации подписки", 
                            color = Color(0xFF6366F1), 
                            fontSize = 12.sp, 
                            fontWeight = FontWeight.Bold,
                            maxLines = 1
                        )
                    }
                }
                isPremium -> {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFF10B981).copy(alpha = 0.1f),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(22.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Подписка активна", color = Color(0xFF059669), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                        }
                    }
                }
                else -> {
                    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = activationCode,
                            onValueChange = { activationCode = it },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            placeholder = { Text("Ключ активации...", fontSize = 14.sp, color = subTextColor) },
                            leadingIcon = { Icon(Icons.Default.VpnKey, contentDescription = null, modifier = Modifier.size(18.dp), tint = subTextColor) },
                            shape = RoundedCornerShape(14.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = inputBg,
                                unfocusedContainerColor = inputBg,
                                focusedBorderColor = Color(0xFF6366F1),
                                unfocusedBorderColor = if (isDarkMode) Color.Transparent else Color(0xFFD1D5DB),
                                focusedTextColor = textColor,
                                unfocusedTextColor = textColor
                            )
                        )
                        Button(
                            onClick = { onActivate(activationCode) },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = buttonBg),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp), tint = buttonText)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Активировать", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = buttonText)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun UserAvatar(photoUrl: String?) {
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(AccentBlue.copy(alpha = 0.2f)),
        contentAlignment = Alignment.Center
    ) {
        if (!photoUrl.isNullOrEmpty()) {
            AsyncImage(
                model = photoUrl,
                contentDescription = "User Avatar",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = "Avatar",
                modifier = Modifier.size(36.dp),
                tint = AccentBlue
            )
        }
    }
}

@Composable
fun SettingsSection(icon: ImageVector, title: String, content: @Composable () -> Unit) {
    var isExpanded by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(vertical = 6.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .clickable { isExpanded = !isExpanded }
                .padding(vertical = 10.dp, horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(14.dp))
                Text(title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, fontSize = 16.sp)
            }
            Icon(
                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        AnimatedVisibility(visible = isExpanded) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(vertical = 6.dp)) {
                    content()
                }
            }
        }
    }
}

@Composable
fun SettingsItem(text: String, trailingContent: @Composable () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = text, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
        trailingContent()
    }
}
