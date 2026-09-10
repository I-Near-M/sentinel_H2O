/**
 * ============================================================================
 * PROYECTO: Sentinel-H2O — Calibración de Sensores
 * SENSOR: Nivel Ultrasónico Sumergible JSN-SR04T + DS18B20 (Compensación de T°)
 * MICROCONTROLADOR: ESP32 DevKit V1
 * ============================================================================
 * CONEXIONES Y DIVISOR DE TENSIÓN EN ECHO:
 *   - JSN-SR04T VCC  -> 5V (desde el LM2596S o pin VIN)
 *   - JSN-SR04T GND  -> GND común
 *   - JSN-SR04T TRIG -> GPIO 25 del ESP32 (Salida digital 3.3V)
 *   - JSN-SR04T ECHO -> Resistencia R1 (1k)
 *   - Del otro extremo de R1 -> Conectar a GPIO 26 del ESP32 (Entrada Echo)
 *   - Resistencia R2 (2k)    -> Entre GPIO 26 y GND
 *
 * EXPLICACIÓN DIVISOR ECHO 1k / 2k:
 *   V_esp32 = 5.0V * (2k / (1k + 2k)) = 5.0V * (2/3) = 3.33V (Protege el GPIO26).
 *
 * SENSOR DE TEMPERATURA PARA VELOCIDAD DEL SONIDO:
 *   - DS18B20 en GPIO 27 (con pull-up 4.7k a 3.3V)
 *   - Fórmula de velocidad del sonido: v = 331.4 + 0.606 * Temp_Ambiente (m/s)
 *
 * COMANDOS POR MONITOR SERIE (115200 baudios):
 *   "DIST <cm>" -> Ajusta calibración con distancia real medida con regla (ej: DIST 30.0)
 *   "ALT <cm>"  -> Define la altura fija del sensor sobre el fondo del canal (ej: ALT 150.0)
 *   'p'         -> Imprime reporte de parámetros para backend y firmware
 *   '0'         -> Resetea factor de calibración a 1.00 y offset a 0.0 cm
 * ============================================================================
 */

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const int PIN_TRIGGER  = 25;
const int PIN_ECHO     = 26;
const int PIN_ONEWIRE  = 27;

OneWire oneWire(PIN_ONEWIRE);
DallasTemperature sensorTemp(&oneWire);

// Parámetros de calibración física
float altura_fondo_cm   = 150.0f; // Altura de instalación sobre el lecho del canal
float offset_dist_cm    = 0.000f; // Offset de distancia en cm
float factor_distancia  = 1.000f; // Factor de corrección de escala

// Función de ordenamiento para mediana
void ordenarArray(float arr[], int n) {
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        float temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
}

// Medición de distancia con filtro de mediana de 7 disparos
float medirDistanciaCruda(float tempAmbiente) {
  float lecturas[10];
  int validas = 0;

  // Velocidad del sonido en cm/us según la temperatura
  // v (cm/us) = [331.4 + 0.606 * T] * 100 / 1,000,000
  float velSonido_cm_us = (331.4f + (0.606f * tempAmbiente)) * 100.0f / 1000000.0f;

  for (int i = 0; i < 7; i++) {
    digitalWrite(PIN_TRIGGER, LOW);
    delayMicroseconds(4);
    digitalWrite(PIN_TRIGGER, HIGH);
    delayMicroseconds(15);
    digitalWrite(PIN_TRIGGER, LOW);

    // Timeout de 35000 us (~6 metros de alcance)
    long duracionEco = pulseIn(PIN_ECHO, HIGH, 35000);

    if (duracionEco > 0) {
      // Distancia = (tiempo * velocidad) / 2
      float dist = (duracionEco * velSonido_cm_us) / 2.0f;
      // Rango operativo JSN-SR04T: 20 cm a 450 cm (zona ciega: < 20 cm)
      if (dist >= 15.0f && dist <= 500.0f) {
        lecturas[validas++] = dist;
      }
    }
    delay(20);
  }

  if (validas == 0) return 0.0f;

  ordenarArray(lecturas, validas);
  return lecturas[validas / 2];
}

