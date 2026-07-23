package com.example.family_guardian_child_app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log

class GuardianAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        
        // CRITICAL FIX: Ignore events from our own app/overlay to prevent the "blipping" loop
        if (packageName == "com.example.family_guardian_child_app") return

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || 
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            
            CurrentForegroundApp = packageName

            // 1. Detect URLs ONLY if we are in a browser
            if (isBrowser(packageName)) {
                val rootNode = rootInActiveWindow
                if (rootNode != null) {
                    val url = findUrl(rootNode)
                    if (url != null && url.isNotEmpty()) {
                        LastUrl = url
                        Log.d("Accessibility", "Browsed URL: $url")
                    }
                }
            } else {
                // 2. Clear the URL if we leave the browser for a safe app or the home screen
                LastUrl = ""
            }
        }
    }

    private fun isBrowser(packageName: String): Boolean {
        return packageName.contains("chrome") || 
               packageName.contains("browser") || 
               packageName.contains("opera") || 
               packageName.contains("firefox") ||
               packageName.contains("msedge")
    }

    private fun findUrl(node: AccessibilityNodeInfo): String? {
        val ids = arrayOf(
            "com.android.chrome:id/url_bar",
            "org.mozilla.firefox:id/url_bar_title",
            "com.opera.browser:id/url_field",
            "com.microsoft.emmx:id/url_bar"
        )
        
        for (id in ids) {
            val nodes = node.findAccessibilityNodeInfosByViewId(id)
            if (nodes.isNotEmpty()) {
                val text = nodes[0].text?.toString()
                if (text != null && (text.contains(".") || text.contains("://"))) {
                    return text
                }
            }
        }
        return searchForUrl(node)
    }

    private fun searchForUrl(node: AccessibilityNodeInfo): String? {
        val text = node.text?.toString()
        if (text != null && (text.startsWith("http") || (text.contains(".") && !text.contains(" ")))) {
            return text
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = searchForUrl(child)
            if (result != null) return result
        }
        return null
    }

    override fun onInterrupt() {}

    override fun onServiceConnected() {
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.notificationTimeout = 100
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        serviceInfo = info
    }

    companion object {
        var CurrentForegroundApp: String = ""
        var LastUrl: String = ""
    }
}
