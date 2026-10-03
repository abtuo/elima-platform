package ci.elima.revision;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RevisionBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