void imprimirAyuda() {
  Serial.println("\n------------------------------------------------------------");
  Serial.println("  HERRAMIENTA DE CALIBRACIÓN JSN-SR04T (ESP32)");
  Serial.println("------------------------------------------------------------");
  Serial.println("  1. Coloca un obstáculo plano (ej. tabla o pared) frente al sensor.");
  Serial.println("  2. Mide la distancia exacta con una REGLA o flexómetro.");
  Serial.println("     (Nota: El sensor tiene una zona ciega de ~20 cm).");
  Serial.println("  3. Escribe 'DIST <cm>' con la distancia real (ej: DIST 45.5).");
  Serial.println("  4. Escribe 'ALT <cm>' con la altura de montaje en canal (ej: ALT 120.0).");
  Serial.println("  5. Presiona 'p' para obtener el reporte de calibración.");
  Serial.println("------------------------------------------------------------\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_TRIGGER, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIGGER, LOW);

  sensorTemp.begin();

  imprimirAyuda();
}

void loop() {
  // 1. Obtener temperatura ambiente para corregir velocidad del sonido
  sensorTemp.requestTemperatures();
  float tempAmb = sensorTemp.getTempCByIndex(0);
  if (tempAmb == DEVICE_DISCONNECTED_C || tempAmb < -10.0 || tempAmb > 80.0) {
    tempAmb = 20.0f; // Valor de respaldo
  }

  // 2. Medir distancia
  float distCruda = medirDistanciaCruda(tempAmb);

  // 3. Aplicar calibración
  float distCalibrada = (distCruda * factor_distancia) + offset_dist_cm;
  if (distCalibrada < 0.0f) distCalibrada = 0.0f;

  // 4. Calcular lámina de agua / tirante
  float tirante_cm = altura_fondo_cm - distCalibrada;
  if (tirante_cm < 0.0f) tirante_cm = 0.0f;

  // 5. Procesar comandos por Monitor Serie
  if (Serial.available() > 0) {
    String entrada = Serial.readStringUntil('\n');
    entrada.trim();

    if (entrada.startsWith("DIST ") || entrada.startsWith("dist ")) {
      float distRegla = entrada.substring(5).toFloat();
      if (distRegla >= 15.0f && distCruda > 10.0f) {
        offset_dist_cm = distRegla - distCruda;
        Serial.println("\n============================================================");
        Serial.printf("🎯 CALIBRACIÓN CON REGLA EXITOSA:\n");
        Serial.printf("   • Distancia con Regla : %.1f cm\n", distRegla);
        Serial.printf("   • Distancia por Eco   : %.1f cm\n", distCruda);
        Serial.printf("   • Nuevo Offset        : %+.2f cm\n", offset_dist_cm);
        Serial.println("============================================================\n");
      } else {
        Serial.println("\n⚠️ Distancia fuera de rango (mínimo 20 cm debido a zona ciega).");
      }
    }
    else if (entrada.startsWith("ALT ") || entrada.startsWith("alt ")) {
      float altNueva = entrada.substring(4).toFloat();
      if (altNueva > 20.0f) {
        altura_fondo_cm = altNueva;
        Serial.printf("\n✅ ALTURA SENSOR-FONDO ACTUALIZADA: %.1f cm\n\n", altura_fondo_cm);
      }
    }
    else if (entrada == "p" || entrada == "P") {
      Serial.println("\n============================================================");
      Serial.println("📋 PARÁMETROS FINALES DE NIVEL ULTRASÓNICO SENTINEL-H2O");
      Serial.println("============================================================");
      Serial.printf("Altura Sensor al Fondo (distancia_fondo_sensor_cm): %.1f cm\n", altura_fondo_cm);
      Serial.printf("Offset de Distancia (offset_dist_cm)              : %+.2f cm\n", offset_dist_cm);
      Serial.printf("Velocidad del sonido a %.1f °C                    : %.2f m/s\n",
                    tempAmb, 331.4f + (0.606f * tempAmb));
      Serial.println("\nValores para la Base de Datos (CalibracionNodo / backend):");
      Serial.printf("  distancia_fondo_sensor_cm = %.1f\n", altura_fondo_cm);
      Serial.println("============================================================\n");
    }
    else if (entrada == "0") {
      offset_dist_cm = 0.0f;
      factor_distancia = 1.0f;
      Serial.println("\n🔄 Calibración reseteada a fábrica.");
    }
  }

  // 6. Impresión en pantalla
  if (distCruda == 0.0f) {
    Serial.println("⚠️ Fuera de rango o sin eco (Objeto muy cerca < 20cm o muy lejos > 4.5m)");
  } else {
    Serial.printf("Temp: %4.1f °C | Dist Medida: %5.1f cm | Dist Calibrada: %5.1f cm | Tirante Agua: %5.1f cm\n",
                  tempAmb, distCruda, distCalibrada, tirante_cm);
  }

  delay(1000);
}
