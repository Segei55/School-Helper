package com.example.school_v3.data.googledrive

import android.content.Context
import android.util.Log
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.drive.Drive
import com.google.api.services.drive.DriveScopes
import com.google.api.services.drive.model.File
import com.google.api.services.drive.model.FileList
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.Collections

class GoogleDriveManager(private val context: Context, private val googleSignInAccount: GoogleSignInAccount) {

    private val driveService: Drive

    init {
        val credential = GoogleAccountCredential.usingOAuth2(
            context,
            // This scope provides access to files created by the app. Using DRIVE_FILE is crucial.
            Collections.singleton(DriveScopes.DRIVE_FILE)
        )
        credential.selectedAccount = googleSignInAccount.account

        driveService = Drive.Builder(
            NetHttpTransport(),
            GsonFactory.getDefaultInstance(),
            credential
        )
            .setApplicationName("Школьный Помощник")
            .build()
    }

    companion object {
        const val GRADES_FILE_NAME = "grades.json"
        const val NOTES_FILE_NAME = "notes.json"
        const val PLANNER_FILE_NAME = "planner.json"
        const val JSON_MIME_TYPE = "application/json"
        const val LOG_TAG = "GoogleDriveManagerDebug"
    }

    // --- Public API for data types ---

    suspend fun saveGrades(content: String): String? =
        saveFile(GRADES_FILE_NAME, content, JSON_MIME_TYPE, useAppDataFolder = false) // CHANGED

    suspend fun readGrades(): String? =
        readFile(GRADES_FILE_NAME, useAppDataFolder = false) // CHANGED

    suspend fun saveNotes(content: String): String? =
        saveFile(NOTES_FILE_NAME, content, JSON_MIME_TYPE, useAppDataFolder = false)

    suspend fun readNotes(): String? =
        readFile(NOTES_FILE_NAME, useAppDataFolder = false)

    suspend fun savePlanner(content: String): String? =
        saveFile(PLANNER_FILE_NAME, content, JSON_MIME_TYPE, useAppDataFolder = false)

    suspend fun readPlanner(): String? =
        readFile(PLANNER_FILE_NAME, useAppDataFolder = false)

    // --- Generic low-level functions (private) ---

    private suspend fun saveFile(fileName: String, content: String, mimeType: String, useAppDataFolder: Boolean): String? = withContext(Dispatchers.IO) {
        Log.d(LOG_TAG, "Attempting to save file: $fileName")
        try {
            val space = if (useAppDataFolder) "appDataFolder" else "drive"
            val existingFile = findFile(fileName, space)

            val fileContent = com.google.api.client.http.ByteArrayContent.fromString(mimeType, content)

            if (existingFile != null) {
                Log.d(LOG_TAG, "File '$fileName' exists with ID: ${existingFile.id}. Updating content.")
                driveService.files().update(existingFile.id, null, fileContent).execute()?.id
            } else {
                Log.d(LOG_TAG, "File '$fileName' does not exist. Creating new file.")
                val metadata = File().apply {
                    name = fileName
                    this.mimeType = mimeType
                    if (useAppDataFolder) {
                        parents = listOf("appDataFolder")
                    }
                }
                driveService.files().create(metadata, fileContent).setFields("id").execute()?.id
            }
        } catch (e: Exception) {
            Log.e(LOG_TAG, "Error SAVING file $fileName", e)
            null
        }
    }

    private suspend fun readFile(fileName: String, useAppDataFolder: Boolean): String? = withContext(Dispatchers.IO) {
        Log.d(LOG_TAG, "Attempting to read file: $fileName")
        try {
            val space = if (useAppDataFolder) "appDataFolder" else "drive"
            val file = findFile(fileName, space)
            
            if (file == null) {
                Log.w(LOG_TAG, "File '$fileName' not found. Returning null.")
                return@withContext null
            }
            
            Log.d(LOG_TAG, "File '$fileName' found with ID: ${file.id}. Attempting to download content.")
            
            val inputStream = driveService.files().get(file.id).executeMediaAsInputStream()

            if (inputStream == null) {
                Log.e(LOG_TAG, "executeMediaAsInputStream() returned null. Cannot read file.")
                return@withContext null
            }

            Log.d(LOG_TAG, "Successfully got InputStream. Reading text...")

            val content = inputStream.use { stream ->
                BufferedReader(InputStreamReader(stream)).use { reader ->
                    reader.readText()
                }
            }

            Log.d(LOG_TAG, "Successfully read content. Length: ${content.length} chars.")
            if (content.length < 200) { // Log small content for debugging
                Log.d(LOG_TAG, "File content: $content")
            }

            return@withContext content

        } catch (e: Exception) {
            Log.e(LOG_TAG, "Error READING file '$fileName'", e)
            return@withContext null
        }
    }

    private suspend fun findFile(fileName: String, space: String): File? = withContext(Dispatchers.IO) {
        Log.d(LOG_TAG, "Searching for file '$fileName' in space '$space'")
        try {
            val query = "name = '$fileName' and trashed = false"
            val result: FileList = driveService.files().list()
                .setSpaces(space)
                .setQ(query)
                .setPageSize(1)
                .execute()
            
            val foundFile = result.files.firstOrNull()
            if (foundFile != null) {
                Log.d(LOG_TAG, "Found file with ID: ${foundFile.id}")
            } else {
                Log.d(LOG_TAG, "File not found in search result.")
            }
            return@withContext foundFile
        } catch (e: Exception) {
            Log.e(LOG_TAG, "Error FINDING file '$fileName' in space '$space'", e)
            return@withContext null
        }
    }
    
    suspend fun deleteFile(fileName: String, useAppDataFolder: Boolean): Boolean = withContext(Dispatchers.IO) {
        try {
            val space = if (useAppDataFolder) "appDataFolder" else "drive"
            val file = findFile(fileName, space) ?: return@withContext false // File not found is not an error
            driveService.files().delete(file.id).execute()
            true
        } catch (e: Exception) {
            Log.e(LOG_TAG, "Error deleting file $fileName", e)
            false
        }
    }
}
