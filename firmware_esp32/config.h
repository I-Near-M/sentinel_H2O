#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ============================================================================
// 1. IDENTIFICACIÓN Y AUTENTICACIÓN DEL NODO IOT
// ============================================================================
// Credenciales generadas para la estación telemétrica
#define NODE_ID "NODO-748-VALLE"
#define NODE_API_KEY "sec_key_nodo_748_valle_3c6604c87d080daca2be1c27"

// ============================================================================
// 2. CONFIGURACIÓN DEL SERVIDOR Y ENDPOINT
// ============================================================================
// IP directa del VPS (Evita demoras de DNS y SSL en redes 2G)
#define SERVER_HOST "217.216.94.194"
#define SERVER_PORT 80
#define SERVER_PATH "/api/v1/telemetry/"

// ============================================================================
// 3. MAPEO DE PINES (PINOUT) - ESP32 DEVKIT V1
// ============================================================================
// Sensores Analógicos (ADC1 para compatibilidad total con Wi-Fi/GSM)
#define PIN_PH_ANALOG       32  // ADC1_CH4: Entrada analógica módulo PH-4502C (Po)
#define PIN_TURB_ANALOG     33  // ADC1_CH5: Entrada analógica módulo TS-300B (con divisor 10k/20k)
#define PIN_TDS_ANALOG      34  // ADC1_CH6: Entrada analógica módulo Keyestudio TDS V1.0
#define PIN_BATTERY_ANALOG  35  // ADC1_CH7: Divisor de tensión para Batería Opalux 12V (100k/22k)

// Sensor Ultrasónico de Nivel de Agua (JSN-SR04T / C)
#define PIN_TRIG            25  // Salida digital Trigger para JSN-SR04T
#define PIN_ECHO            26  // Entrada digital Echo (con divisor 1k/2k)

// Sensor Digital de Temperatura (DS18B20 1-Wire)
#define PIN_ONE_WIRE_BUS    27  // Bus 1-Wire para DS18B20 (con pull-up 4.7k a 3.3V)

// Interfaz UART2 con Módem GSM SIM800L
#define PIN_GSM_RX          16  // ESP32 RX2 <- Conectar a SIM800L TXD
#define PIN_GSM_TX          17  // ESP32 TX2 -> Conectar a SIM800L RXD
#define PIN_GSM_RST         4   // Pin digital reset de hardware SIM800L (opcional)

// ============================================================================
// 4. CONFIGURACIÓN GPRS (MOVISTAR PERÚ 2G / GSM)
// ============================================================================
// Parámetros de red 2G Movistar Perú
#define GPRS_APN            "movistar.pe"
#define GPRS_USER           "movistar@datos"
#define GPRS_PASS           "movistar"

// ============================================================================
// 5. PARÁMETROS DEL SISTEMA DE ENERGÍA SOLAR (BATERÍA 12V OPALUX)
// ============================================================================
// Factor de calibración: con divisor 100k (a +12V) y 10k (a GND) -> Factor = (100+10)/10 = 11.0
#define BATTERY_DIVIDER_FACTOR 11.0000f
#define BATTERY_MIN_VOLTAGE    11.50f  // Umbral de alerta por batería baja en 12V

// ============================================================================
// 6. GESTIÓN DE ENERGÍA Y DEEP SLEEP
// ============================================================================
#define TIME_TO_SLEEP_SEC   900         // 15 minutos = 900 segundos
#define uS_TO_S_FACTOR      1000000ULL  // Factor microsegundos a segundos

// ============================================================================
// 7. RESPALDO DE EMERGENCIA OFFLINE POR SMS (EDGE FALLBACK)
// ============================================================================
#define EMERGENCY_TOMERO_PHONE "+51987654321" // Número del tomero local de guardia
#define TDS_CRITICAL_RAW_V     1.50           // Voltaje crudo TDS equivalente a salinidad extrema

#endif // CONFIG_H
