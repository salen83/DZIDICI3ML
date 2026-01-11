package com.dzidiciml.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DZIDICIML";
    private static final String LOG_FILE = "crash_log.txt";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Postavi globalni handler za sve neočekivane greške
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception in thread " + thread.getName(), throwable);
            writeCrashToFile(throwable);
        });

        super.onCreate(savedInstanceState);

        // Log kada se BridgeActivity startuje
        Log.i(TAG, "MainActivity created - BridgeActivity started");

        // Opcionalno: loguj sve registrovane Capacitor plugine
        for (Plugin plugin : getBridge().getPluginManager().getPlugins()) {
            Log.i(TAG, "Registered plugin: " + plugin.getId());
        }
    }

    // Upisuje stack trace u interni fajl
    private void writeCrashToFile(Throwable throwable) {
        try {
            File file = new File(getFilesDir(), LOG_FILE);
            FileOutputStream fos = new FileOutputStream(file, true); // append mode
            PrintWriter pw = new PrintWriter(fos);
            pw.println("----- CRASH at " + System.currentTimeMillis() + " -----");
            StringWriter sw = new StringWriter();
            PrintWriter stackPw = new PrintWriter(sw);
            throwable.printStackTrace(stackPw);
            pw.println(sw.toString());
            pw.println("--------------------------------------------------");
            pw.close();
            fos.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to write crash to file", e);
        }
    }
}
