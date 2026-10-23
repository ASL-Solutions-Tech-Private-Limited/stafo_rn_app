package com.stafo.app

import android.app.Application
import com.chuckerteam.chucker.api.ChuckerCollector
import com.chuckerteam.chucker.api.ChuckerInterceptor
import com.chuckerteam.chucker.api.RetentionManager
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.modules.network.OkHttpClientProvider

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Every fetch/axios call goes through React Native's OkHttp client; Chucker
    // records it there. In release builds the no-op library makes this do nothing.
    OkHttpClientProvider.setOkHttpClientFactory {
      val chucker =
        ChuckerInterceptor.Builder(this)
          .collector(ChuckerCollector(this, showNotification = true, retentionPeriod = RetentionManager.Period.ONE_DAY))
          .maxContentLength(1_000_000L)
          .alwaysReadResponseBody(true)
          .build()
      OkHttpClientProvider.createClientBuilder(this).addInterceptor(chucker).build()
    }
    loadReactNative(this)
  }
}
