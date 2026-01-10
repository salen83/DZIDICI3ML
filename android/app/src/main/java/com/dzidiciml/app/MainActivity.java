package com.dzidiciml.app;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DZIDICIML";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Hvatanje crash-eva i zapis u log fajl
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception in thread " + thread.getName(), throwable);

            try {
                StringWriter sw = new StringWriter();
                PrintWriter pw = new PrintWriter(sw);
                throwable.printStackTrace(pw);
                String stackTrace = sw.toString();

                FileOutputStream fos = openFileOutput("app_errors.log", Context.MODE_APPEND);
                fos.write((stackTrace + "\n\n").getBytes());
                fos.close();
            } catch (Exception e) {
                e.printStackTrace();
            }

            // Završi proces
            System.exit(1);
        });

        super.onCreate(savedInstanceState);

        Log.i(TAG, "MainActivity created - BridgeActivity started");

        for (Plugin plugin : getBridge().getPluginManager().getPlugins()) {
            Log.i(TAG, "Registered plugin: " + plugin.getId());
        }
    }
}
