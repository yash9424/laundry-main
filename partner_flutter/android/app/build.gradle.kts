import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// The release signing details live in android/key.properties, which is not in
// git. They have to be the Captain app's existing keystore: Play rejects an
// update signed with anything else, and the key for a published app cannot be
// rotated.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.urbansteam.partner"
    // 36 rather than 35: androidx.navigationevent, which comes in through the
    // current AndroidX stack, refuses to compile below it. targetSdk stays at
    // 35, which is what the Capacitor build declares and what Play expects.
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications needs this to use java.time on old phones.
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // Must stay exactly this. It is what the published Captain app is
        // listed under; change it and this becomes a different app rather than
        // an update to the existing one.
        applicationId = "com.urbansteam.partner"
        // The Capacitor build declares 23. Flutter's floor is 24, so Android
        // 6.0 captains keep the build they have and stop getting updates.
        minSdk = flutter.minSdkVersion
        targetSdk = 35
        // The shipped Capacitor build is 17 / 1.0.17. Play needs a higher code.
        versionCode = 18
        versionName = "1.1.0"
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
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}

flutter {
    source = "../.."
}
