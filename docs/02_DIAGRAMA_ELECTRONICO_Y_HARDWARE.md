# ⚡ Sentinel-H2O — Hardware, Sensores, Diagrama Electrónico y Conexionado

> **Concurso de Ciencia y Tecnología para la Seguridad Hídrica en la Cuenca Chancay-Huaral (ANA / CRHCCH-H)**  
> **Requerimiento Oficial:** ☑ Diagrama Electrónico & Arquitectura de Hardware  
> **Licencia:** Open Source (GNU AGPL v3.0)

---

## 1. Filosofía de Hardware: Arquitectura Agnóstica y Transmisión RAW

La estación telemétrica de campo **Sentinel-H2O** ha sido diseñada bajo un principio de **Desacoplamiento de Hardware y Gobernanza en el Edge**:

1. **Captura de Señales Físicas en Crudo (RAW):** El microcontrolador (ESP32) no aplica conversiones empíricas fijas en su código compilado; lee directamente los voltajes analógicos del ADC y los tiempos de pulso ultrasónico, empaquetándolos en crudo en un payload JSON seguro.
2. **Abstracción Total de Sensores (Académicos vs. Industriales):**
   - El prototipo base incorpora un kit de sensores de costo accesible para validación de campo (sonda pH BNC analógica, electrodo TDS/EC, sensor óptico de turbidez TS-300B, sonda de temperatura DS18B20 y transductor ultrasónico hermético JSN-SR04T).
   - **Compatibilidad con Sensores Industriales:** La plataforma admite directamente sondas de instrumentación pesada (transmisores 4-20 mA, interfaces Modbus RS-485, sensores piezométricos de presión sumergible, radares de nivel hidrométrico o sondas ópticas de oxígeno disuelto).
   - **Calibración Dinámica en la Nube / Consola:** Al intercambiar o sustituir una sonda (académica o industrial), **no se requiere reprogramar ni flashear el firmware en campo**. El operador simplemente ajusta los coeficientes de calibración (*offset*, pendiente *slope*, cota cero o polinomios) desde la consola web de Sentinel-H2O, y el motor del backend recalcula automáticamente todas las series de tiempo con máxima precisión.

---

## 2. Diagrama de Bloques y Flujo Eléctrico de la Estación

```
                             ┌────────────────────────────────────────┐
                             │    PANEL SOLAR FOTOVOLTAICO 50W / 18V  │
                             └───────────────────┬────────────────────┘
                                                 │ (18V DC)
                                                 ▼
                             ┌────────────────────────────────────────┐
                             │  CONTROLADOR DE CARGA SOLAR MPPT/PWM   │
                             └──────────┬───────────────────┬─────────┘
                                        │                   │
                                        ▼                   ▼
                             ┌──────────────────┐ ┌───────────────────────────┐
                             │ BATERÍA LiFePO4  │ │  CONVERTIDOR BUCK DC-DC   │
                             │  12.8V / 12Ah    │ │  (12V DC -> 5.0V / 3A DC) │
                             └────────┬─────────┘ └─────────────┬─────────────┘
                                      │                         │
                                      │                         │ (Línea VCC 5V)
       ┌──────────────────────────────┼─────────────────────────┼─────────────────────────────────────────────┐
       │ (Borne +)                    │                         │                                             │
       │                              │                         │                                             │
       ▼                              │                         ▼                                             ▼
┌──────────────┐                      │               ┌───────────────────┐                         ┌───────────────────┐
│ DIVISOR      │                      │               │ ACONDICIONADOR    │                         │ MODEM CELULAR     │
│ BATERÍA      │                      │               │ DE SENSORES       │                         │ GSM/GPRS SIM800L  │
│ 100kΩ / 10kΩ │                      │               │ (5V VCC / GND)    │                         │ (Alimentado 4.0V) │
└──────┬───────┘                      │               └─────────┬─────────┘                         └─────────┬─────────┘
       │                              │                         │                                             │
       │ (0 - 1.3V)                   │                         │                                             │
       ▼                              │                         ▼                                             │
┌──────────────┐                      │               ┌───────────────────┐                                   │
│ ADC ESP32    │                      │               │ ESP32 DEVKIT V1   │                                   │
│ [GPIO 33]    │                      │               │ (Alimentado 5V/3V3│◄──────────────────────────────────┘
└──────────────┘                      │               └─────────┬─────────┘ (UART2: TX2/RX2 GPIO 16/17)
                                      │                         │
                                      │                         │
                                      ▼                         ▼
                              (Chasis / Tierra Común - GND Unificada)
```

---

## 3. Circuitos de Protección y Divisores de Tensión (Cálculos de Ingeniería)

