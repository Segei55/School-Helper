package com.example.school_v3.ui.notes

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.school_v3.data.AuthManager
import com.example.school_v3.data.googledrive.GoogleDriveRestManager
import com.example.school_v3.ui.login.LoginViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass

class NotesViewModel(application: Application, private val loginViewModel: LoginViewModel) : AndroidViewModel(application) {

    private val _notes = MutableStateFlow<List<Note>>(emptyList())
    val notes: StateFlow<List<Note>> = _notes.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val googleDriveRestManager = GoogleDriveRestManager(application)
    private val authManager = AuthManager.getInstance(application)
    private val noteRepository = NoteRepository(application)

    // Configure JSON to handle polymorphic ContentBlock
    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        serializersModule = SerializersModule {
            polymorphic(ContentBlock::class) {
                subclass(TextBlock::class)
            }
        }
    }

    companion object {
        const val LOG_TAG = "NotesViewModelDebug"
    }

    init {
        _notes.value = noteRepository.loadNotes()
    }

    fun addNote(note: Note) {
        _notes.value = _notes.value + note
        noteRepository.saveNotes(_notes.value)
    }

    fun updateNote(updatedNote: Note) {
        _notes.value = _notes.value.map { if (it.id == updatedNote.id) updatedNote else it }
        noteRepository.saveNotes(_notes.value)
    }

    fun deleteNotes(idsToDelete: Set<Long>) {
        _notes.value = _notes.value.filterNot { idsToDelete.contains(it.id) }
        noteRepository.saveNotes(_notes.value)
    }

    private fun isUserLoggedIn(): Boolean {
        return authManager.getAccessToken() != null
    }

    fun exportNotes() {
        viewModelScope.launch {
            if (!isUserLoggedIn()) {
                Log.w(LOG_TAG, "Not logged in to Google Drive. Cannot export notes.")
                return@launch
            }
            _isLoading.value = true
            try {
                val notesJson = json.encodeToString(_notes.value)
                Log.d(LOG_TAG, "Attempting to export notes JSON: $notesJson")
                val result = googleDriveRestManager.uploadFile("notes.json", notesJson)
                if (result != null) {
                    Log.d(LOG_TAG, "Notes exported successfully with ID: $result")
                } else {
                    Log.e(LOG_TAG, "Failed to export notes: result is null")
                }
            } catch (e: Exception) {
                Log.e(LOG_TAG, "Error exporting notes: ", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun importNotes() {
        viewModelScope.launch {
            if (!isUserLoggedIn()) {
                Log.w(LOG_TAG, "Not logged in to Google Drive. Cannot import notes.")
                return@launch
            }
            _isLoading.value = true
            try {
                Log.d(LOG_TAG, "Attempting to read notes from Google Drive.")
                val notesJson = googleDriveRestManager.downloadFile("notes.json")
                
                if (notesJson == null || notesJson.isBlank()) {
                    Log.d(LOG_TAG, "No notes JSON found on Google Drive or it's blank.")
                    return@launch
                }
                
                Log.d(LOG_TAG, "Received notes JSON (first 200 chars): ${notesJson.take(200)}...")

                try {
                    val importedNotes = json.decodeFromString<List<Note>>(notesJson)
                    Log.d(LOG_TAG, "Successfully parsed ${importedNotes.size} notes from Google Drive.")

                    // Merge logic: combine local and remote notes
                    val localNotes = _notes.value.associateBy { it.id }
                    val remoteNotes = importedNotes.associateBy { it.id }

                    val allKeys = localNotes.keys + remoteNotes.keys

                    val mergedNotes = allKeys.mapNotNull { id ->
                        val local = localNotes[id]
                        val remote = remoteNotes[id]
                        when {
                            local != null && remote != null -> {
                                if (local.timestamp >= remote.timestamp) local else remote
                            }
                            local != null -> local
                            remote != null -> remote
                            else -> null
                        }
                    }.sortedByDescending { it.timestamp }

                    _notes.value = mergedNotes
                    noteRepository.saveNotes(mergedNotes)
                    Log.d(LOG_TAG, "Notes merged and saved locally. Total notes: ${mergedNotes.size}")

                } catch (e: Exception) {
                    Log.e(LOG_TAG, "JSON parsing failed for notes from Google Drive!", e)
                }
            } catch (e: Exception) {
                Log.e(LOG_TAG, "Error during Google Drive read operation in importNotes: ", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
