package com.example.school_v3

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.school_v3.data.AuthManager
import com.example.school_v3.data.WebAuthData
import com.example.school_v3.ui.ai.AiScreen
import com.example.school_v3.ui.ai.AiViewModel
import com.example.school_v3.ui.calculator.CalculatorScreen
import com.example.school_v3.ui.calculator.CalculatorViewModel
import com.example.school_v3.ui.converter.ConverterScreen
import com.example.school_v3.ui.grades.GradesScreen
import com.example.school_v3.ui.login.LoginScreen
import com.example.school_v3.ui.login.LoginViewModel
import com.example.school_v3.ui.notes.NotesApp
import com.example.school_v3.ui.paint.PaintScreen
import com.example.school_v3.ui.paint.PaintViewModel
import com.example.school_v3.ui.planner.PlannerScreen
import com.example.school_v3.ui.settings.SettingsScreen
import com.example.school_v3.ui.settings.SettingsViewModel
import com.example.school_v3.ui.stopwatch.StopwatchScreen
import com.example.school_v3.ui.stopwatch.StopwatchViewModel
import com.example.school_v3.ui.theme.AccentBlue
import com.example.school_v3.ui.theme.School_V3Theme
import com.example.school_v3.ui.timer.TimerScreen
import com.example.school_v3.ui.timer.TimerViewModel
import kotlinx.serialization.json.Json
import java.net.URLDecoder

sealed class Screen(val route: String, val title: String, val icon: ImageVector, val color: Color) {
    object Login : Screen("login", "Вход", Icons.AutoMirrored.Filled.Login, AccentBlue)
    object Grades : Screen("grades", "Оценки", Icons.AutoMirrored.Filled.List, Color(0xFF5865F2))
    object Notes : Screen("notes", "Заметки", Icons.Filled.Edit, Color(0xFFF471A5))
    object Paint : Screen("paint", "Рисовалка", Icons.Filled.Palette, Color(0xFFA182FF))
    object Calculator : Screen("calculator", "Калькулятор", Icons.Filled.Calculate, Color(0xFF43B581))
    object Converter : Screen("converter", "Конвертер", Icons.Filled.Sync, Color(0xFFFAA61A))
    object Planner : Screen("planner", "Планировщик", Icons.Filled.DateRange, Color(0xFF7289DA))
    object Stopwatch : Screen("stopwatch", "Секундомер", Icons.Filled.Timer, Color(0xFFB9BBBE))
    object Timer : Screen("timer", "Таймер", Icons.Filled.HourglassEmpty, Color(0xFFF04747))
    object Ai : Screen("ai", "Нейросеть", Icons.Filled.SmartToy, Color(0xFF5865F2))
}

val items = listOf(
    Screen.Grades,
    Screen.Notes,
    Screen.Paint,
    Screen.Calculator,
    Screen.Converter,
    Screen.Planner,
    Screen.Stopwatch,
    Screen.Timer,
    Screen.Ai
)

class MainActivity : ComponentActivity() {
    private val settingsViewModel by viewModels<SettingsViewModel>()
    private val loginViewModel by viewModels<LoginViewModel>()
    private lateinit var authManager: AuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        authManager = AuthManager.getInstance(this)
        handleDeepLink(intent)
        enableEdgeToEdge()
        setContent {
            val isDarkMode by settingsViewModel.isDarkMode.collectAsState()
            School_V3Theme(darkTheme = isDarkMode) {
                MainScreen(settingsViewModel, loginViewModel)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "schoolhelper") {
            when (data.host) {
                "auth_callback" -> {
                    val base64Data = data.getQueryParameter("data")
                    if (base64Data != null) {
                        try {
                            val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                            val jsonString = String(decodedBytes, Charsets.UTF_8)
                            val authData = Json.decodeFromString<WebAuthData>(jsonString)
                            
                            authManager.saveAuthData(
                                email = authData.email,
                                name = authData.name,
                                picture = authData.picture,
                                accessToken = authData.access_token,
                                isPremium = authData.is_premium,
                                key = authData.license_key,
                                until = authData.premium_until
                            )
                            Log.d("MainActivity", "Web Auth success: ${authData.email}, premium: ${authData.is_premium}")
                            loginViewModel.onWebAuthSuccess()
                        } catch (e: Exception) {
                            Log.e("MainActivity", "Error decoding web auth data", e)
                        }
                    }
                }
                "auth" -> {
                    val email = data.getQueryParameter("email")
                    val name = data.getQueryParameter("name")?.let { URLDecoder.decode(it, "UTF-8") }
                    val picture = data.getQueryParameter("picture")?.let { URLDecoder.decode(it, "UTF-8") }
                    val accessToken = data.getQueryParameter("access_token")?.let { URLDecoder.decode(it, "UTF-8") }
                    val isPremium = data.getQueryParameter("is_premium")
                    val key = data.getQueryParameter("key")
                    val until = data.getQueryParameter("until")

                    authManager.saveAuthData(email, name, picture, accessToken, isPremium, key, until)
                    Log.d("MainActivity", "Old Auth success: $email, premium: $isPremium")
                    loginViewModel.onWebAuthSuccess()
                }
            }
        }
    }
}

