package br.meumei.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // O tamanho de fonte do Android aumentava todo o texto do WebView e
        // quebrava o layout; as telas seguem o tamanho do desenho.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
