# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Room (used by WorkManager, which Firebase and other libraries start at launch)
# finds each database's generated *_Impl class by name; keep them and their names.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keepnames class androidx.work.impl.WorkDatabase

# PayU CheckoutPro (subscription payments) loads parts of itself by name.
-keep class com.payu.** { *; }
-keep class com.payubiz.** { *; }
-dontwarn com.payu.**
