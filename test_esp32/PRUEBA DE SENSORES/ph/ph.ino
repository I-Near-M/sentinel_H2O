/**
 * ============================================================================
 * CALIBRACIÓN DEL POTENCIÓMETRO OFFSET (2.500 V) - PH-4502C CON ESP32
 * ============================================================================
 * CONEXIONES:
 *   - VCC PH-4502C -> 5V (Recomendado) o 3.3V
 *   - GND PH-4502C -> GND del ESP32
 *   - Po           -> GPIO 32 del ESP32 (ADC1_CH4)
 *
 * PROCEDIMIENTO DEL PUENTE:
 *   1. Desconecta la sonda de vidrio BNC.
 *   2. Con un cablecito o clip, haz un PUENTE entre el pin central del
 *      conector BNC hembra y la rosca/carcasa metálica exterior.
 *      (Esto simula 0.0 mV = pH 7.00 exacto).
 *   3. Abre el Monitor Serie a 115200 baudios.
 *   4. Gira el potenciómetro azul multivuelta con un perillero plano hasta
 *      que el indicador marque: [🎯 2.500 V - ¡PERFECTO!].
 * ============================================================================
 */

#include <Arduino.h>

const int PIN_PH = 32;       // Pin ADC1 del ESP32
const float OBJETIVO_V = 2.500; // Voltaje neutro deseado

// Función para ordenar y sacar la mediana (elimina saltos y ruido eléctrico)
void ordenar(float arr[], int n) {
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        float t = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = t;
      }
    }
  }
}

float leerVoltajeEstable() {
  float muestras[25];
  for (int i = 0; i < 25; i++) {
    muestras[i] = analogReadMilliVolts(PIN_PH) / 1000.0f;
    delay(4);
  }
  ordenar(muestras, 25);
  return muestras[12]; // Valor central
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Serial.println("\n========================================================");
  Serial.println("🎛️  AJUSTE EN TIEMPO REAL DEL POTENCIÓMETRO DE pH (2.500 V)");
  Serial.println("========================================================");
  Serial.println("Asegúrate de tener el PUENTE puesto en el BNC.");
  Serial.println("Gira el potenciómetro azul hasta que las flechas se centren.\n");
  delay(1000);
}

void loop() {
  float v = leerVoltajeEstable();
  float delta = v - OBJETIVO_V;

  Serial.printf("Voltaje: %5.3f V | Dif: %+6.3f V | ", v, delta);

  // Guía visual interactiva
  if (fabs(delta) <= 0.010) { // Margen de ±10 mV (2.490 V a 2.510 V)
    Serial.println(">>> 🎯 [ ¡PERFECTO EN 2.50 V! - DÉJALO AHÍ ] <<<");
  } else if (delta < -0.010) {
    if (delta < -0.200) {
      Serial.println("▲▲▲ SUBIR MUCHO  (Gira a la derecha/horario)");
    } else {
      Serial.println("▲   SUBIR UN POCO (Gira suavemente a la derecha)");
    }
  } else {
    if (delta > 0.200) {
      Serial.println("▼▼▼ BAJAR MUCHO  (Gira a la izquierda/antihorario)");
    } else {
      Serial.println("▼   BAJAR UN POCO (Gira suavemente a la izquierda)");
    }
  }

  delay(200); // Refresco ágil para responder al giro del destornillador
}