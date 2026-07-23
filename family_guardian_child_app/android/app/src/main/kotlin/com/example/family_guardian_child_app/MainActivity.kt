package com.example.family_guardian_child_app

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import android.view.Gravity
import android.graphics.PixelFormat
import android.view.View
import android.view.LayoutInflater
import android.widget.TextView
import android.widget.Button
import android.text.TextUtils
import android.graphics.Color
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.family_guardian/device_admin"
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "isAdminActive" -> result.success(isAdminActive())
                "activateAdmin" -> {
                    activateAdmin()
                    result.success(null)
                }
                "canDrawOverlays" -> result.success(Settings.canDrawOverlays(this))
                "requestOverlayPermission" -> {
                    requestOverlayPermission()
                    result.success(null)
                }
                "isAccessibilityEnabled" -> result.success(isAccessibilityEnabled())
                "openAccessibilitySettings" -> {
                    openAccessibilitySettings()
                    result.success(null)
                }
                "getForegroundApp" -> result.success(GuardianAccessibilityService.CurrentForegroundApp)
                "getLastUrl" -> result.success(GuardianAccessibilityService.LastUrl)
                "showSystemLock" -> {
                    val reason = call.argument<String>("reason") ?: "Locked by Parent"
                    showSystemLock(reason)
                    result.success(null)
                }
                "hideSystemLock" -> {
                    hideSystemLock()
                    result.success(null)
                }
                "emergencyCall" -> {
                    emergencyCall()
                    result.success(null)
                }
                "lockDevice" -> {
                    lockDeviceNow()
                    result.success(null)
                }
                "goHome" -> {
                    goHome()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun isAccessibilityEnabled(): Boolean {
        val expectedService = ComponentName(this, GuardianAccessibilityService::class.java).flattenToString()
        val enabledServices = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        if (TextUtils.isEmpty(enabledServices)) return false
        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)
        while (colonSplitter.hasNext()) {
            if (colonSplitter.next().equals(expectedService, ignoreCase = true)) return true
        }
        return false
    }

    private fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun isAdminActive(): Boolean {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminReceiver::class.java)
        return dpm.isAdminActive(adminComponent)
    }

    private fun activateAdmin() {
        val adminComponent = ComponentName(this, DeviceAdminReceiver::class.java)
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Required for parental control.")
        startActivity(intent)
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
            startActivity(intent)
        }
    }

    private fun showSystemLock(reason: String) {
        if (!Settings.canDrawOverlays(this)) return
        if (overlayView != null) return

        runOnUiThread {
            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
            val layoutParams = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.MATCH_PARENT
                height = WindowManager.LayoutParams.MATCH_PARENT
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    else WindowManager.LayoutParams.TYPE_PHONE
                flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or 
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_FULLSCREEN or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.CENTER
            }

            val root = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setBackgroundColor(Color.parseColor("#EE111827"))
                setPadding(50, 50, 50, 50)
            }

            val titleView = TextView(this).apply {
                text = "Time's Up!"
                setTextColor(Color.WHITE)
                textSize = 32f
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 10)
            }
            
            val reasonView = TextView(this).apply {
                text = reason
                setTextColor(Color.LTGRAY)
                textSize = 18f
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 80)
            }

            val homeButton = Button(this).apply {
                text = "Go to Home Screen"
                setBackgroundColor(Color.parseColor("#2563EB"))
                setTextColor(Color.WHITE)
                setPadding(40, 20, 40, 20)
                setOnClickListener { 
                    goHome()
                    hideSystemLock()
                }
            }

            root.addView(titleView)
            root.addView(reasonView)
            root.addView(homeButton)

            overlayView = root
            windowManager?.addView(overlayView, layoutParams)
        }
    }

    private fun hideSystemLock() {
        runOnUiThread {
            if (overlayView != null) {
                try {
                    windowManager?.removeView(overlayView)
                } catch (e: Exception) {}
                overlayView = null
            }
        }
    }

    private fun goHome() {
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_HOME)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        startActivity(intent)
        // Manual clear to be safe
        GuardianAccessibilityService.LastUrl = ""
    }

    private fun emergencyCall() {
        val intent = Intent(Intent.ACTION_DIAL)
        intent.data = Uri.parse("tel:911")
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun lockDeviceNow() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (isAdminActive()) dpm.lockNow()
    }
}
