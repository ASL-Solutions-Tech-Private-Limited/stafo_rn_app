package com.stafo.app

import android.content.pm.ActivityInfo
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Lets react-native-screens restore safely after Android kills the app in the background.
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    // Keep the native splash on screen until JS calls BootSplash.hide().
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(savedInstanceState)
    // Phones stay portrait, like on iPhone; tablets (sw600dp and up) can rotate.
    if (resources.configuration.smallestScreenWidthDp < 600) {
      requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "StafoApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
