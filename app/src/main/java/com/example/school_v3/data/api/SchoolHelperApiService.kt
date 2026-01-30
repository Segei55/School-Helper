package com.example.school_v3.data.api

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface SchoolHelperApiService {
    @GET("api.php")
    suspend fun checkSubscription(
        @Query("action") action: String = "check_subscription",
        @Query("email") email: String,
        @Query("key") key: String
    ): Response<SubscriptionResponse>
}

@Serializable
data class SubscriptionResponse(
    val is_premium: Boolean,
    val until: String?,
    val error: String? = null
)
