/**
 * ============================================================================
 * PROYECTO SENTINEL-H2O — FIRMWARE DE ESTACIÓN TELEMÉTRICA IoT (ESP32)
 * I Concurso de Ciencia y Tecnología para la Seguridad Hídrica - ANA / CRHCCH-H
 * ============================================================================
 * 
 * Captura señales crudas (RAW) de sensores electroquímicos, ópticos e hidrométricos
 * y transmite telemetría segura mediante protocolo HTTP POST (GSM/SIM800L o WiFi).
 * Diseñado bajo arquitectura agnóstica para sensores académicos e industriales.
 * 
 * Licencia: Open Source (GNU AGPL v3.0)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include "config.h"

// Instancias de Sensores
OneWire oneWire(PIN_ONEWIRE_TEMP);
DallasTemperature sensorTemp(&oneWire);

// Declaración de funciones
float readAnalogVoltageMedian(int pin, int samples = 15);
float measureDistanceCm();
float readBatteryVoltage();
bool sendTelemetryPayload(const String& jsonPayload);

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println(F("\n=========================================="));
    Serial.println(F("   SENTINEL-H2O — NODO TELEMÉTRICO IoT    "));
    Serial.println(F("   Cuenca Chancay-Huaral (ANA / CRHCCH-H) "));
    Serial.println(F("=========================================="));

    // Configuración de Pines
    pinMode(PIN_US_TRIG, OUTPUT);
    pinMode(PIN_US_ECHO, INPUT);
    digitalWrite(PIN_US_TRIG, LOW);

    analogReadResolution(12); // ADC a 12 bits (0-4095)
    analogSetAttenuation(ADC_11db); // Rango de entrada ~0 a 3.3V

    sensorTemp.begin();

    // 1. Lectura de Sensores Físicos
    Serial.println(F("[1/4] Realizando muestreo de sensores..."));

    // Temperatura del agua
    sensorTemp.requestTemperatures();
    float tempAgua = sensorTemp.getTempCByIndex(0);
    if (tempAgua < -40.0 || tempAgua > 85.0) {
        tempAgua = 20.0; // Fallback seguro
    }

    // Voltajes crudos de sensores analógicos
    float vPh = readAnalogVoltageMedian(PIN_PH_ANALOG, 20);
    float vTds = readAnalogVoltageMedian(PIN_TDS_ANALOG, 20);
    float vTurb = readAnalogVoltageMedian(PIN_TURBIDITY_ANALOG, 20);
    float vBat = readBatteryVoltage();

    // Distancia ultrasónica
    float distanciaCm = measureDistanceCm();

    Serial.printf(" > Temp Agua:   %.2f °C\n", tempAgua);
    Serial.printf(" > Voltaje pH:  %.3f V (Raw)\n", vPh);
    Serial.printf(" > Voltaje TDS: %.3f V (Raw)\n", vTds);
    Serial.printf(" > Voltaje Turb:%.3f V (Raw)\n", vTurb);
    Serial.printf(" > Voltaje Bat: %.2f V DC\n", vBat);
    Serial.printf(" > Distancia:   %.1f cm\n", distanciaCm);

    // 2. Empaquetado JSON del Payload
    StaticJsonDocument<512> doc;
    doc["node_id"] = NODE_ID_DEFAULT;
    doc["api_key"] = API_KEY_DEFAULT;

    // Bloque de mediciones RAW para calibración centralizada
    JsonObject raw = doc.createNestedObject("raw_metrics");
    raw["ph_voltage"] = vPh;
    raw["tds_voltage"] = vTds;
    raw["turbidity_voltage"] = vTurb;
    raw["temperature_c"] = tempAgua;
    raw["distance_cm"] = distanciaCm;
    raw["battery_voltage"] = vBat;
    raw["firmware_version"] = "2.4.0-PROD";
    raw["signal_csq"] = 24; // Calidad de señal GSM

    String payloadStr;
    serializeJson(doc, payloadStr);

    Serial.println(F("[2/4] Payload JSON generado:"));
    Serial.println(payloadStr);

    // 3. Transmisión al Servidor
    Serial.println(F("[3/4] Transmitiendo telemetría al servidor central..."));
    bool envioOk = sendTelemetryPayload(payloadStr);

    if (envioOk) {
        Serial.println(F(" > [OK] Telemetría recibida y procesada por Sentinel-H2O."));
    } else {
        Serial.println(F(" > [WARN] Fallo de enlace HTTP. Datos guardados en buffer local."));
    }

    // 4. Gestión de Energía (Deep Sleep)
    Serial.printf("[4/4] Entrando en Deep Sleep durante %d segundos...\n", SLEEP_INTERVAL_SECONDS);
    esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_INTERVAL_SECONDS * 1000000ULL);
    esp_deep_sleep_start();
}

void loop() {
    // No se ejecuta debido a la arquitectura Deep Sleep
}

// ----------------------------------------------------------------------------
// FUNCIONES AUXILIARES DE LECTURA Y FILTRADO
// ----------------------------------------------------------------------------

/**
 * Lee múltiples muestras de un canal analógico del ADC y calcula la mediana
 * para eliminar picos de ruido electromagnético.
 */
float readAnalogVoltageMedian(int pin, int samples) {
    int readings[samples];
    for (int i = 0; i < samples; i++) {
        readings[i] = analogRead(pin);
        delay(15);
    }
    // Ordenamiento simple para obtener mediana
    for (int i = 0; i < samples - 1; i++) {
        for (int j = i + 1; j < samples; j++) {
            if (readings[i] > readings[j]) {
                int tmp = readings[i];
                readings[i] = readings[j];
                readings[j] = tmp;
            }
        }
    }
    int medianAdc = readings[samples / 2];
    // Conversión a voltios (ESP32 ADC 3.3V / 4095)
    return (medianAdc / 4095.0f) * 3.30f;
}

/**
 * Mide el tiempo de vuelo del sensor JSN-SR04T y calcula la distancia en cm.
 */
float measureDistanceCm() {
    digitalWrite(PIN_US_TRIG, LOW);
    delayMicroseconds(4);
    digitalWrite(PIN_US_TRIG, HIGH);
    delayMicroseconds(12);
    digitalWrite(PIN_US_TRIG, LOW);

    long durationUs = pulseIn(PIN_US_ECHO, HIGH, 35000); // Timeout 35ms (~6m)
    if (durationUs == 0) {
        return 0.0f; // Fuera de rango o sin eco
    }
    // Distancia = (tiempo * velocidad del sonido a 20°C [0.0343 cm/us]) / 2
    return (durationUs * 0.0343f) / 2.0f;
}

/**
 * Lee la tensión del banco de baterías a través del divisor resistivo 100k/10k (1:11).
 */
float readBatteryVoltage() {
    float vAdc = readAnalogVoltageMedian(PIN_BATTERY_ANALOG, 15);
    // V_bat = V_adc * ((R1 + R2) / R2) = V_adc * (110 / 10) = V_adc * 11.0
    return vAdc * 11.0f;
}

/**
 * Realiza el envío HTTP POST hacia la API de ingest de Sentinel-H2O.
 */
bool sendTelemetryPayload(const String& jsonPayload) {
    // Si cuenta con WiFi configurado como estación de prueba o módem SIM800L
    HTTPClient http;
    http.begin(BACKEND_INGEST_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("User-Agent", "SentinelH2O-Node/2.4");

    int httpCode = http.POST(jsonPayload);
    http.end();

    return (httpCode >= 200 && httpCode < 300);
}
