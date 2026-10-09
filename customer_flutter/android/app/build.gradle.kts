import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Same signing credentials as the Capacitor build, so Play accepts this as an
// update to the published app instead of a different app.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.urbansteam.customerapp"
    // 36, not 35: androidx.navigationevent (pulled in transitively by the
    // plugins) refuses to compile against anything older. compileSdk only
    // decides which APIs can be compiled against -- targetSdk below stays at
    // 35, so the app's runtime behaviour is the same as the Capacitor build's.
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        // flutter_local_notifications uses java.time, which needs the newer
        // library APIs backported for the older Android versions this app still
        // supports.
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // Must stay exactly as the published app: com.urbansteam.customerapp
        applicationId = "com.urbansteam.customerapp"
        minSdk = flutter.minSdkVersion
        targetSdk = 35
        // The Capacitor build shipped 15 / 2.3.3, so this has to be higher.
        versionCode = 16
        versionName = "2.4.0"
    }

    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