El ADC del microcontrolador ESP32 opera en un rango lineal seguro de **$0\text{ a }3.3\text{V}$** (con atenuación de 11 dB). Los sensores analógicos y digitales que operan a $5.0\text{V}$ o el banco de baterías ($12\text{V}$) requieren etapas de acondicionamiento pasivo calibradas:

```
                            DIAGRAMA DE DIVISORES RESISTIVOS

   A) Divisor Voltaje Batería (12V)         B) Divisor Sensor Turbidez (5V)       C) Divisor Línea ECHO Ultrasónico (5V)
   
        [ + BATERÍA (0-15V) ]                     [ SALIDA ANALÓGICA TS-300B ]             [ PIN ECHO JSN-SR04T (5V) ]
                 │                                             │                                       │
                ┌┴┐                                           ┌┴┐                                     ┌┴┐
                │ │ R1 = 100 kΩ                               │ │ R1 = 20 kΩ                          │ │ R1 = 1.0 kΩ (o 2.2k)
                │ │ (1% precisión)                            │ │ (1% precisión)                      │ │
                └┬┘                                           └┬┘                                     └┬┘
                 ├────────► GPIO 33 (ESP32)                    ├────────► GPIO 32 (ESP32)              ├────────► GPIO 19 (ESP32)
                ┌┴┐         (V_out = V_bat * 10/110)          ┌┴┐         (V_out = V_in * 10/30)      ┌┴┐         (V_out = 5V * 2/3 = 3.3V)
                │ │ R2 = 10 kΩ                                │ │ R2 = 10 kΩ                          │ │ R2 = 2.0 kΩ (o 4.7k)
                │ │ (1% precisión)                            │ │ (1% precisión)                      │ │
                └┬┘                                           └┬┘                                     └┬┘
                 │                                             │                                       │
                ─── GND                                       ─── GND                                 ─── GND
```

### A. Divisor Resistivo de Monitoreo de Batería ($100\text{ k}\Omega / 10\text{ k}\Omega$)
- **Conexión:** Conectado directamente a los polos positivo ($+$) y negativo ($-$) de la batería.
- **Relación de Atenuación:**
  $$V_{\text{ADC}} = V_{\text{Batería}} \times \left( \frac{R_2}{R_1 + R_2} \right) = V_{\text{Batería}} \times \left( \frac{10\text{ k}\Omega}{100\text{ k}\Omega + 10\text{ k}\Omega} \right) = \frac{V_{\text{Batería}}}{11}$$
- **Rango Operativo:** Para una batería a plena carga ($14.4\text{V}$ en absorción solar), $V_{\text{ADC}} = 14.4 / 11 = 1.309\text{V}$, encontrándose en la zona de mayor linealidad del ADC del ESP32.

### B. Divisor de Señal de Turbidez Óptica ($20\text{ k}\Omega / 10\text{ k}\Omega$)
- **Problema:** El módulo de acondicionamiento TS-300B se alimenta a $5.0\text{V}$ y en agua limpia entrega entre $4.10\text{V}$ y $4.50\text{V}$, lo cual excedería la tensión máxima admisible del GPIO del ESP32 ($3.3\text{V}$).
- **Relación de Atenuación:**
  $$V_{\text{ADC}} = V_{\text{Sensor}} \times \left( \frac{10\text{ k}\Omega}{20\text{ k}\Omega + 10\text{ k}\Omega} \right) = \frac{V_{\text{Sensor}}}{3}$$
- **Rango de Lectura:** Un voltaje de $4.5\text{V}$ se convierte en $1.50\text{V}$ en el pin `GPIO 32`.

### C. Divisor de Protección para el Sensor Ultrasónico JSN-SR04T (Línea ECHO)
- **Problema:** El transductor ultrasónico hermético JSN-SR04T requiere alimentación de $5.0\text{V}$ para emitir pulsos de 40 kHz con potencia suficiente. Su pin de salida digital `ECHO` conmuta a nivel lógico alto de $5.0\text{V}$.
- **Acondicionamiento:** Se coloca un divisor resistivo de $1\text{ k}\Omega / 2\text{ k}\Omega$ (o $2.2\text{ k}\Omega / 4.7\text{ k}\Omega$) entre la línea `ECHO` del sensor y el `GPIO 19` del ESP32, reduciendo el pulso de $5.0\text{V}$ a un nivel lógico seguro de $3.3\text{V}$.

---

## 4. Tabla de Asignación de Pines (Pinout Oficial ESP32)

