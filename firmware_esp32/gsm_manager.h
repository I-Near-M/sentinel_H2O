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
        sendATCommand("AT+CFUN=1", "OK", 2000); // Activar RF al 100%
        delay(2000); // Espera para enganche de antena con la torre celular
    }

    // Consulta la calidad de señal celular CSQ (0 a 31) con sondeo activo
    int getSignalRSSI() {
        for (int i = 0; i < 5; i++) {
            String resp = sendATCommandWithResponse("AT+CSQ", 2000);
            int idx = resp.indexOf("+CSQ: ");
            if (idx != -1) {
                int comma_idx = resp.indexOf(",", idx);
                if (comma_idx != -1) {
                    String rssi_str = resp.substring(idx + 6, comma_idx);
                    int val = rssi_str.toInt();
                    if (val > 0 && val < 99) {
                        return val;
                    }
                }
            }
            delay(1000);
        }
        return 0; // No detectable o en espera
    }

    // Configura y activa la conexión de datos GPRS con el APN del operador (Movistar 2G)
    bool setupGPRS() {
        // 1. Limpieza de sockets e IP previa
        sendATCommand("AT+CIPCLOSE", "OK", 1000);
        sendATCommand("AT+CIPSHUT", "SHUT OK", 2000);
        delay(300);

        // 2. Esperar registro en la red celular (CREG: 1 = Local, 5 = Roaming) hasta 15 segundos
        bool registered = false;
        for (int i = 0; i < 15; i++) {
            String creg_resp = sendATCommandWithResponse("AT+CREG?", 1500);
            if (creg_resp.indexOf(",1") != -1 || creg_resp.indexOf(",5") != -1) {
                registered = true;
                break;
            }
            delay(1000);
        }

        // 3. Configurar conexión IP única
        sendATCommand("AT+CIPMUX=0", "OK", 1000);

        // 4. Configurar APN de Movistar Perú
        String cstt_cmd = "AT+CSTT=\"" + String(GPRS_APN) + "\"";
        if (String(GPRS_USER).length() > 0) {
            cstt_cmd += ",\"" + String(GPRS_USER) + "\",\"" + String(GPRS_PASS) + "\"";
        }
        sendATCommand(cstt_cmd, "OK", 2000);

        // 5. Activar conexión inalámbrica GPRS (CIICR)
        sendATCommand("AT+CIICR", "OK", 8000);

        // 6. Consultar y mostrar la IP obtenida de la red
        String ip_info = sendATCommandWithResponse("AT+CIFSR", 3000);
        Serial.print("   • IP GPRS asignada por Movistar: ");
        Serial.println(ip_info);

        bool has_ip = (ip_info.indexOf(".") != -1 && ip_info.indexOf("ERROR") == -1);
        return has_ip;
    }

    // Desconecta la sesión GPRS para ahorrar energía
    void closeGPRS() {
        sendATCommand("AT+CIPCLOSE", "OK", 1000);
        sendATCommand("AT+CIPSHUT", "SHUT OK", 1000);
    }

    // Envía el paquete JSON de telemetría directamente por socket TCP (Evita fallos de DNS / SSL del módem)
    bool sendTelemetryHTTPPost(const String& json_payload) {
        Serial.print("   • Conectando socket TCP con VPS en ");
        Serial.print(SERVER_HOST);
        Serial.print(":");
        Serial.println(SERVER_PORT);

        // 1. Abrir socket TCP directo hacia la IP del servidor
        String start_cmd = "AT+CIPSTART=\"TCP\",\"" + String(SERVER_HOST) + "\"," + String(SERVER_PORT);
        String start_resp = sendATCommandWithResponse(start_cmd, 10000);
        
        // Esperar confirmación de conexión ("CONNECT OK" o "ALREADY CONNECT")
        if (start_resp.indexOf("CONNECT OK") == -1 && start_resp.indexOf("ALREADY CONNECT") == -1) {
            unsigned long wait_conn = millis();
            while (millis() - wait_conn < 6000) {
                while (gsmSerial.available()) {
                    char c = gsmSerial.read();
                    start_resp += c;
                }
                if (start_resp.indexOf("CONNECT OK") != -1 || start_resp.indexOf("ALREADY CONNECT") != -1) {
                    break;
                }
                delay(50);
            }
        }

        Serial.print("   [TCP STATUS]: ");
        Serial.println(start_resp);

        if (start_resp.indexOf("CONNECT OK") == -1 && start_resp.indexOf("ALREADY CONNECT") == -1) {
            Serial.println("   ❌ Error: No se pudo abrir el socket TCP.");
            sendATCommand("AT+CIPCLOSE", "OK", 1000);
            return false;
        }

        // 2. Construir la petición HTTP/1.1 estándar en formato raw
        String http_packet = "POST " + String(SERVER_PATH) + " HTTP/1.1\r\n";
        http_packet += "Host: " + String(SERVER_HOST) + "\r\n";
        http_packet += "User-Agent: SIM800L-ESP32\r\n";
        http_packet += "Content-Type: application/json\r\n";
        http_packet += "Content-Length: " + String(json_payload.length()) + "\r\n";
        http_packet += "Connection: close\r\n\r\n";
        http_packet += json_payload;

        // 3. Enviar datos a través del socket TCP
        Serial.printf("   • Transmitiendo %d bytes por TCP...\n", http_packet.length());
        String send_cmd = "AT+CIPSEND=" + String(http_packet.length());
        if (!sendATCommand(send_cmd, ">", 4000)) {
            Serial.println("   ❌ Error al iniciar CIPSEND.");
            sendATCommand("AT+CIPCLOSE", "OK", 1000);
            return false;
        }

        gsmSerial.print(http_packet);

        // 4. Capturar la respuesta directa del servidor web Nginx / FastAPI
        Serial.println("   • Esperando respuesta del servidor...");
        unsigned long start_read = millis();
        String server_response = "";
        while (millis() - start_read < 12000) {
            while (gsmSerial.available()) {
                char c = gsmSerial.read();
                server_response += c;
            }
            if (server_response.indexOf("201 Created") != -1 || server_response.indexOf("200 OK") != -1) {
                break;
            }
            delay(10);
        }

        Serial.println("   ────────────────────────────────────────");
        Serial.print("   [RESPUESTA SERVIDOR]: ");
        Serial.println(server_response);
        Serial.println("   ────────────────────────────────────────");

        bool success = (server_response.indexOf("201") != -1 || server_response.indexOf("200") != -1);

        sendATCommand("AT+CIPCLOSE", "OK", 1000);
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
