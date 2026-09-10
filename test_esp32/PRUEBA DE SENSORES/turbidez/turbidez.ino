/**
 * ============================================================================
 * PROYECTO: Sentinel-H2O — Calibración de Sensores
 * SENSOR: Sensor Óptico de Turbidez TS-300B
 * MICROCONTROLADOR: ESP32 DevKit V1
 * ============================================================================
 * CONEXIONES Y DIVISOR DE TENSIÓN:
 *   - VCC módulo TS-300B -> 5V (desde el LM2596S o pin VIN)
 *   - GND módulo TS-300B -> GND común
 *   - Pin Señal Analógica del TS-300B -> Conectar a Resistencia R1 (10k)
 *   - Desde el otro extremo de R1 -> Conectar a GPIO 33 del ESP32 (ADC1_CH5)
 *   - Resistencia R2 (20k) -> Entre GPIO 33 y GND
 *
 * EXPLICACIÓN DIVISOR 10k / 20k:
 *   V_esp32 = V_sensor * (20k / (10k + 20k)) = V_sensor * (2/3)
 *   V_sensor = V_esp32 * (30k / 20k) = V_esp32 * 1.50
 *   (Protege el pin GPIO33: Si el sensor entrega 5.0V, al pin entran max 3.33V).
 *
 * MUESTRAS DE PRUEBA:
 *   1. Agua de grifo (Agua limpia / 0 NTU)
 *   2. Café cargado (Máxima turbidez / saturación óptica)
 *   3. Agua con tierra/sedimentos (Turbidez intermedia de canal de riego)
 *
 * COMANDOS POR MONITOR SERIE (115200 baudios):
 *   'c' -> Calibrar AGUA LIMPIA (grifo): Guarda V_clear y calcula factor de corrección
 *   't' -> Calibrar CAFÉ CARGADO (turbidez máxima): Guarda V_turbid
 *   'p' -> Imprimir reporte de parámetros para backend y firmware
 *   'r' -> Restaurar valores por defecto (V_clear: 4.20V, V_turbid: 2.50V)
 * ============================================================================
 */

#include <Arduino.h>

const int PIN_TURBIDEZ = 33; // ADC1_CH5

// Factor del divisor resistivo (10k y 20k)
const float FACTOR_DIVISOR = 1.5000f; // (10k + 20k) / 20k

// Parámetros de calibración del sensor
float turb_v_clear  = 4.200f; // Voltaje reconstruido del sensor en agua limpia
float turb_v_turbid = 2.500f; // Voltaje reconstruido del sensor en café cargado / turbio
float factor_f_paper = 4.200f / 3.790f; // Factor 'f' del paper Guerrero et al. (HACH)

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

// Lectura de voltaje en el pin del ESP32 con filtrado
float leerVoltajePin(int muestras = 50) {
  float lecturas[60];
  if (muestras > 60) muestras = 60;

  for (int i = 0; i < muestras; i++) {
    lecturas[i] = analogReadMilliVolts(PIN_TURBIDEZ) / 1000.0f;
    delay(2);
  }

  ordenarArray(lecturas, muestras);
  return lecturas[muestras / 2]; // Mediana
}

// Cálculo según Modelo 1: Ecuación polinómica calibrada con turbidímetro HACH (Paper Guerrero et al.)
float calcularNTU_Paper(float vSensor) {
  float vCorregido = vSensor * factor_f_paper;

  if (vCorregido >= 4.20f) {
    return 0.0f;
  } else if (vCorregido < 3.00f) {
    return 500.0f; // Límite de saturación del modelo analizado
  } else {
    float ntu = (447.76f * (vCorregido * vCorregido)) - (3703.3f * vCorregido) + 7658.2f;
    return (ntu < 0.0f) ? 0.0f : ntu;
  }
}

// Cálculo según Modelo 2: Modelo Sentinel-H2O (Backend processor.py, 0 a 3000 NTU)
float calcularNTU_Sentinel(float vSensor) {
  if (vSensor >= turb_v_clear) return 0.5f;
  if (turb_v_clear <= turb_v_turbid) return 10.0f;

  float fraccion = (turb_v_clear - vSensor) / (turb_v_clear - turb_v_turbid);
  if (fraccion < 0.0f) fraccion = 0.0f;
  if (fraccion > 1.0f) fraccion = 1.0f;

  return pow(fraccion, 1.3f) * 3000.0f;
}

