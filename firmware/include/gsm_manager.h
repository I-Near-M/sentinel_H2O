#ifndef GSM_MANAGER_H
#define GSM_MANAGER_H

#include <Arduino.h>
#include "config.h"
#include "sensors.h"

class GSMManager {
private:
    HardwareSerial gsmSerial;

    // Envía un comando AT y espera una respuesta esperada dentro de un timeout
    bool sendATCommand(const String& cmd, const String& expected_resp, unsigned long timeout_ms = 3000) {
        gsmSerial.println(cmd);
        unsigned long start = millis();
        String response = "";

        while (millis() - start < timeout_ms) {
            while (gsmSerial.available()) {
                char c = gsmSerial.read();
                response += c;
            }
            if (response.indexOf(expected_resp) != -1) {
                return true;
            }
            delay(10);
        }
        return false;
    }

    // Lee la respuesta completa de un comando
    String sendATCommandWithResponse(const String& cmd, unsigned long timeout_ms = 3000) {
        gsmSerial.println(cmd);
        unsigned long start = millis();
        String response = "";

        while (millis() - start < timeout_ms) {
            while (gsmSerial.available()) {
                char c = gsmSerial.read();
                response += c;
            }
            delay(10);
        }
        return response;
    }

public:
    GSMManager() : gsmSerial(2) {}

    void init() {
        // Iniciar UART2 con SIM800L a 9600 baudios (estándar de SIM800L)
        gsmSerial.begin(9600, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);
        delay(1000);

        // Comprobación de comunicación básica
        sendATCommand("AT", "OK", 1000);
        sendATCommand("ATE0", "OK", 1000); // Desactivar echo de comandos
    }

    // Consulta la calidad de señal celular CSQ (0 a 31)
    int getSignalRSSI() {
        String resp = sendATCommandWithResponse("AT+CSQ", 2000);
        int idx = resp.indexOf("+CSQ: ");
        if (idx != -1) {
            int comma_idx = resp.indexOf(",", idx);
            if (comma_idx != -1) {
                String rssi_str = resp.substring(idx + 6, comma_idx);
                return rssi_str.toInt();
            }
        }
        return 99; // No detectable o error
    }

    // Configura y activa la conexión de datos GPRS con el APN del operador
    bool setupGPRS() {
        // Verificar registro en la red celular (1 = Local, 5 = Roaming)
        sendATCommand("AT+CREG?", "OK", 2000);

        // Configurar contexto de datos bearer
        sendATCommand("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK", 2000);
        sendATCommand("AT+SAPBR=3,1,\"APN\",\"" + String(GPRS_APN) + "\"", "OK", 2000);
        sendATCommand("AT+SAPBR=3,1,\"USER\",\"" + String(GPRS_USER) + "\"", "OK", 2000);
        sendATCommand("AT+SAPBR=3,1,\"PWD\",\"" + String(GPRS_PASS) + "\"", "OK", 2000);

        // Abrir portador GPRS (intentar hasta 3 veces)
        for (int i = 0; i < 3; i++) {
            if (sendATCommand("AT+SAPBR=1,1", "OK", 5000)) {
                return true;
            }
            delay(1000);
        }
        return false;
    }

    // Desconecta la sesión GPRS para ahorrar energía
    void closeGPRS() {
        sendATCommand("AT+HTTPTERM", "OK", 1000);
        sendATCommand("AT+SAPBR=0,1", "OK", 2000);
    }

    // Envía el paquete JSON de telemetría al servidor backend vía HTTP POST
    bool sendTelemetryHTTPPost(const String& json_payload) {
        String full_url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(SERVER_PATH);

        // 1. Iniciar servicio HTTP
        sendATCommand("AT+HTTPINIT", "OK", 2000);
        sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 1000);
        sendATCommand("AT+HTTPPARA=\"URL\",\"" + full_url + "\"", "OK", 2000);
        sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 1000);

        // 2. Cargar el cuerpo del JSON en el buffer del SIM800L
        String data_cmd = "AT+HTTPDATA=" + String(json_payload.length()) + ",10000";
        if (!sendATCommand(data_cmd, "DOWNLOAD", 3000)) {
            sendATCommand("AT+HTTPTERM", "OK", 1000);
            return false;
        }

        // Escribir el payload JSON
        gsmSerial.print(json_payload);
        delay(500);

        // 3. Ejecutar la acción POST (HTTPACTION=1)
        String action_resp = sendATCommandWithResponse("AT+HTTPACTION=1", 15000);
        
        // La respuesta exitosa contiene '+HTTPACTION: 1,201,' o '1,200,'
        bool success = (action_resp.indexOf(",201,") != -1 || action_resp.indexOf(",200,") != -1);

        // 4. Terminar sesión HTTP
        sendATCommand("AT+HTTPTERM", "OK", 2000);
        return success;
    }

    // Respaldo de Emergencia Offline: Envía un SMS directo al teléfono del Tomero local
    bool sendEmergencySMS(const String& phone, const String& message) {
        sendATCommand("AT+CMGF=1", "OK", 1000); // Modo texto para SMS
        gsmSerial.println("AT+CMGS=\"" + phone + "\"");
        delay(200);

        gsmSerial.print(message);
        delay(200);
        gsmSerial.write(26); // Carácter ASCII 26 (Ctrl+Z) para enviar SMS

        return sendATCommand("", "OK", 8000);
    }

    // Pone el módem en modo de mínimo consumo antes de que el ESP32 entre en Deep Sleep
    void powerDown() {
        sendATCommand("AT+CFUN=0", "OK", 2000); // Modo teléfono mínimo consumo
    }
};

#endif // GSM_MANAGER_H
