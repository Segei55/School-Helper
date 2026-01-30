package com.example.school_v3.data.googledrive

import android.content.Context
import android.util.Log
import com.example.school_v3.data.AuthManager
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class GoogleDriveRestManager(private val context: Context) {
    private val authManager = AuthManager.getInstance(context)
    private val json = Json { ignoreUnknownKeys = true }
    
    private val client = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val token = authManager.getAccessToken()
            val request = chain.request().newBuilder()
                .apply {
                    token?.let { addHeader("Authorization", "Bearer $it") }
                }
                .build()
            val response = chain.proceed(request)
            
            if (response.code == 401) {
                Log.e("GoogleDrive", "401 Unauthorized - The provided token is invalid for Google Drive API. Ensure the site provides a Google Access Token with Drive scopes.")
                // Редирект удален, чтобы избежать петель при неверном токене. 
                // Ошибку должна обрабатывать ViewModel.
            }
            response
        }
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.HEADERS })
        .build()

    private val api = Retrofit.Builder()
        .baseUrl("https://www.googleapis.com/")
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(GoogleDriveApiService::class.java)

    suspend fun findFileId(fileName: String): String? {
        return try {
            val response = api.listFiles(query = "name = '$fileName' and trashed = false")
            if (response.isSuccessful) {
                response.body()?.files?.firstOrNull()?.id
            } else {
                Log.e("GoogleDrive", "listFiles error: ${response.code()}")
                null
            }
        } catch (e: Exception) {
            Log.e("GoogleDrive", "listFiles exception", e)
            null
        }
    }

    suspend fun uploadFile(fileName: String, content: String, mimeType: String = "application/json"): String? {
        return try {
            val fileId = findFileId(fileName)
            val metadataString = "{\"name\": \"$fileName\", \"mimeType\": \"$mimeType\"}"
            val metadata = metadataString.toRequestBody("application/json".toMediaType())
            val filePart = content.toRequestBody(mimeType.toMediaType())
            val multipart = MultipartBody.Part.createFormData("file", fileName, filePart)

            val response = if (fileId == null) {
                api.createFile(metadata, multipart)
            } else {
                api.updateFile(fileId, metadata, multipart)
            }

            if (response.isSuccessful) {
                Log.d("GoogleDrive", "Upload successful: $fileName")
                response.body()?.id
            } else {
                Log.e("GoogleDrive", "Upload error: ${response.code()} ${response.errorBody()?.string()}")
                null
            }
        } catch (e: Exception) {
            Log.e("GoogleDriveRestManager", "Upload failed", e)
            null
        }
    }

    suspend fun downloadFile(fileName: String): String? {
        return try {
            val fileId = findFileId(fileName) ?: run {
                Log.w("GoogleDrive", "File not found: $fileName")
                return null
            }
            val response = api.downloadFile(fileId)
            if (response.isSuccessful) {
                Log.d("GoogleDrive", "Download successful: $fileName")
                response.body()?.string()
            } else {
                Log.e("GoogleDrive", "Download error: ${response.code()}")
                null
            }
        } catch (e: Exception) {
            Log.e("GoogleDriveRestManager", "Download failed", e)
            null
        }
    }
}
