/**
 * ============================================================================
 * PROYECTO: Sentinel-H2O — Calibración de Sensores
 * SENSOR: Sensor Digital de Temperatura DS18B20 (1-Wire)
 * MICROCONTROLADOR: ESP32 DevKit V1
 * ============================================================================
 * CONEXIONES:
 *   - DS18B20 VCC  (Rojo)  -> 3V3 del ESP32
 *   - DS18B20 GND  (Negro) -> GND común
 *   - DS18B20 DATA (Amarillo/Azul) -> GPIO 27 del ESP32
 *   - Resistencia PULL-UP de 4.7k entre DATA (GPIO 27) y 3.3V
 *
 * COMPARACIÓN Y CALIBRACIÓN:
 *   - Comparación con termómetro analógico de mercurio patrón.
 *
 * COMANDOS POR MONITOR SERIE (115200 baudios):
 *   "<temperatura>" -> Introduce la temperatura leída en el termómetro de mercurio
 *                      (ejemplo: escribe 21.5 y presiona Enter para auto-calcular el offset)
 *   'p'             -> Imprime reporte de calibración
 *   '0'             -> Resetea el offset a 0.00 °C
 * ============================================================================
 */

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const int PIN_DATOS_1WIRE = 27; // GPIO 27 con pull-up 4.7k a 3.3V

OneWire oneWire(PIN_DATOS_1WIRE);
DallasTemperature sensores(&oneWire);

// Variable de calibración (Offset en °C respecto al termómetro de mercurio)
float offsetTemp = 0.0000f;
DeviceAddress direccionSensor;

void imprimirAyuda() {
  Serial.println("\n------------------------------------------------------------");
  Serial.println("  HERRAMIENTA DE CALIBRACIÓN TEMPERATURA DS18B20 (ESP32)");
  Serial.println("------------------------------------------------------------");
  Serial.println("  1. Coloca la sonda DS18B20 junto al bulbo del termómetro de mercurio");
  Serial.println("     en el mismo recipiente con agua.");
  Serial.println("  2. Espera 2 minutos a que ambas lecturas se estabilicen.");
  Serial.println("  3. Escribe en este monitor serie la temperatura del mercurio");
  Serial.println("     (por ejemplo: 21.4) y presiona ENTER.");
  Serial.println("     El sistema calculará automáticamente el OFFSET.");
  Serial.println("  4. Presiona 'p' para ver el reporte de calibración.");
  Serial.println("------------------------------------------------------------\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("🔍 Buscando sonda DS18B20 en el bus 1-Wire (GPIO 27)...");
  sensores.begin();

  if (!sensores.getAddress(direccionSensor, 0)) {
    Serial.println("❌ ERROR: No se encontró ninguna sonda DS18B20.");
    Serial.println("   -> Verifica cableado: Rojo=3V3, Negro=GND, Amarillo=GPIO27.");
    Serial.println("   -> Verifica resistencia de 4.7k entre GPIO27 y 3V3.");
  } else {
    Serial.print("✅ Sonda DS18B20 encontrada con dirección ROM: ");
    for (uint8_t i = 0; i < 8; i++) {
      if (direccionSensor[i] < 16) Serial.print("0");
      Serial.print(direccionSensor[i], HEX);
    }
    Serial.println();
    sensores.setResolution(direccionSensor, 12); // Máxima precisión: 0.0625 °C
  }

  imprimirAyuda();
}

void loop() {
  // 1. Solicitar y leer temperatura
  sensores.requestTemperatures();
  float tempLeida = sensores.getTempCByIndex(0);

  // 2. Procesar comandos por Monitor Serie
  if (Serial.available() > 0) {
    String entrada = Serial.readStringUntil('\n');
    entrada.trim();

    if (entrada == "p" || entrada == "P") {
      Serial.println("\n============================================================");
      Serial.println("📋 PARÁMETROS FINALES DE TEMPERATURA PARA SENTINEL-H2O");
      Serial.println("============================================================");
      Serial.printf("Temperatura Cruda Leída : %.2f °C\n", tempLeida);
      Serial.printf("Offset Calibrado        : %+.2f °C\n", offsetTemp);
      Serial.printf("Temperatura Corregida   : %.2f °C\n", tempLeida + offsetTemp);
      Serial.println("============================================================\n");
    }
    else if (entrada == "0") {
      offsetTemp = 0.0f;
      Serial.println("\n🔄 Offset reseteado a 0.00 °C.");
    }
    else if (entrada.length() > 0) {
      float tempMercurio = entrada.toFloat();
      if (tempMercurio > -10.0f && tempMercurio < 100.0f && tempLeida != DEVICE_DISCONNECTED_C) {
        offsetTemp = tempMercurio - tempLeida;
        Serial.println("\n============================================================");
        Serial.printf("🎯 CALIBRACIÓN CON TERMÓMETRO DE MERCURIO EXITOSA:\n");
        Serial.printf("   • Temperatura Mercurio  : %.2f °C\n", tempMercurio);
        Serial.printf("   • Temperatura DS18B20   : %.2f °C\n", tempLeida);
        Serial.printf("   • Offset Calculado      : %+.2f °C\n", offsetTemp);
        Serial.println("============================================================\n");
      } else {
        Serial.println("⚠️ Entrada no válida o sensor desconectado.");
      }
    }
  }

  // 3. Validación y muestra en pantalla
  if (tempLeida == DEVICE_DISCONNECTED_C || tempLeida < -20.0f || tempLeida > 85.0f) {
    Serial.println("❌ ERROR: Sonda desconectada o falla de comunicación 1-Wire.");
  } else {
    float tempCalibrada = tempLeida + offsetTemp;
    Serial.printf("Temp Leída (DS18B20): %5.2f °C | Offset: %+.2f °C | Temp Calibrada: %5.2f °C\n",
                  tempLeida, offsetTemp, tempCalibrada);
  }

  delay(1000);
}
