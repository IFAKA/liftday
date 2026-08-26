package com.liftday.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

public class MainActivity extends Activity {
    static final String APP_ORIGIN = "https://liftday.vercel.app";
    static final String WIDGET_ACTION = "liftday.widget.action";

    private WebView webView;
    private String pendingAction;
    private boolean nativeReady;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri.toString().startsWith(APP_ORIGIN)) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });
        setContentView(webView);
        connectBridge();
        enqueueWidgetAction(getIntent());
        if (state == null) webView.loadUrl(APP_ORIGIN);
        else webView.restoreState(state);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        enqueueWidgetAction(intent);
    }

    private void enqueueWidgetAction(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra(WIDGET_ACTION);
        if (action == null) return;
        pendingAction = action;
        flushPendingAction();
    }

    private void connectBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
        WebViewCompat.addWebMessageListener(webView, "liftday", java.util.Collections.singleton(APP_ORIGIN),
                (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                    String data = message.getData();
                    if (data == null) return;
                    try {
                        JSONObject value = new JSONObject(data);
                        String type = value.optString("type");
                        if ("liftday.native-ready".equals(type)) {
                            nativeReady = true;
                            flushPendingAction();
                        } else if ("liftday.snapshot".equals(type)) {
                            getSharedPreferences("liftday", MODE_PRIVATE)
                                    .edit()
                                    .putString("liftday_widget_snapshot", data)
                                    .apply();
                            LiftDayWidgetReceiver.updateAll(MainActivity.this);
                        }
                    } catch (Exception ignored) {
                    }
                });
    }

    private void flushPendingAction() {
        if (!nativeReady || pendingAction == null || webView == null) return;
        try {
            String message = new JSONObject()
                    .put("type", "liftday.action")
                    .put("schemaVersion", 1)
                    .put("eventId", "native-" + System.currentTimeMillis())
                    .put("action", pendingAction)
                    .toString();
            WebViewCompat.postWebMessage(webView, new WebMessageCompat(message), Uri.parse(APP_ORIGIN));
            pendingAction = null;
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
