# Android Play Store Release

This project is now configured to produce a Play Store release bundle from this machine.

## 1. Current local release config

[android/local.properties](/C:/Users/Grwyl/VSCode%20Projects/lift-logic/android/local.properties) now contains the local SDK path plus release signing and version values for this machine.

Required keys are:

```properties
sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
releaseStoreFile=C\:\\path\\to\\liftlogic-upload-keystore.jks
releaseStorePassword=your-keystore-password
releaseKeyAlias=your-key-alias
releaseKeyPassword=your-key-password
releaseVersionCode=1
releaseVersionName=1.0.0
```

Notes:
- `releaseStoreFile` should point to your upload keystore.
- `releaseVersionCode` must increase on every Play Store update.
- `releaseVersionName` is the user-facing version string.
- Release builds now fail fast if signing values are missing.

## 2. Build the release bundle

From [android](/C:/Users/Grwyl/VSCode%20Projects/lift-logic/android):

```powershell
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME=$env:ANDROID_SDK_ROOT
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:ANDROID_SDK_ROOT\cmdline-tools\latest\bin;$env:Path"
.\gradlew.bat bundleRelease
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 3. Play Console checklist

- Create the app in Google Play Console if it does not exist yet.
- Enable Play App Signing.
- Upload the `.aab`.
- Complete:
  - App access
  - Ads declaration
  - Content rating
  - Data safety
  - Target audience
  - Privacy policy URL
- Add:
  - App icon
  - Feature graphic
  - Phone screenshots
  - Short description
  - Full description

## 4. Current app details

- Application ID: `com.liftlogic.app`
- Min SDK: `24`
- Target SDK: `36`

## 5. Recommended next step

Increase `releaseVersionCode` and update `releaseVersionName` before each Play Store update, then run `bundleRelease` and upload the new `.aab` to Play Console.
