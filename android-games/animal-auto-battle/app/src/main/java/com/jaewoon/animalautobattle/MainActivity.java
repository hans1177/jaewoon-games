// 파일명: android-games/animal-auto-battle/app/src/main/java/com/jaewoon/animalautobattle/MainActivity.java
package com.jaewoon.animalautobattle;

// 임포트: 기존 Android WebView 구조를 게임 전용 보안 경계에 맞게 적용
import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String GAME_URL =
            "https://hans1177.github.io/jaewoon-games/web-games/animal-auto-battle/";
    private static final String GAME_HOST = "hans1177.github.io";
    private static final String GAME_PATH = "/jaewoon-games/web-games/animal-auto-battle/";
    private WebView game;
    private ProgressBar progress;
    private LinearLayout connectionError;
    private boolean pageFailed;

    // 메인: 웹게임 단일 정본의 상점·전투·저장을 그대로 사용한다.
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(16, 29, 36));
        getWindow().setNavigationBarColor(Color.rgb(16, 29, 36));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(16, 29, 36));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });

        game = new WebView(this);
        root.addView(game, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(progress, new FrameLayout.LayoutParams(-1, 6, Gravity.TOP));

        connectionError = new LinearLayout(this);
        connectionError.setGravity(Gravity.CENTER);
        connectionError.setOrientation(LinearLayout.VERTICAL);
        connectionError.setPadding(32, 18, 32, 18);
        connectionError.setBackgroundColor(Color.rgb(16, 29, 36));
        TextView message = new TextView(this);
        message.setText("게임에 연결할 수 없어\n인터넷 연결을 확인해.");
        message.setTextSize(18);
        message.setTextColor(Color.WHITE);
        message.setGravity(Gravity.CENTER);
        connectionError.addView(message);
        Button retry = new Button(this);
        retry.setText("다시 연결");
        retry.setOnClickListener(view -> {
            connectionError.setVisibility(View.GONE);
            game.loadUrl(GAME_URL);
        });
        connectionError.addView(retry);
        connectionError.setVisibility(View.GONE);
        root.addView(connectionError, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        configureGame();
        if (savedInstanceState == null || game.restoreState(savedInstanceState) == null) {
            game.loadUrl(GAME_URL);
        }
    }

    // 보안: 정확한 GitHub Pages 게임 경로만 앱 내부에서 허용한다.
    private boolean trustedGame(Uri uri) {
        return uri != null
                && "https".equalsIgnoreCase(uri.getScheme())
                && GAME_HOST.equalsIgnoreCase(uri.getHost())
                && uri.getPath() != null
                && (GAME_PATH.equals(uri.getPath())
                    || (GAME_PATH + "index.html").equals(uri.getPath())
                    || (GAME_PATH + "privacy.html").equals(uri.getPath()));
    }

    private void configureGame() {
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " JaewoonAnimalBattle/1.0");
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(game, false);
        WebView.setWebContentsDebuggingEnabled(false);

        game.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int percent) {
                progress.setProgress(percent);
                progress.setVisibility(percent >= 100 ? View.GONE : View.VISIBLE);
            }
        });
        game.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap icon) {
                pageFailed = false;
                connectionError.setVisibility(View.GONE);
                progress.setVisibility(View.VISIBLE);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                if (pageFailed) connectionError.setVisibility(View.VISIBLE);
            }
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    pageFailed = true;
                    connectionError.setVisibility(View.VISIBLE);
                }
            }
            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                    pageFailed = true;
                    connectionError.setVisibility(View.VISIBLE);
                }
            }
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                pageFailed = true;
                connectionError.setVisibility(View.VISIBLE);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (trustedGame(uri)) return false;
                if ("https".equalsIgnoreCase(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                        // 외부 브라우저가 없으면 링크만 차단
                    }
                }
                return true;
            }
        });
    }

    // 저장: 앱 회전과 재진입에서는 웹 상태를 유지한다.
    @Override
    protected void onSaveInstanceState(Bundle state) {
        game.saveState(state);
        super.onSaveInstanceState(state);
    }
    @Override
    protected void onPause() {
        if (game != null) game.onPause();
        super.onPause();
    }
    @Override
    protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
    }
    @Override
    public void onBackPressed() {
        if (connectionError != null && connectionError.getVisibility() == View.VISIBLE) {
            connectionError.setVisibility(View.GONE);
            game.loadUrl(GAME_URL);
        } else if (game != null && game.canGoBack()) {
            game.goBack();
        } else {
            super.onBackPressed();
        }
    }
    @Override
    protected void onDestroy() {
        if (game != null) {
            game.stopLoading();
            game.clearHistory();
            game.removeAllViews();
            game.destroy();
            game = null;
        }
        super.onDestroy();
    }
}
