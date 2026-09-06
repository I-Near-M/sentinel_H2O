# ⚡ Sentinel-H2O — Hardware, Sensores y Conexionado ESP32

## 1. Arquitectura de la Estación Telemétrica de Campo

Cada estación telemétrica de **Sentinel-H2O** es una unidad autónoma de bajo costo ($< \$180\text{ USD}$ en materiales) diseñada para operar a la intemperie en climas extremos (desde la puna a $> 4,300\text{ msnm}$ hasta valles desérticos costeros).

```
                     ┌───────────────────────────────────┐
                     │   PANEL SOLAR MONOCRISTALINO 50W  │
                     └─────────────────┬─────────────────┘
                                       │ (18V DC)
                                       ▼
                     ┌───────────────────────────────────┐
                     │ CONTROLADOR DE CARGA SOLAR MPPT   │
                     └─────────┬───────────────────┬─────┘
                               │                   │
                               ▼                   ▼
                     ┌──────────────────┐ ┌───────────────────────────┐
                     │ BATERÍA LiFePO4  │ │ CONVERTIDOR BUCK DC-DC    │
                     │  12.8V / 12Ah    │ │ (12V -> 5.0V / 3.3V 3A)   │
                     └──────────────────┘ └─────────────┬─────────────┘
                                                        │
 ┌──────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┐
 │                                              MICROCONTROLADOR ESP32-WROOM                                   │
 ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                                             │
 │   [GPIO 34 / ADC1_CH6] ◄─── Acondicionador Analógico Sonda de pH Industrial (BNC)                           │
 │   [GPIO 35 / ADC1_CH7] ◄─── Acondicionador Analógico Sensor Conductividad Eléctrica EC (K=1.0)              │
 │   [GPIO 32 / ADC1_CH4] ◄─── Sensor de Turbidez Óptica Infrarroja (0 - 1,000 NTU)                           │
 │   [GPIO 33 / ADC1_CH5] ◄─── Divisor Resistivo Divisor Batería 12V (R1=100k, R2=20k)                        │
 │   [GPIO 4  / OneWire]  ◄─── Sonda de Temperatura Digital Sumergible DS18B20 (Acero Inox)                   │
 │   [GPIO 18 / Trigger]  ───► Sensor de Nivel Ultrasónico a Prueba de Agua JSN-SR04T                         │
 │   [GPIO 19 / Echo]     ◄─── Sensor de Nivel Ultrasónico a Prueba de Agua JSN-SR04T                         │
 │   [GPIO 16 / RX2]      ◄─── Módem Celular GSM/GPRS SIM800L (TXD)                                           │
 │   [GPIO 17 / TX2]      ───► Módem Celular GSM/GPRS SIM800L (RXD)                                           │
 │   [GPIO 23 / SPI_MOSI] ───► Módulo LoRaWAN SX1276 (868/915 MHz) [Opcional / Fallback Sin Cobertura Celular]│
 │                                                                                                             │
 └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Asignación de Pines (Pinout ESP32)

| Componente / Sensor | Tipo de Señal | Pin ESP32 | Parámetro Calibrado |
| :--- | :--- | :---: | :--- |
| **Sonda pH BNC** | Analógica ($0 - 3.3\text{V}$) | `GPIO 34` | $V_{\text{offset}} = 2.50\text{V}$, $\text{slope} = -3.50$ |
| **Sensor EC / TDS** | Analógica ($0 - 3.3\text{V}$) | `GPIO 35` | $k_{\text{factor}} = 1.0$, compensación a 25°C |
| **Sonda Turbidez** | Analógica ($0 - 3.3\text{V}$) | `GPIO 32` | $V_{\text{clear}} = 4.10\text{V}$, $V_{\text{turbid}} = 2.50\text{V}$ |
| **Sensor Voltaje Batería** | Analógica ($0 - 3.3\text{V}$) | `GPIO 33` | Divisor $1/6$ ($0 - 15.0\text{V} \rightarrow 0 - 2.5\text{V}$) |
| **Termistor DS18B20** | Digital (1-Wire) | `GPIO 4` | Resistencia Pull-Up $4.7\text{k}\Omega$ |
| **Ultrasónico JSN-SR04T** | Digital (Trigger / Echo)| `GPIO 18 / 19`| Distancia al fondo del canal $D_0 = 120\text{ cm}$ |
| **Módem SIM800L (UART2)**| Serie TTL ($9600\text{ bps}$)| `GPIO 16 / 17`| Transmisión HTTP POST / SMS |

---

## 3. Firmware PlatformIO (`firmware/`)

El firmware está estructurado para operar en ciclos de bajo consumo (*Deep Sleep* configurable):
1. **Despertar**: Activa los reguladores de potencia de los sensores.
2. **Precalentamiento**: Espera $500\text{ ms}$ para estabilización electroquímica.
3. **Muestreo Multimuestra**: Toma 10 lecturas consecutivas por canal analógico y aplica la mediana para filtrar ruido electromagnético.
4. **Composición JSON**: Empaqueta voltajes crudos, temperatura, distancia y diagnósticos de batería y señal celular CSQ.
5. **Transmisión**: Envía payload vía HTTP POST al backend API. Si la red celular falla, conmuta automáticamente al transmisor LoRaWAN o encola en memoria EEPROM/Flash no volátil.
6. **Deep Sleep**: Entra en reposo profundo durante $15$ minutos para maximizar la autonomía solar.
