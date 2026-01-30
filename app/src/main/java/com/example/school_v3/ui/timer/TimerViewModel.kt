package com.example.school_v3.ui.timer

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.app.NotificationCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.school_v3.MainActivity
import com.example.school_v3.MainApplication
import com.example.school_v3.R
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class TimerViewModel : ViewModel() {
    var totalTime by mutableLongStateOf(0L)
    var timeLeft by mutableLongStateOf(0L)
    var isRunning by mutableStateOf(false)
    var isFinished by mutableStateOf(false)
    var overTime by mutableLongStateOf(0L)

    var selectedHours by mutableIntStateOf(0)
    var selectedMinutes by mutableIntStateOf(0)
    var selectedSeconds by mutableIntStateOf(0)

    private var timerJob: Job? = null
    private var overTimeJob: Job? = null
    private var mediaPlayer: MediaPlayer? = null
    private var context: Context? = null

    init {
        instance = this
    }

    fun initMediaPlayer(context: Context) {
        this.context = context.applicationContext
        if (mediaPlayer == null) {
            try {
                mediaPlayer = MediaPlayer.create(context, R.raw.alarm_ringtone).apply { isLooping = true }
            } catch (e: Exception) { }
        }
    }

    fun startTimer() {
        if (totalTime == 0L) {
            totalTime = (selectedHours * 3600L + selectedMinutes * 60L + selectedSeconds) * 1000L
            timeLeft = totalTime
        }
        if (timeLeft > 0) {
            isRunning = true
            timerJob?.cancel()
            timerJob = viewModelScope.launch {
                while (isRunning && timeLeft > 0) {
                    delay(1000)
                    timeLeft -= 1000
                    if (timeLeft <= 0L) {
                        isRunning = false
                        isFinished = true
                        mediaPlayer?.start()
                        showNotification()
                        startOverTimeCounter()
                    }
                }
            }
        }
    }

    fun pauseTimer() {
        isRunning = false
        timerJob?.cancel()
    }

    private fun startOverTimeCounter() {
        overTimeJob?.cancel()
        overTimeJob = viewModelScope.launch {
            while (isFinished) {
                delay(1000)
                overTime += 1000
                updateNotification()
            }
        }
    }

    fun resetTimer() {
        isRunning = false
        isFinished = false
        timerJob?.cancel()
        overTimeJob?.cancel()
        timeLeft = 0L
        totalTime = 0L
        overTime = 0L
        mediaPlayer?.apply {
            if (isPlaying) {
                pause()
                seekTo(0)
            }
        }
        cancelNotification()
    }

    private fun showNotification() {
        val ctx = context ?: return
        val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val intent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(ctx, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val stopIntent = Intent(ctx, TimerReceiver::class.java).apply { action = "STOP_TIMER" }
        val stopPendingIntent = PendingIntent.getBroadcast(ctx, 1, stopIntent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(ctx, MainApplication.TIMER_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_pencil)
            .setContentTitle("Время вышло!")
            .setContentText("Прошло: 00:00:00")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pendingIntent)
            .addAction(0, "ОСТАНОВИТЬ", stopPendingIntent)
            .build()

        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun updateNotification() {
        val ctx = context ?: return
        val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val intent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(ctx, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val stopIntent = Intent(ctx, TimerReceiver::class.java).apply { action = "STOP_TIMER" }
        val stopPendingIntent = PendingIntent.getBroadcast(ctx, 1, stopIntent, PendingIntent.FLAG_IMMUTABLE)

        val timeStr = formatTime(overTime)
        
        val notification = NotificationCompat.Builder(ctx, MainApplication.TIMER_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_pencil)
            .setContentTitle("Время вышло!")
            .setContentText("Прошло: -$timeStr")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(0, "ОСТАНОВИТЬ", stopPendingIntent)
            .build()

        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun cancelNotification() {
        val ctx = context ?: return
        val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(NOTIFICATION_ID)
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        overTimeJob?.cancel()
        mediaPlayer?.release()
        if (instance == this) instance = null
    }

    companion object {
        private const val NOTIFICATION_ID = 1001
        var instance: TimerViewModel? = null
    }
}
