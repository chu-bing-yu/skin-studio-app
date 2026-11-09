import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/* 版本与签名：CI 通过环境变量注入，本地缺省也不影响编译 */
val versionNameProp = (project.findProperty("versionName") as String?) ?: "1.0.0"
val versionCodeProp = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toIntOrNull() ?: 1

android {
    namespace = "com.chubingyu.skinstudio"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.chubingyu.skinstudio"
        minSdk = 26
        targetSdk = 34
        versionCode = versionCodeProp
        versionName = versionNameProp
        resourceConfigurations += listOf("zh", "en")
    }

    signingConfigs {
        val ksPath = System.getenv("KEYSTORE_PATH")
        if (ksPath != null && file(ksPath).exists()) {
            create("release") {
                storeFile = file(ksPath)
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
                keyAlias = System.getenv("KEY_ALIAS") ?: ""
                keyPassword = System.getenv("KEY_PASSWORD") ?: System.getenv("KEYSTORE_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
        debug {
            applicationIdSuffix = ""
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    aaptOptions {
        noCompress += listOf("html", "js", "css", "json")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
