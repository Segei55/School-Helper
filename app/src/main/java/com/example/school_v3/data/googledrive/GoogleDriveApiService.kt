package com.example.school_v3.data.googledrive

import kotlinx.serialization.Serializable
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface GoogleDriveApiService {

    @GET("drive/v3/files")
    suspend fun listFiles(
        @Query("q") query: String? = null,
        @Query("spaces") spaces: String = "drive",
        @Query("fields") fields: String = "files(id, name)"
    ): Response<FileListResponse>

    @Multipart
    @POST("upload/drive/v3/files?uploadType=multipart")
    suspend fun createFile(
        @Part("metadata") metadata: RequestBody,
        @Part file: MultipartBody.Part
    ): Response<DriveFile>

    @Multipart
    @PATCH("upload/drive/v3/files/{fileId}?uploadType=multipart")
    suspend fun updateFile(
        @Path("fileId") fileId: String,
        @Part("metadata") metadata: RequestBody,
        @Part file: MultipartBody.Part
    ): Response<DriveFile>

    @GET("drive/v3/files/{fileId}?alt=media")
    suspend fun downloadFile(@Path("fileId") fileId: String): Response<ResponseBody>

    @DELETE("drive/v3/files/{fileId}")
    suspend fun deleteFile(@Path("fileId") fileId: String): Response<Unit>
}

@Serializable
data class FileListResponse(
    val files: List<DriveFile>
)

@Serializable
data class DriveFile(
    val id: String,
    val name: String,
    val mimeType: String? = null
)
