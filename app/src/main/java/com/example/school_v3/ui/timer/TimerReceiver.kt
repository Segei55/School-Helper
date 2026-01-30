package com.example.school_v3.ui.timer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TimerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "STOP_TIMER") {
            TimerViewModel.instance?.resetTimer()
        }
    }
}
