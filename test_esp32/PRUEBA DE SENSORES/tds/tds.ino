/**
 * ============================================================================
 * PROYECTO: Sentinel-H2O — Calibración de Sensores
 * SENSOR: TDS / Salinidad (Keyestudio TDS V1.0 / DFRobot) + DS18B20 Temp
 * MICROCONTROLADOR: ESP32 DevKit V1
 * ============================================================================
 * CONEXIONES:
 *   - TDS VCC  -> 3V3 del ESP32 (3.3V limpios)
 *   - TDS GND  -> GND común
 *   - TDS AOUT -> GPIO 34 del ESP32 (ADC1_CH6)
 *   - DS18B20 DATA -> GPIO 27 del ESP32 (con resistencia PULL-UP 4.7k a 3.3V)
 *   - DS18B20 VCC  -> 3V3 del ESP32
 *   - DS18B20 GND  -> GND común
 *
 * MUESTRA DE CALIBRACIÓN:
 *   - Solución estándar de Cloruro de Potasio (KCl)
 *     (Normalmente 1413 uS/cm = ~707 ppm a 25°C)
 *
 * COMANDOS POR MONITOR SERIE (115200 baudios):
 *   "CAL <ppm>" -> Calibra con solución estándar en ppm (ej. escribir: CAL 707)
 *   "EC <us/cm>"-> Calibra con solución estándar en uS/cm (ej. escribir: EC 1413)
 *   '0'         -> Mide al aire o agua destilada para ajustar offset de cero
 *   'p'         -> Imprime reporte de calibración para backend y firmware
 *   'r'         -> Restaura factor de calibración a 1.00
 * ============================================================================
 */

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const int PIN_TDS = 34;       // ADC1_CH6
const int PIN_ONEWIRE = 27;   // Bus 1-Wire DS18B20

OneWire oneWire(PIN_ONEWIRE);
DallasTemperature sensorTemp(&oneWire);

// Factores de calibración
float factorCalibracionTDS = 1.0000f; // Multiplicador de escala
float tds_offset_v         = 0.0000f; // Offset de cero en voltios
float tds_factor_k         = 0.5000f; // Relación TDS / EC (típicamente 0.50 para KCl/NaCl)

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

// Lectura de voltaje con mediana y sobremuestreo
float leerVoltajeTDS(int muestras = 30) {
  float lecturas[40];
  if (muestras > 40) muestras = 40;

  for (int i = 0; i < muestras; i++) {
    // analogReadMilliVolts() con calibración interna eFuse
    lecturas[i] = analogReadMilliVolts(PIN_TDS) / 1000.0f;
    delay(5);
  }

  ordenarArray(lecturas, muestras);
  return lecturas[muestras / 2];
}