@Composable
fun MainScreen(settingsViewModel: SettingsViewModel, loginViewModel: LoginViewModel) {
    val navController = rememberNavController()
    val isLoggedIn by loginViewModel.isLoggedIn.collectAsState()

    val startRoute = remember(isLoggedIn) {
        if (isLoggedIn) "main_menu" else Screen.Login.route
    }

    NavHost(navController, startDestination = startRoute, route = "main_graph") {
        composable(Screen.Login.route) { LoginScreen(navController, loginViewModel) }
        composable("main_menu") {
            MainMenuScreen(navController = navController)
        }
        
        composable(Screen.Grades.route) { 
            GradesScreen(navController = navController, loginViewModel = loginViewModel) 
        }
        
        composable(Screen.Notes.route) { 
            NotesApp(loginViewModel = loginViewModel, rootNavController = navController) 
        }
        
        composable(Screen.Paint.route) { backStackEntry ->
            val parentEntry = remember(backStackEntry) { navController.getBackStackEntry("main_graph") }
            val paintViewModel = viewModel<PaintViewModel>(parentEntry)
            PaintScreen(paintViewModel)
        }
        
        composable(Screen.Calculator.route) { backStackEntry ->
            val parentEntry = remember(backStackEntry) { navController.getBackStackEntry("main_graph") }
            val calculatorViewModel = viewModel<CalculatorViewModel>(parentEntry)
            CalculatorScreen(viewModel = calculatorViewModel, navController = navController)
        }
        
        composable(Screen.Converter.route) { ConverterScreen() }
        composable(Screen.Planner.route) { PlannerScreen() }
        
        composable(Screen.Stopwatch.route) { backStackEntry ->
            val parentEntry = remember(backStackEntry) { navController.getBackStackEntry("main_graph") }
            val stopwatchViewModel = viewModel<StopwatchViewModel>(parentEntry)
            StopwatchScreen(stopwatchViewModel)
        }
        
        composable(Screen.Timer.route) { backStackEntry ->
            val parentEntry = remember(backStackEntry) { navController.getBackStackEntry("main_graph") }
            val timerViewModel = viewModel<TimerViewModel>(parentEntry)
            timerViewModel.initMediaPlayer(LocalContext.current)
            TimerScreen(timerViewModel)
        }
        
        composable(Screen.Ai.route) { backStackEntry ->
            val parentEntry = remember(backStackEntry) { navController.getBackStackEntry("main_graph") }
            val aiViewModel = viewModel<AiViewModel>(parentEntry)
            AiScreen(navController = navController, aiViewModel = aiViewModel)
        }
        
        composable("settings") { SettingsScreen(navController = navController, settingsViewModel = settingsViewModel, loginViewModel = loginViewModel) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainMenuScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("School Helper", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { navController.navigate("settings") }) {
                        Icon(Icons.Default.Settings, contentDescription = "Настройки")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier
                .padding(padding)
                .fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(items) { screen ->
                MenuCard(screen) {
                    navController.navigate(screen.route)
                }
            }
        }
    }
}

@Composable
fun MenuCard(screen: Screen, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxSize()
            .aspectRatio(1f),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = screen.color.copy(alpha = 0.15f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(screen.color),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = screen.icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = screen.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
        }
    }
}