| Componente / Sensor | Interfaz / Protocolo | Pin ESP32 | Circuito de Acondicionamiento | Rango Analítico / Lectura |
| :--- | :--- | :---: | :--- | :--- |
| **Sonda pH Industrial (BNC)** | Analógica ($0 - 3.3\text{V}$) | `GPIO 34` (ADC1_CH6) | Módulo PH-4502C con potenciómetro de offset | $0.00 - 14.00\text{ pH}$ |
| **Sensor de Conductividad (EC/TDS)**| Analógica ($0 - 3.3\text{V}$) | `GPIO 35` (ADC1_CH7) | Transmisor analógico con compensación de temp. | $0 - 2,000\text{ ppm}$ ($0 - 4,000\ \mu\text{S/cm}$) |
| **Sensor de Turbidez Óptica** | Analógica ($0 - 3.3\text{V}$) | `GPIO 32` (ADC1_CH4) | Divisor resistivo $20\text{ k}\Omega / 10\text{ k}\Omega$ (1:3) | $0 - 1,000\text{ NTU}$ |
| **Sensor de Voltaje Batería** | Analógica ($0 - 3.3\text{V}$) | `GPIO 33` (ADC1_CH5) | Divisor resistivo directo $100\text{ k}\Omega / 10\text{ k}\Omega$ (1:11)| $0.0 - 16.0\text{ V DC}$ |
| **Sonda de Temperatura DS18B20** | Digital (1-Wire) | `GPIO 4` | Resistencia Pull-Up $4.7\text{ k}\Omega$ a $3.3\text{V}$ | $-55^\circ\text{C a }+125^\circ\text{C}$ ($\pm 0.5^\circ\text{C}$) |
| **Nivel Ultrasónico JSN-SR04T (Trigger)**| Digital (Salida) | `GPIO 18` | Conexión directa ($3.3\text{V}$ suficiente para disparo)| Pulsos de $10\ \mu\text{s}$ |
| **Nivel Ultrasónico JSN-SR04T (Echo)**| Digital (Entrada) | `GPIO 19` | Divisor de tensión $5.0\text{V} \rightarrow 3.3\text{V}$ | $20\text{ cm a }450\text{ cm}$ ($\pm 1\text{ mm}$) |
| **Módem Celular GSM/GPRS SIM800L (TX)** | UART2 Serie TTL | `GPIO 16` (RX2) | Conexión a TXD del SIM800L | Baudrate: $9600\text{ bps}$ |
| **Módem Celular GSM/GPRS SIM800L (RX)** | UART2 Serie TTL | `GPIO 17` (TX2) | Conexión a RXD del SIM800L | Baudrate: $9600\text{ bps}$ |
| **Módulo LoRaWAN SX1276 (Opcional)**| Bus SPI | `GPIO 5, 18, 19, 23`| Fallback en zonas sin cobertura celular | $868 / 915\text{ MHz}$ (hasta 15 km) |

---

## 5. Diagrama Esquemático de Conexión de Detalle (ASCII Schematic)

```
                                  +---------------------------------------+
                                  |            ESP32 DEVKIT V1            |
                                  |                                       |
    [ Sonda pH BNC ] ------------>| GPIO 34 (ADC1_6)             GPIO 16  |<------ TXD [ SIM800L ]
    [ Sonda TDS/EC ] ------------>| GPIO 35 (ADC1_7)             GPIO 17  |------> RXD [ SIM800L ]
    [ Turbidez TS-300B (Div 2:1)]>| GPIO 32 (ADC1_4)             GPIO 18  |------> TRIG [ JSN-SR04T ]
    [ Batería 12V (Div 10:1) ]--->| GPIO 33 (ADC1_5)             GPIO 19  |<------ ECHO (Div 5V->3V3) [ JSN-SR04T ]
    [ Temp DS18B20 (Pull-up) ]--->| GPIO 04 (OneWire)            GPIO 23  |------> MOSI [ LoRa SX1276 ]
                                  | 5V                           GND      |
                                  +---------------------------------------+
                                     ^                            |
                                     |                            |
                             +---------------+                    |
                             | BUCK DC-DC 5V |                    |
                             +---------------+                    |
                                     ^                            |
                                     | (12V)                      |
                             +---------------+                    |
                             | BATERÍA Li-ion|<-------------------+ (Tierra Común)
                             +---------------+
```

---

## 6. Sostenibilidad y Economía Circular (30% Materiales Reciclados)

En estricto cumplimiento del numeral 4.a de las bases del concurso:
- **Carcasa Estanca IP67:** Fabricada mediante manufactura aditiva FDM utilizando filamento compuesto con **$30\%$ de plástico reciclado post-consumo (rPET / rPEAD)** obtenido de envases plásticos reciclados.
- **Soportes Mecánicos y Anclajes:** Piezas de sujeción para canal y poste diseñadas en OpenSCAD/FreeCAD e impresas en filamento reciclado de alta resistencia a la intemperie y radiación UV.
- **Autonomía:** Panel solar de 50W y batería de 12Ah LiFePO4 garantizan una autonomía ininterrumpida de **hasta 7 días de operación en días nublados continuos**.
