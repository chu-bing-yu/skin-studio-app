package com.chubingyu.skinstudio

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * 暴露给网页的桥：
 *  - SkinFile.saveFile / shareFile ：真正写手机存储 / 系统分享
 *  - SkinAI.chatAsync              ：原生发请求（绕开 file:// 的 CORS 与明文限制）
 */
class SkinBridge(
    private val context: Context,
    private val webViewGetter: () -> android.webkit.WebView?
) {

    /* ---------------- 文件 ---------------- */

    @JavascriptInterface
    fun saveFile(name: String, content: String, mime: String): String {
        return try {
            val fileName = safeName(name)
            val bytes = content.toByteArray(Charsets.UTF_8)
            val path = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, mime.ifBlank { "text/css" })
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SkinStudio")
                }
                val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: return err("无法创建下载文件")
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                "Download/SkinStudio/$fileName"
            } else {
                val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "SkinStudio")
                if (!dir.exists()) dir.mkdirs()
                val f = File(dir, fileName)
                FileOutputStream(f).use { it.write(bytes) }
                f.absolutePath
            }
            JSONObject().put("ok", true).put("path", path).toString()
        } catch (e: Exception) {
            err(e.message ?: "保存失败")
        }
    }

    @JavascriptInterface
    fun shareFile(name: String, content: String, mime: String): String {
        return try {
            val dir = File(context.cacheDir, "shared")
            if (!dir.exists()) dir.mkdirs()
            val file = File(dir, safeName(name))
            FileOutputStream(file).use { it.write(content.toByteArray(Charsets.UTF_8)) }
            val uri: Uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = mime.ifBlank { "text/css" }
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(intent, "分享 CSS").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
            JSONObject().put("ok", true).toString()
        } catch (e: Exception) {
            err(e.message ?: "分享失败")
        }
    }

    /* ---------------- AI ---------------- */

    @JavascriptInterface
    fun chatAsync(requestJson: String) {
        val webView = webViewGetter() ?: return
        Thread {
            val result = try {
                val req = JSONObject(requestJson)
                val token = req.optString("token")
                val payload = req.optJSONObject("payload") ?: JSONObject()
                /* 原生通道一律走非流式，简单可靠 */
                payload.put("stream", false)
                payload.remove("stream_options")

                val conn = URL(req.getString("url")).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 30000
                conn.readTimeout = 180000
                conn.doOutput = true
                val headers = req.optJSONObject("headers")
                if (headers != null) {
                    headers.keys().forEach { key -> conn.setRequestProperty(key, headers.optString(key)) }
                }
                conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }

                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val body = stream?.bufferedReader()?.use { it.readText() } ?: ""
                if (code !in 200..299) {
                    JSONObject().put("ok", false).put("error", "HTTP $code：" + body.take(300)).put("token", token).toString()
                } else {
                    val json = JSONObject(body)
                    val choice = json.optJSONArray("choices")?.optJSONObject(0)
                    val text = choice?.optJSONObject("message")?.optString("content")
                        ?: choice?.optString("text") ?: ""
                    JSONObject()
                        .put("ok", true)
                        .put("text", text)
                        .put("usage", json.optJSONObject("usage") ?: JSONObject.NULL)
                        .put("token", token)
                        .toString()
                }
            } catch (e: Exception) {
                JSONObject().put("ok", false).put("error", e.message ?: "请求失败").toString()
            }
            webView.post {
                val escaped = JSONObject.quote(result)
                webView.evaluateJavascript("window.__ssAIResult && window.__ssAIResult($escaped)", null)
            }
        }.start()
    }

    private fun safeName(name: String): String =
        name.replace(Regex("[\\\\/:*?\"<>|\\s]+"), "-").ifBlank { "skin.css" }

    private fun err(message: String): String =
        JSONObject().put("ok", false).put("reason", message).toString()
}
