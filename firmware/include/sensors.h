#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

// Estructura de telemetría cruda capturada por los sensores en campo
struct RawSensorData {
    float raw_v_ph;       // Voltaje promedio sensor pH (0.0 - 3.3V)
    float raw_v_tds;      // Voltaje promedio sensor TDS (0.0 - 3.3V)
    float raw_v_turb;     // Voltaje promedio sensor Turbidez (0.0 - 3.3V)
    float raw_dist_cm;    // Distancia medida por ultrasonido al agua (cm)
    float temp_c;         // Temperatura del agua medida por DS18B20 (°C)
    float battery_v;      // Tensión real de la batería de 12V Opalux (V)
};

class SensorManager {
private:
    OneWire oneWire;
    DallasTemperature ds18b20;

    // Función auxiliar para ordenar arreglos (para cálculo de mediana)
    static void sortArray(float arr[], int n) {
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

public:
    SensorManager() : oneWire(PIN_ONE_WIRE_BUS), ds18b20(&oneWire) {}

    void init() {
        // Configuración de resolución ADC (12 bits: 0 a 4095) y atenuación 11dB (rango 0 a 3.3V)
        analogReadResolution(12);
        analogSetAttenuation(ADC_11db);

        // Configuración de pines para el sensor ultrasónico JSN-SR04T
        pinMode(PIN_TRIG, OUTPUT);
        pinMode(PIN_ECHO, INPUT);
        digitalWrite(PIN_TRIG, LOW);

        // Iniciar bus 1-Wire y sensor de temperatura DS18B20
        ds18b20.begin();
        ds18b20.setResolution(11); // Resolución de 0.125°C rápida
    }

    // Lee un pin analógico con sobremuestreo (30 muestras) y filtro de mediana
    float readAnalogVoltageMedian(int pin, int samples = 30) {
        float readings[40];
        if (samples > 40) samples = 40;

        for (int i = 0; i < samples; i++) {
            int raw_adc = analogRead(pin);
            // Conversión de ADC 12 bits a Voltaje (0 - 3.3V)
            readings[i] = (raw_adc / 4095.0f) * 3.30f;
            delay(5);
        }

        sortArray(readings, samples);
        // Retornar el valor central (mediana) para eliminar picos de ruido eléctrico
        return readings[samples / 2];
    }

    // Mide la distancia al agua compensada por la temperatura real del ambiente
    float readUltrasonicDistanceCm(float temp_c, int samples = 5) {
        float valid_readings[10];
        int count = 0;

        // Velocidad del sonido en cm/us corregida por temperatura: v = 331.4 + 0.606 * T
        float vel_sonido_cm_us = (331.4f + (0.606f * temp_c)) * 100.0f / 1000000.0f;

        for (int i = 0; i < samples; i++) {
            digitalWrite(PIN_TRIG, LOW);
            delayMicroseconds(2);
            digitalWrite(PIN_TRIG, HIGH);
            delayMicroseconds(15);
            digitalWrite(PIN_TRIG, LOW);

            // Timeout de 35ms (~6 metros de alcance máximo)
            long duration = pulseIn(PIN_ECHO, HIGH, 35000);

            if (duration > 0) {
                float dist = (duration * vel_sonido_cm_us) / 2.0f;
                if (dist >= 10.0f && dist <= 500.0f) {
                    valid_readings[count++] = dist;
                }
            }
            delay(20);
        }

        if (count == 0) {
            return 999.0f; // Código de error de lectura / fuera de rango
        }

        sortArray(valid_readings, count);
        return valid_readings[count / 2];
    }

    // Lee la temperatura del agua mediante el DS18B20
    float readWaterTemperature() {
        ds18b20.requestTemperatures();
        float temp = ds18b20.getTempCByIndex(0);
        if (temp == DEVICE_DISCONNECTED_C || temp < -20.0f || temp > 80.0f) {
            return 18.0f; // Valor de fallback razonable si el sensor se desconecta
        }
        return temp;
    }

    // Lee la tensión real de la batería de 12V Opalux mediante el divisor 100k/22k en GPIO35
    float readBatteryVoltage() {
        float v_pin = readAnalogVoltageMedian(PIN_BATTERY_ANALOG, 20);
        // Escalar por el factor del divisor resistivo (100k + 22k) / 22k = 5.5455
        return v_pin * BATTERY_DIVIDER_FACTOR;
    }

    // Realiza el muestreo completo de los 5 sensores físicos y el monitor de batería
    RawSensorData sampleAllSensors() {
        RawSensorData data;

        data.temp_c = readWaterTemperature();
        data.raw_dist_cm = readUltrasonicDistanceCm(data.temp_c, 5);
        data.raw_v_ph = readAnalogVoltageMedian(PIN_PH_ANALOG, 30);
        data.raw_v_tds = readAnalogVoltageMedian(PIN_TDS_ANALOG, 30);
        data.raw_v_turb = readAnalogVoltageMedian(PIN_TURB_ANALOG, 30);
        data.battery_v = readBatteryVoltage();

        return data;
    }
};

#endif // SENSORS_H
