#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// SENTINEL-H2O — CONFIGURACIÓN DE FIRMWARE DE NODO TELEMÉTRICO
// ============================================================================

// Identificación del Nodo (Asignado en la consola de Sentinel-H2O)
#define NODE_ID_DEFAULT         "NODE-CH-01"
#define API_KEY_DEFAULT         "sentinel_secret_chancay_key_2026"
#define BACKEND_INGEST_URL      "http://servidor-sentinel.juntachancay.pe/api/telemetry/ingest"

// ----------------------------------------------------------------------------
// ASIGNACIÓN DE PINES (PINOUT ESP32 DEVKIT V1)
// ----------------------------------------------------------------------------
#define PIN_PH_ANALOG           34    // ADC1_CH6: Sonda pH (PH-4502C)
#define PIN_TDS_ANALOG          35    // ADC1_CH7: Sensor Conductividad / TDS
#define PIN_TURBIDITY_ANALOG    32    // ADC1_CH4: Sensor Turbidez TS-300B (Divisor 20k/10k)
#define PIN_BATTERY_ANALOG      33    // ADC1_CH5: Divisor Batería 100k/10k (1:11)
#define PIN_ONEWIRE_TEMP        4     // GPIO 4: Sonda Digital DS18B20 (Pull-up 4.7k)
#define PIN_US_TRIG             18    // GPIO 18: Disparo Sensor Ultrasónico JSN-SR04T
#define PIN_US_ECHO             19    // GPIO 19: Retorno Sensor Ultrasónico (Divisor 5V->3V3)

// Módem Celular GSM/GPRS SIM800L (UART2)
#define PIN_GSM_RX              16    // ESP32 RX2 <- SIM800L TXD
#define PIN_GSM_TX              17    // ESP32 TX2 -> SIM800L RXD
#define PIN_GSM_RST             5     // Reset opcional para el módem

// APN del Operador Celular (Claro / Movistar / Entel / Bitel)
#define GSM_APN                 "claro.pe"
#define GSM_USER                "claro"
#define GSM_PASS                "claro"

// Intervalo de Muestreo y Envío (Ciclo de Deep Sleep)
#define SLEEP_INTERVAL_SECONDS  900   // 15 minutos entre ráfagas de telemetría

#endif // CONFIG_H
