/**
 * ============================================================================
 * PROYECTO: Sentinel-H2O — Monitoreo y Alerta Temprana en Cuenca Chancay-Huaral
 * MICROCONTROLADOR: ESP32 DevKit V1
 * MÓDULO CELULAR: SIM800L GSM/GPRS
 * SENSORES: PH-4502C, TS-300B, Keyestudio TDS V1.0, JSN-SR04T, DS18B20
 * ============================================================================
 */

#include <Arduino.h>
#include "config.h"
#include "sensors.h"
#include "gsm_manager.h"

SensorManager sensors;
GSMManager gsm;

// Contador de arranques persistente en memoria RTC del ESP32
RTC_DATA_ATTR int bootCount = 0;

void setup() {
    // 1. Iniciar puerto serie de depuración para monitor serie
    Serial.begin(115200);
    delay(500);

    bootCount++;
    Serial.println("\n==================================================");
    Serial.printf("🚀 SENTINEL-H2O | Nodo: %s | Ciclo #%d\n", NODE_ID, bootCount);
    Serial.println("==================================================");

    // 2. Inicializar subsistema de sensores
    Serial.println("⚙️ Inicializando sensores físicos...");
    sensors.init();

    // 3. Muestrear los 5 sensores físicos con filtrado digital
    Serial.println("📊 Muestreando canales analógicos y digitales...");
    RawSensorData data = sensors.sampleAllSensors();

    Serial.printf("   • Temp Agua (DS18B20):   %.2f °C\n", data.temp_c);
    Serial.printf("   • Distancia (JSN-SR04T): %.1f cm\n", data.raw_dist_cm);
    Serial.printf("   • Voltaje pH (PH-4502C): %.3f V\n", data.raw_v_ph);
    Serial.printf("   • Voltaje TDS (Keyest):  %.3f V\n", data.raw_v_tds);
    Serial.printf("   • Voltaje Turb (TS-300): %.3f V\n", data.raw_v_turb);
    Serial.printf("   • Batería Solar:         %.2f V\n", data.battery_v);

    // 4. Inicializar módem GSM SIM800L
    Serial.println("\n📡 Inicializando módem GSM SIM800L...");
    gsm.init();
    int rssi = gsm.getSignalRSSI();
    Serial.printf("   • Calidad de señal celular (CSQ): %d / 31\n", rssi);

    // 5. Construir el payload JSON para el backend FastAPI
    String payload = "{";
    payload += "\"node_id\":\"" + String(NODE_ID) + "\",";
    payload += "\"api_key\":\"" + String(NODE_API_KEY) + "\",";
    payload += "\"battery_v\":" + String(data.battery_v, 2) + ",";
    payload += "\"signal_rssi\":" + String(rssi) + ",";
    payload += "\"temp_c\":" + String(data.temp_c, 2) + ",";
    payload += "\"raw_dist_cm\":" + String(data.raw_dist_cm, 1) + ",";
    payload += "\"raw_v_ph\":" + String(data.raw_v_ph, 3) + ",";
    payload += "\"raw_v_tds\":" + String(data.raw_v_tds, 3) + ",";
    payload += "\"raw_v_turb\":" + String(data.raw_v_turb, 3) + ",";
    payload += "\"timestamp_ms\":" + String(millis());
    payload += "}";

    Serial.println("\n📦 JSON a transmitir:");
    Serial.println(payload);

    // 6. Conectar GPRS y transmitir telemetría
    Serial.println("\n🌐 Conectando a red GPRS...");
    bool gprs_connected = gsm.setupGPRS();
    bool post_success = false;

    if (gprs_connected) {
        Serial.println("📤 Enviando HTTP POST al Backend API...");
        post_success = gsm.sendTelemetryHTTPPost(payload);
        if (post_success) {
            Serial.println("✅ [TELEMETRÍA ENVIADA CON ÉXITO]");
        } else {
            Serial.println("❌ [ERROR]: El servidor no respondió 201 Created.");
        }
        gsm.closeGPRS();
    } else {
        Serial.println("❌ [ERROR]: No se pudo establecer conexión GPRS con el operador.");
    }

    // 7. Respaldo de Emergencia Offline (Edge Fallback)
    // Si falló el envío por internet y el agua presenta salinidad crítica (V_tds > 1.50V)
    if (!post_success && data.raw_v_tds >= TDS_CRITICAL_RAW_V) {
        Serial.println("\n⚠️ [EMERGENCIA OFFLINE ACTIVADA]: Falla de internet y salinidad crítica.");
        Serial.printf("📲 Despachando SMS de emergencia directo al Tomero: %s\n", EMERGENCY_TOMERO_PHONE);
        
        String sms_body = "ALERTA SENTINEL (" + String(NODE_ID) + "): Salinidad critica detectada y corte de internet. Cierre compuertas.";
        bool sms_ok = gsm.sendEmergencySMS(EMERGENCY_TOMERO_PHONE, sms_body);
        
        if (sms_ok) {
            Serial.println("✅ SMS de emergencia despachado con éxito.");
        } else {
            Serial.println("❌ Error enviando SMS de emergencia.");
        }
    }

    // 8. Apagar módem y entrar en Deep Sleep para ahorro de batería
    Serial.println("\n💤 Apagando periféricos y entrando en Deep Sleep...");
    gsm.powerDown();

    esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP_SEC * uS_TO_S_FACTOR);
    Serial.printf("😴 Durmiendo por %d segundos (15 minutos)...\n\n", TIME_TO_SLEEP_SEC);
    Serial.flush();
    
    esp_deep_sleep_start();
}

void loop() {
    // El loop no se ejecuta en arquitectura de Deep Sleep
}
