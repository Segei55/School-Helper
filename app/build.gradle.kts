import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.23"
    id("com.google.gms.google-services")
}

fun getApiKey(property: String): String {
    val properties = Properties()
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        properties.load(FileInputStream(localPropertiesFile))
        return properties.getProperty(property)
    }
    return ""
}

android {
    namespace = "com.example.school_v3"
    compileSdk = 36 // Обновлено до 36, так как этого требуют новые версии библиотек androidx

    defaultConfig {
        // ОБЯЗАТЕЛЬНО: Измените это значение перед публикацией на уникальное (например, com.myname.schoolhelper)
        applicationId = "com.example.school_v3" 
        minSdk = 26
        targetSdk = 35 // Рекомендуемый таргет для Play Store в 2024
        versionCode = 1
        versionName = "Бета 0.1.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        buildConfigField("String", "OPENROUTER_API_KEY", getApiKey("OPENROUTER_API_KEY"))
    }

    buildTypes {
        release {
            isMinifyEnabled = true 
            isShrinkResources = true 
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "/META-INF/DEPENDENCIES"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.kotlinx.serialization.json)
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.navigation:navigation-compose:2.8.0")

    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.android.gms:play-services-auth:21.2.0")

    implementation("com.google.api-client:google-api-client-android:1.32.1")
    implementation("com.google.api-client:google-api-client-gson:1.32.1")
    implementation("com.google.apis:google-api-services-drive:v3-rev20230822-2.0.0")

    implementation("io.coil-kt:coil-compose:2.6.0")
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation("net.objecthunter:exp4j:0.4.8")
}