void imprimirMenu() {
  Serial.println("\n------------------------------------------------------------");
  Serial.println("  HERRAMIENTA DE CALIBRACIÓN TURBIDEZ TS-300B (ESP32)");
  Serial.println("------------------------------------------------------------");
  Serial.println("  1. Sumerge la sonda en AGUA DE GRIFO (limpia).");
  Serial.println("     Presiona 'c' para calibrar el CERO (Agua limpia).");
  Serial.println("  2. Sumerge la sonda en CAFÉ CARGADO (turbidez máxima).");
  Serial.println("     Presiona 't' para calibrar el FONDO DE ESCALA.");
  Serial.println("  3. Prueba con agua con sedimentos/tierra.");
  Serial.println("  4. Presiona 'p' para obtener los parámetros de Sentinel-H2O.");
  Serial.println("------------------------------------------------------------\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  imprimirMenu();
}

void loop() {
  // 1. Leer voltaje físico en el pin GPIO33 del ESP32
  float vPin = leerVoltajePin(40);

  // 2. Reconstruir voltaje real del sensor (antes del divisor de 10k y 20k)
  float vSensor = vPin * FACTOR_DIVISOR;

  // 3. Procesar comandos por Monitor Serie
  if (Serial.available() > 0) {
    char cmd = Serial.read();

    if (cmd == 'c' || cmd == 'C') {
      turb_v_clear = vSensor;
      factor_f_paper = 4.200f / turb_v_clear;
      Serial.println("\n============================================================");
      Serial.printf("✅ CALIBRACIÓN AGUA LIMPIA EXITOSA:\n");
      Serial.printf("   • Voltaje en Pin ESP32 (GPIO33) : %.3f V\n", vPin);
      Serial.printf("   • Voltaje Reconstruido Sensor    : %.3f V (V_clear)\n", turb_v_clear);
      Serial.printf("   • Factor 'f' (Paper HACH)        : %.4f\n", factor_f_paper);
      Serial.println("============================================================\n");
    }
    else if (cmd == 't' || cmd == 'T') {
      turb_v_turbid = vSensor;
      Serial.println("\n============================================================");
      Serial.printf("✅ CALIBRACIÓN CAFÉ CARGADO (MÁXIMA TURBIDEZ) EXITOSA:\n");
      Serial.printf("   • Voltaje en Pin ESP32 (GPIO33) : %.3f V\n", vPin);
      Serial.printf("   • Voltaje Reconstruido Sensor    : %.3f V (V_turbid)\n", turb_v_turbid);
      Serial.println("============================================================\n");
    }
    else if (cmd == 'p' || cmd == 'P') {
      Serial.println("\n============================================================");
      Serial.println("📋 PARÁMETROS FINALES DE CALIBRACIÓN TURBIDEZ SENTINEL-H2O");
      Serial.println("============================================================");
      Serial.printf("Voltaje Agua Limpia (turb_v_clear)   : %.3f V\n", turb_v_clear);
      Serial.printf("Voltaje Café/Turbio (turb_v_turbid)  : %.3f V\n", turb_v_turbid);
      Serial.printf("Factor Divisor Resistivo             : %.4f (10k / 20k)\n", FACTOR_DIVISOR);
      Serial.println("\nValores para la Base de Datos (CalibracionNodo / backend):");
      Serial.printf("  turb_v_clear  = %.3f\n", turb_v_clear);
      Serial.printf("  turb_v_turbid = %.3f\n", turb_v_turbid);
      Serial.println("============================================================\n");
    }
    else if (cmd == 'r' || cmd == 'R') {
      turb_v_clear = 4.200f;
      turb_v_turbid = 2.500f;
      factor_f_paper = 4.200f / 3.790f;
      Serial.println("\n🔄 Parámetros de turbidez reseteados a valores por defecto.");
    }
  }

  // 4. Calcular turbidez con ambos modelos
  float ntuPaper = calcularNTU_Paper(vSensor);
  float ntuSentinel = calcularNTU_Sentinel(vSensor);

  // 5. Mostrar en monitor serie
  Serial.printf("V_pin: %5.3f V | V_sensor: %5.3f V | Paper: %5.1f NTU | Sentinel: %6.1f NTU | Estado: ",
                vPin, vSensor, ntuPaper, ntuSentinel);

  if (ntuSentinel < 5.0f) {
    Serial.println("🟢 AGUA CRISTALINA (Potable/Apta)");
  } else if (ntuSentinel <= 50.0f) {
    Serial.println("🟡 TURBIDEZ MEDIA (Riego normal)");
  } else {
    Serial.println("🔴 TURBIDEZ ELEVADA (Sedimentos/Riesgo de colmatación)");
  }

  delay(1000);
}
