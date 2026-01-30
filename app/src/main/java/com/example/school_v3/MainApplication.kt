package com.example.school_v3

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.google.firebase.FirebaseApp

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Используем новые ID каналов, чтобы гарантированно применился высокий приоритет (IMPORTANCE_HIGH)
            val timerChannel = NotificationChannel(
                TIMER_CHANNEL_ID,
                "Таймер",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Уведомления таймера и будильника"
                enableLights(true)
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(timerChannel)

            val reminderChannel = NotificationChannel(
                REMINDER_CHANNEL_ID,
                "Напоминания",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Плановые напоминания"
                enableLights(true)
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(reminderChannel)
        }
    }

    companion object {
        // Изменение ID канала заставляет систему пересоздать его с новыми настройками приоритета
        const val TIMER_CHANNEL_ID = "timer_channel_v3"
        const val REMINDER_CHANNEL_ID = "reminder_channel_v3"
    }
}
