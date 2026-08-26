package com.liftday.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class LiftDayWidgetReceiver extends AppWidgetProvider {
    private static final String SNAPSHOT = "liftday_widget_snapshot";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        updateAll(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        updateAll(context);
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, LiftDayWidgetReceiver.class));
        for (int id : ids) manager.updateAppWidget(id, buildViews(context));
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.liftday_widget);
        String phase = "rest-day";
        String title = "REST DAY";
        String raw = context.getSharedPreferences("liftday", Context.MODE_PRIVATE).getString(SNAPSHOT, null);
        if (raw != null) {
            try {
                JSONObject snapshot = new JSONObject(raw);
                phase = snapshot.optString("phase", phase);
                title = snapshot.optString("exerciseName", title);
                if ("rest-day".equals(phase)) title = "REST DAY";
            } catch (Exception ignored) {
            }
        }
        views.setTextViewText(R.id.widget_title, title);
        setLaunchAction(context, views, R.id.widget_root, null);
        setAction(context, views, R.id.widget_done, "done", "warmup-stretch".equals(phase));
        setAction(context, views, R.id.widget_busy, "busy", "exercise-ready".equals(phase));
        setAction(context, views, R.id.widget_log, "log", "exercise-ready".equals(phase));
        setAction(context, views, R.id.widget_skip, "skip-rest", "resting".equals(phase));
        setAction(context, views, R.id.widget_repeat, "repeat", "cooldown-choice".equals(phase));
        setAction(context, views, R.id.widget_end, "end", "cooldown-choice".equals(phase));
        return views;
    }

    private static void setAction(Context context, RemoteViews views, int id, String action, boolean visible) {
        views.setViewVisibility(id, visible ? android.view.View.VISIBLE : android.view.View.GONE);
        if (visible) setLaunchAction(context, views, id, action);
    }

    private static void setLaunchAction(Context context, RemoteViews views, int id, String action) {
        Intent intent = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (action != null) intent.putExtra(MainActivity.WIDGET_ACTION, action);
        int requestCode = action == null ? 0 : action.hashCode();
        PendingIntent pending = PendingIntent.getActivity(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(id, pending);
    }
}
