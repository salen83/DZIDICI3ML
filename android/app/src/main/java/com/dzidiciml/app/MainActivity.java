package com.dzidiciml.app;

import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileWriter;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DZIDICIML";

    @Override
    public void onCreate(Bundle savedInstanceState) {

        // Globalni handler za sve crash-eve
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            try {
                JSONObject json = new JSONObject();
                json.put("thread", thread.getName());
                json.put("message", throwable.getMessage());
                json.put("stacktrace", Log.getStackTraceString(throwable));

                File folder = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "DZIDICIML");
                if (!folder.exists()) folder.mkdirs();
                File file = new File(folder, "crash_log.json");

                FileWriter writer = new FileWriter(file, true); // dodaj na kraj fajla
                writer.write(json.toString() + "\n");
                writer.close();
            } catch (Exception e) {
                Log.e(TAG, "Failed to write crash log", e);
            }

            Log.e(TAG, "Uncaught exception in thread " + thread.getName(), throwable);

            // Ovu liniju obavezno pozvati da sistem završi crash
            System.exit(1);
        });

        super.onCreate(savedInstanceState);

        // Opcionalno: log plugin-ova
        for (Plugin plugin : getBridge().getPluginManager().getPlugins()) {
            Log.i(TAG, "Registered plugin: " + plugin.getId());
        }
    }
}
