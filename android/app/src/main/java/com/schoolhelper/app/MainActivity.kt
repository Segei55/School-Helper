package com.schoolhelper.app

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private val APP_URL = "https://school-helper.ru" // Замените на нужный URL

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)

        setupWebView()
        setupGestures()
        setupNotifications()
        handleIntent(intent)

        webView.loadUrl(APP_URL)
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportZoom(false)
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                
                // Обработка Deep Links для авторизации
                if (url.startsWith("schoolhelper://")) {
                    return true
                }
                
                // Открытие внешних ссылок (Google Auth, другие сайты) в системном браузере
                if (url.contains("accounts.google.com") || url.contains("oauth") || (!url.contains("school-helper.ru") && !url.startsWith("file://"))) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                }
                
                return false // Загружаем внутри WebView
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                swipeRefreshLayout.isRefreshing = true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Здесь можно обрабатывать JS alerts, загрузку файлов и т.д.
        }
        
        // Добавляем JS интерфейс для связи с нативным кодом
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidNative")
    }

    private fun setupGestures() {
        // Свайп вниз для обновления
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }

        // Обработка кнопки "Назад"
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun setupNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "school_helper_channel",
                "School Helper Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Уведомления и напоминания"
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val action = intent?.action
        val data = intent?.data
        if (Intent.ACTION_VIEW == action && data != null) {
            // Возврат из браузера после авторизации
            val url = data.toString()
            webView.loadUrl("javascript:window.handleDeepLink('$url')")
        }
    }
    
    // Интерфейс для вызова нативных функций из JS
    inner class WebAppInterface(private val mContext: Context) {
        @JavascriptInterface
        fun showNotification(title: String, message: String) {
            val builder = NotificationCompat.Builder(mContext, "school_helper_channel")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)

            with(NotificationManagerCompat.from(mContext)) {
                try {
                    notify(System.currentTimeMillis().toInt(), builder.build())
                } catch (e: SecurityException) {
                    e.printStackTrace()
                }
            }
        }
        
        @JavascriptInterface
        fun getHiddenKey(keyName: String): String {
            // Безопасная передача скрытого ключа в JS
            if (keyName == "API_KEY") return BuildConfig.API_KEY
            return ""
        }
    }
}
