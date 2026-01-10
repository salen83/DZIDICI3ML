package com.dzidiciml.app;

import android.os.Bundle;
import android.util.Log;
import android.content.Context;
import java.io.FileOutputStream;
import java.io.IOException;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DZIDICIML";

    @Override
    public void onCreate(Bundle savedInstanceState) {

        // Probamo odmah da zabeležimo u log i fajl
        Log.i(TAG, "MainActivity onCreate START");

        try {
            String testLog = "App started, onCreate executed\n";
            FileOutputStream fos = openFileOutput("app_start_test.log", Context.MODE_PRIVATE);
            fos.write(testLog.getBytes());
            fos.close();
            Log.i(TAG, "Test log written to app_start_test.log");
        } catch (IOException e) {
            Log.e(TAG, "Error writing test log", e);
        }

        // Globalni handler za crash-eve
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception in thread " + thread.getName(), throwable);

            try {
                String crashLog = Log.getStackTraceString(throwable);
                FileOutputStream fos = openFileOutput("app_errors.log", Context.MODE_PRIVATE);
                fos.write(crashLog.getBytes());
                fos.close();
            } catch (IOException ioException) {
                Log.e(TAG, "Error writing crash log", ioException);
            }
        });

        super.onCreate(savedInstanceState);

        Log.i(TAG, "MainActivity created - BridgeActivity started");

        for (Plugin plugin : getBridge().getPluginManager().getPlugins()) {
            Log.i(TAG, "Registered plugin: " + plugin.getId());
        }
    }
}
