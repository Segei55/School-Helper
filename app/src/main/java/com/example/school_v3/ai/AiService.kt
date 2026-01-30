package com.example.school_v3.ai

import com.example.school_v3.BuildConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

// --- Константы конфигурации ---
const val OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/"

// --- Модели данных ---

@Serializable
data class ChatMessage(
    val role: String, // "system", "user", "assistant"
    val content: String
)

@Serializable
data class ChatRequest(
    val model: String,
    val messages: List<ChatMessage>,
    val temperature: Double = 0.7
)

@Serializable
data class ChatResponse(
    val choices: List<Choice>
)

@Serializable
data class Choice(
    val message: ChatMessage
)

// --- Retrofit Service ---

interface OpenRouterApi {
    @POST("chat/completions")
    suspend fun getCompletion(@Body request: ChatRequest): ChatResponse
}

class AuthInterceptor(private val apiKey: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $apiKey")
            .addHeader("Content-Type", "application/json")
            .addHeader("HTTP-Referer", "D:/projects/School_Helper_Android/")
            .addHeader("X-Title", "School_V3")
            .build()
        return chain.proceed(request)
    }
}

class AiService(apiKey: String) {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    private val contentType = "application/json".toMediaType()

    private val client = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(apiKey))
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(OPENROUTER_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory(contentType))
        .build()

    val api: OpenRouterApi = retrofit.create(OpenRouterApi::class.java)
}

// Глобальный экземпляр сервиса
val aiService = AiService(BuildConfig.OPENROUTER_API_KEY)
