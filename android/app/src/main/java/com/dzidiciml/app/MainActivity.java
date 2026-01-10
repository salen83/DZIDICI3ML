package com.dzidiciml.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DZIDICIML";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Globalni handler za crash-eve u Android delu
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception in thread " + thread.getName(), throwable);
        });

        super.onCreate(savedInstanceState);

        // Log kada se BridgeActivity startuje
        Log.i(TAG, "MainActivity created - BridgeActivity started");

        // Capacitor plugin registry log (opciono)
        for (Plugin plugin : getBridge().getPluginManager().getPlugins()) {
            Log.i(TAG, "Registered plugin: " + plugin.getId());
        }
    }
}