void imprimirAyuda() {
  Serial.println("\n------------------------------------------------------------");
  Serial.println("  HERRAMIENTA DE CALIBRACIÓN TDS / SALINIDAD (ESP32)");
  Serial.println("------------------------------------------------------------");
  Serial.println("  1. Limpia y seca la sonda. Al aire el voltaje debe ser ~0.00V.");
  Serial.println("     Presiona '0' para calibrar el cero al aire o agua destilada.");
  Serial.println("  2. Sumerge la sonda TDS y el sensor de temperatura en tu solución KCl.");
  Serial.println("  3. Si conoces el valor de la solución:");
  Serial.println("     - En ppm   : Escribe 'CAL 707' (o el valor en ppm de tu frasco).");
  Serial.println("     - En uS/cm : Escribe 'EC 1413' (o el valor de conductividad).");
  Serial.println("  4. Presiona 'p' para ver el reporte de calibración.");
  Serial.println("------------------------------------------------------------\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  sensorTemp.begin();
  sensorTemp.setResolution(11);

  imprimirAyuda();
}

void loop() {
  // 1. Obtener temperatura del agua
  sensorTemp.requestTemperatures();
  float tempAgua = sensorTemp.getTempCByIndex(0);
  if (tempAgua == DEVICE_DISCONNECTED_C || tempAgua < -10.0 || tempAgua > 85.0) {
    tempAgua = 25.0; // Respaldo si no está conectado el DS18B20
  }

  // 2. Medir voltaje analógico del TDS
  float vTDS = leerVoltajeTDS(30);

  // Restar offset de cero
  float vAjustado = vTDS - tds_offset_v;
  if (vAjustado < 0.0f) vAjustado = 0.0f;

  // 3. Compensación de temperatura normalizada a 25.0 °C (+2% / °C)
  float coefTermico = 1.0f + 0.02f * (tempAgua - 25.0f);
  if (coefTermico < 0.1f) coefTermico = 0.1f;
  float vCompensado = vAjustado / coefTermico;

  // 4. Ecuación polinómica de TDS (Keyestudio / DFRobot estándar)
  float tdsBase = (133.42f * pow(vCompensado, 3) 
                 - 255.86f * pow(vCompensado, 2) 
                 + 857.39f * vCompensado) * 0.5f;
  if (tdsBase < 0.0f) tdsBase = 0.0f;

  // 5. Aplicar factor de calibración
  float tdsFinal = tdsBase * factorCalibracionTDS;

  // 6. Conductividad Eléctrica estimada (uS/cm)
  float ecEstimada = (tds_factor_k > 0.05f) ? (tdsFinal / tds_factor_k) : (tdsFinal / 0.50f);

  // 7. Procesar comandos por Monitor Serie
  if (Serial.available() > 0) {
    String entrada = Serial.readStringUntil('\n');
    entrada.trim();

    if (entrada == "0") {
      tds_offset_v = vTDS;
      Serial.printf("\n✅ OFFSET DE CERO AJUSTADO: %.4f V\n\n", tds_offset_v);
    }
    else if (entrada.startsWith("CAL ") || entrada.startsWith("cal ")) {
      float ppmObjetivo = entrada.substring(4).toFloat();
      if (ppmObjetivo > 10.0f && tdsBase > 1.0f) {
        factorCalibracionTDS = ppmObjetivo / tdsBase;
        Serial.printf("\n🎯 CALIBRACIÓN TDS EXITOSA:\n");
        Serial.printf("   • Solución estándar : %.1f ppm\n", ppmObjetivo);
        Serial.printf("   • TDS sin calibrar  : %.1f ppm\n", tdsBase);
        Serial.printf("   • Nuevo Factor K    : %.4f\n\n", factorCalibracionTDS);
      } else {
        Serial.println("\n⚠️ Valor inválido o sonda no sumergida en solución.");
      }
    }
    else if (entrada.startsWith("EC ") || entrada.startsWith("ec ")) {
      float ecObjetivo = entrada.substring(3).toFloat();
      if (ecObjetivo > 20.0f && tdsBase > 1.0f) {
        // En KCl: TDS_ppm = EC_uS * 0.50 (aprox)
        float ppmEquivalente = ecObjetivo * 0.50f;
        factorCalibracionTDS = ppmEquivalente / tdsBase;
        tds_factor_k = 0.5000f;
        Serial.printf("\n🎯 CALIBRACIÓN EC EXITOSA:\n");
        Serial.printf("   • Solución estándar : %.1f uS/cm (equiv. %.1f ppm)\n", ecObjetivo, ppmEquivalente);
        Serial.printf("   • Nuevo Factor K    : %.4f\n\n", factorCalibracionTDS);
      } else {
        Serial.println("\n⚠️ Valor inválido o sonda no sumergida en solución.");
      }
    }
    else if (entrada == "p" || entrada == "P") {
      Serial.println("\n============================================================");
      Serial.println("📋 PARÁMETROS FINALES DE CALIBRACIÓN TDS PARA SENTINEL-H2O");
      Serial.println("============================================================");
      Serial.printf("Factor de Escala TDS      : %.4f\n", factorCalibracionTDS);
      Serial.printf("Voltaje Offset de Cero    : %.4f V\n", tds_offset_v);
      Serial.printf("Factor de Conversión EC (k): %.4f\n", tds_factor_k);
      Serial.println("\nConfiguración para backend (processor.py / CalibracionNodo):");
      Serial.printf("  tds_factor_k = %.4f\n", tds_factor_k);
      Serial.printf("  tds_offset_v = %.4f\n", tds_offset_v);
      Serial.println("============================================================\n");
    }
    else if (entrada == "r" || entrada == "R") {
      factorCalibracionTDS = 1.0000f;
      tds_offset_v = 0.0000f;
      Serial.println("\n🔄 Factores de calibración reseteados a 1.000.");
    }
  }

  // 8. Impresión de monitoreo en tiempo real
  Serial.printf("Temp: %4.1f °C | V_raw: %5.3f V | V_comp: %5.3f V | TDS: %6.1f ppm | EC: %6.1f uS/cm | ",
                tempAgua, vTDS, vCompensado, tdsFinal, ecEstimada);

  if (ecEstimada < 1200.0) {
    Serial.println("🟢 ÓPTIMO (Riego)");
  } else if (ecEstimada <= 1500.0) {
    Serial.println("🟡 PRECAUCIÓN");
  } else {
    Serial.println("🔴 SALINIDAD ELEVADA (Estrés osmótico)");
  }

  delay(1000);
}
