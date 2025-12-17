package com.fedriveshare;

import android.app.Activity;
import android.graphics.Bitmap;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;

import vn.vnpt.ekyc.sdk.CccdScanner;
import vn.vnpt.ekyc.sdk.model.CccdResult;
import vn.vnpt.ekyc.sdk.model.SdkConfig;

public class VnptCccdModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "VnptCccdModule";
    private CccdScanner cccdScanner;

    public VnptCccdModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initializeSdk(ReadableMap config, Promise promise) {
        try {
            String accessToken = config.getString("accessToken");
            String tokenId = config.getString("tokenId");
            String tokenKey = config.getString("tokenKey");

            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }

            SdkConfig sdkConfig = new SdkConfig.Builder()
                    .setAccessToken(accessToken)
                    .setTokenId(tokenId)
                    .setTokenKey(tokenKey)
                    .setAutoCapture(true)
                    .setQualityThreshold(0.8f)
                    .build();

            cccdScanner = new CccdScanner(activity, sdkConfig);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void scanCccdFront(Promise promise) {
        scanCccd("front", promise);
    }

    @ReactMethod
    public void scanCccdBack(Promise promise) {
        scanCccd("back", promise);
    }

    @ReactMethod
    public void captureSelfie(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }

            if (cccdScanner == null) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized");
                return;
            }

            cccdScanner.captureSelfie(activity, new CccdScanner.SelfieCallback() {
                @Override
                public void onSuccess(Bitmap bitmap) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("image", bitmapToBase64(bitmap));
                    promise.resolve(result);
                }

                @Override
                public void onError(String error) {
                    promise.reject("CAPTURE_ERROR", error);
                }

                @Override
                public void onCancel() {
                    promise.reject("USER_CANCELLED", "User cancelled selfie capture");
                }
            });
        } catch (Exception e) {
            promise.reject("CAPTURE_ERROR", e.getMessage());
        }
    }

    private void scanCccd(String side, Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }

            if (cccdScanner == null) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized");
                return;
            }

            cccdScanner.scanCccd(activity, side.equals("front"), new CccdScanner.ScanCallback() {
                @Override
                public void onSuccess(CccdResult result) {
                    WritableMap map = Arguments.createMap();
                    map.putBoolean("success", true);
                    map.putString("image", bitmapToBase64(result.getImage()));
                    map.putDouble("quality", result.getQuality());
                    map.putBoolean("isRealCard", result.isRealCard());
                    
                    if (result.getOcrData() != null) {
                        WritableMap ocrData = Arguments.createMap();
                        ocrData.putString("id", result.getOcrData().getId());
                        ocrData.putString("name", result.getOcrData().getName());
                        ocrData.putString("dob", result.getOcrData().getDateOfBirth());
                        ocrData.putString("address", result.getOcrData().getAddress());
                        map.putMap("ocrData", ocrData);
                    }
                    
                    promise.resolve(map);
                }

                @Override
                public void onError(String error) {
                    promise.reject("SCAN_ERROR", error);
                }

                @Override
                public void onCancel() {
                    promise.reject("USER_CANCELLED", "User cancelled scan");
                }
            });
        } catch (Exception e) {
            promise.reject("SCAN_ERROR", e.getMessage());
        }
    }

    private String bitmapToBase64(Bitmap bitmap) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream);
        byte[] imageBytes = outputStream.toByteArray();
        return Base64.encodeToString(imageBytes, Base64.NO_WRAP);
    }
}
