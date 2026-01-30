package com.example.school_v3.receivers

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.example.school_v3.MainActivity
import com.example.school_v3.MainApplication
import com.example.school_v3.R

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminderText = intent.getStringExtra("reminder_text") ?: return
        val reminderId = intent.getIntExtra("reminder_id", 0)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val activityIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(context, reminderId, activityIntent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(context, MainApplication.REMINDER_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_pencil)
            .setContentTitle("Напоминание")
            .setContentText(reminderText)
            .setPriority(NotificationCompat.PRIORITY_HIGH) // Для Heads-up
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(reminderId, notification)
    }
}
