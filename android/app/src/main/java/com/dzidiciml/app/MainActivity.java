package com.dzidiciml.app;

import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.app.AlertDialog;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DZIDICIML";

    @Override
    protected void onCreate(Bundle savedInstanceState) {

        // 1. Test da li uopšte možemo da pišemo fajl
        try {
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File file = new File(dir, "DZIDICIML_TEST.txt");

            FileWriter fw = new FileWriter(file, true);
            fw.write("APP START TEST OK\n");
            fw.close();
        } catch (Exception e) {
            showErrorDialog("FILE WRITE TEST FAILED:\n" + e.toString());
        }

        // 2. Globalni crash catcher
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            try {
                StringWriter sw = new StringWriter();
                PrintWriter pw = new PrintWriter(sw);
                throwable.printStackTrace(pw);

                String stack = sw.toString();

                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File file = new File(dir, "DZIDICIML_CRASH.txt");

                FileWriter fw = new FileWriter(file, true);
                fw.write("==== CRASH ====\n");
                fw.write(stack + "\n");
                fw.close();

                showErrorDialog(stack);

            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        super.onCreate(savedInstanceState);

        // 3. Popup da znamo da je bar dovde stiglo
        showErrorDialog("MainActivity.onCreate reached successfully!");
    }

    private void showErrorDialog(String message) {
        runOnUiThread(() -> {
            new AlertDialog.Builder(this)
                    .setTitle("DZIDICIML DEBUG")
                    .setMessage(message)
                    .setPositiveButton("OK", null)
                    .show();
        });
    }
}
