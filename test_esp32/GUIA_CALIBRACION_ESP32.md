# 🧪 GUÍA DE CALIBRACIÓN Y TESTING DE SENSORES EN ESP32
## Proyecto Sentinel-H2O — Cuenca Chancay-Huaral

Esta guía detalla las conexiones de hardware, divisores de tensión y el procedimiento paso a paso para calibrar los 5 sensores en el **ESP32 DevKit V1** utilizando los sketches interactivos ubicados en `test_esp32/PRUEBA DE SENSORES/`.

---

## ⚡ 1. Arquitectura de Alimentación y Niveles de Voltaje

El sistema se alimenta de una batería de **12V 7Ah** regulada con un convertidor **LM2596S (Buck)** ajustado estrictamente a **5.0V DC**.

| Sensor / Componente | Voltaje VCC | Pin ESP32 | Circuito / Acondicionamiento de Señal |
| :--- | :--- | :--- | :--- |
| **ESP32 DevKit V1** | 5.0V (VIN) | VIN / GND | Regulador LDO interno genera los 3.3V |
| **Sensor de pH (PH-4502C)** | 5.0V | GPIO 32 (ADC1_CH4) | Salida analógica `Po` centrada en ~2.50V (ajustable por potenciómetro) |
| **Sensor Turbidez (TS-300B)** | 5.0V | GPIO 33 (ADC1_CH5) | **Divisor 10k y 20k**: $V_{esp32} = V_{sensor} \times \frac{2}{3} \rightarrow$ máx 3.33V |
| **Sensor TDS (Keyestudio)** | **3.3V** | GPIO 34 (ADC1_CH6) | Alimentado desde pin `3V3` del ESP32 (Salida 0 ~ 2.3V segura) |
| **Temperatura (DS18B20)** | **3.3V** | GPIO 27 | Resistencia **PULL-UP de 4.7kΩ** entre DATA (GPIO 27) y 3.3V |
| **Ultrasonido (JSN-SR04T)** | 5.0V | TRIG: 25 / ECHO: 26 | **Divisor en ECHO 1k y 2k**: $5V \times \frac{2}{3} = 3.33V$ hacia GPIO 26 |
| **Monitoreo Batería 12V** | 12.0V Batería | GPIO 35 (ADC1_CH7) | **Divisor 100k y 10k**: Factor de escala 11.0x hacia GPIO 35 |

> **Nota técnica fundamental del ESP32:** Todos los sensores analógicos están asignados exclusivamente al **ADC1** (pines 32 a 39). El ADC2 queda inhabilitado cuando se activa la radiofrecuencia (Wi-Fi o GSM SIM800L).

---

## 🔬 2. Procedimiento de Calibración por Sensor

### 2.1 Sensor de pH (`PH-4502C`)
* **Ubicación del código:** `test_esp32/PRUEBA DE SENSORES/ph/ph.ino`
* **Muestras:** Soluciones buffer calibradas a pH 4.01, pH 7.00 y pH 10.01.
* **Velocidad del Monitor Serie:** `115200 baudios`.

#### Procedimiento:
1. **Enjuague inicial:** Lava la sonda con agua destilada y sécala con papel suave (sin frotar el bulbo de vidrio).
2. **Ajuste de Hardware a pH 7.00:**
   - Sumerge la sonda en la solución buffer **pH 7.00**.
   - Observa la columna `Voltaje` en el Monitor Serie.
   - Con un perillero pequeño, gira suavemente el **potenciómetro azul** del módulo PH-4502C hasta que el voltaje medido marque **2.500 V** (o lo más cercano posible).
   - En el Monitor Serie, escribe la tecla `'7'` y presiona Enter. Esto registrará el offset neutro exacto ($V_{ph7}$).
3. **Calibración Ácida a pH 4.01:**
   - Enjuaga con agua destilada y seca.
   - Sumerge en la solución buffer **pH 4.01**.
   - En el Monitor Serie, escribe la tecla `'4'` y presiona Enter.
   - El código calculará automáticamente la pendiente ácida:
     $$\text{pendiente} = \frac{V_{ph4} - V_{ph7}}{7.00 - 4.01} \quad (\text{V/pH})$$
4. **Calibración Alcalina a pH 10.01:**
   - Enjuaga con agua destilada y seca.
   - Sumerge en la solución buffer **pH 10.01**.
   - En el Monitor Serie, escribe la tecla `'1'` y presiona Enter.
   - El código calculará la pendiente combinada (regresión de 3 puntos).
5. **Obtención de parámetros:**
   - Presiona la tecla `'p'` para imprimir el reporte final.
   - Anota `ph_offset_v` (ej. 2.500) y `ph_slope` (ej. -0.184) para el backend y firmware.

---

### 2.2 Sensor de Salinidad / TDS (`Keyestudio TDS V1.0`)
* **Ubicación del código:** `test_esp32/PRUEBA DE SENSORES/tds/tds.ino`
* **Muestra:** Solución estándar de Cloruro de Potasio (KCl) (habitualmente 1413 µS/cm o su equivalente en ppm).
* **Sensor complementario:** Requiere tener conectado el DS18B20 en GPIO 27 para compensación térmica activa.

#### Procedimiento:
1. **Calibración de Cero (al aire):**
   - Con la sonda limpia y totalmente seca al aire, observa el voltaje ($V \approx 0.00\text{V}$).
   - Escribe `'0'` en el Monitor Serie para fijar el offset de cero (`tds_offset_v`).
2. **Inmersión en KCl y Compensación Térmica:**
   - Sumerge la sonda TDS y el sensor DS18B20 juntos en la solución de KCl.
   - Espera 30 segundos a que la temperatura se estabilice.
3. **Ajuste del Factor K:**
   - Si tu solución indica conductividad: Escribe `EC 1413` (o el valor de uS/cm del envase) y presiona Enter.
   - Si tu solución indica ppm: Escribe `CAL 707` (o el valor en ppm) y presiona Enter.
   - El código calculará el factor de calibración exacto (`factorCalibracionTDS`).
4. **Reporte:** Presiona `'p'` para ver los valores finales.

---

### 2.3 Sensor Óptico de Turbidez (`TS-300B`)
* **Ubicación del código:** `test_esp32/PRUEBA DE SENSORES/turbidez/turbidez.ino`
* **Divisor de Tensión Requerido:** Señal TS-300B $\rightarrow$ 10k $\rightarrow$ GPIO 33 $\rightarrow$ 20k $\rightarrow$ GND.
* **Muestras:**
  1. Agua de grifo (Agua limpia / transparente = 0 NTU).
  2. Café cargado (Máxima turbidez / saturación óptica).
  3. Agua con tierra / sedimentos de canal.

#### Procedimiento:
1. **Punto Cero (Agua Limpia):**
   - Sumerge la sonda en un vaso con **agua de grifo limpia**.
   - Espera 10 segundos a que la lectura se estabilice.
   - Escribe `'c'` en el Monitor Serie. Se guardará $V_{clear}$ (reconstruido a ~3.8V - 4.2V a nivel sensor).
2. **Punto Máximo (Café Cargado):**
   - Limpia la sonda y sumérgela en un vaso con **café cargado oscuro**.
   - Escribe `'t'` en el Monitor Serie. Se guardará $V_{turbid}$ (reconstruido a ~2.4V - 2.6V a nivel sensor).
3. **Verificación intermedia (Agua con sedimentos):**
   - Agita un vaso con agua y tierra. Observa cómo el valor NTU sube en tiempo real y decae gradualmente conforme los sedimentos decantan.
4. **Reporte:** Presiona `'p'` para copiar `turb_v_clear` y `turb_v_turbid`.

---

### 2.4 Sensor de Temperatura (`DS18B20`)
* **Ubicación del código:** `test_esp32/PRUEBA DE SENSORES/temp/temp.ino`
* **Patrón de Referencia:** Termómetro analógico de mercurio.
* **Resistencia requerida:** 4.7kΩ Pull-Up entre GPIO 27 y 3.3V.

#### Procedimiento:
1. Coloca la sonda sumergible DS18B20 junto al bulbo del termómetro de mercurio dentro de un recipiente con agua a temperatura ambiente.
2. Espera 2 minutos para equilibrio térmico.
3. Lee visualmente la temperatura en el termómetro de mercurio (por ejemplo: `21.4` °C).
4. Escribe en el Monitor Serie: `21.4` y presiona Enter.
5. El código calculará:
   $$\text{offsetTemp} = T_{\text{mercurio}} - T_{\text{leída}}$$
6. Presiona `'p'` para ver el offset calibrado.

---

### 2.5 Sensor Ultrasónico de Nivel (`JSN-SR04T`)
* **Ubicación del código:** `test_esp32/PRUEBA DE SENSORES/ultrasonic/ultrasonic.ino`
* **Divisor de Tensión Requerido:** Pin ECHO del sensor $\rightarrow$ 1k $\rightarrow$ GPIO 26 $\rightarrow$ 2k $\rightarrow$ GND.
* **Herramienta:** Regla métrica o flexómetro.

#### Procedimiento:
1. Coloca el transductor ultrasónico apuntando perpendicularmente hacia una superficie plana y sólida (pared o madera) a una distancia conocida (por ejemplo, a 50 cm).
   *(Nota: Respeta la zona ciega del JSN-SR04T, que es de ~20 cm).*
2. Mide la distancia física exacta con la regla (ejemplo: 50.0 cm).
3. Escribe en el Monitor Serie: `DIST 50.0` y presiona Enter.
4. Para definir la altura del canal: Si el sensor estará instalado a 150 cm del lecho del canal, escribe: `ALT 150.0`.
5. Observa cómo el sistema calcula automáticamente la **lámina de agua (tirante)**:
   $$\text{Tirante (cm)} = \text{Altura Fondo} - \text{Distancia Medida}$$

---

## 🚀 3. ¿Cómo transferir estos valores a tu Proyecto?

Una vez completada la calibración de cada sensor:

1. **En la Plataforma Web / Base de Datos:**
   Actualiza la tabla `calibraciones_nodo` del nodo con los valores obtenidos:
   * `ph_offset_v`: Valor obtenido con buffer 7 (ej. 2.500)
   * `ph_slope`: Pendiente obtenida (ej. -0.184)
   * `tds_factor_k`: Factor K obtenido con KCl (ej. 0.500)
   * `tds_offset_v`: Offset de cero (ej. 0.000)
   * `turb_v_clear`: Voltaje con agua limpia (ej. 4.200)
   * `turb_v_turbid`: Voltaje con café (ej. 2.500)
   * `distancia_fondo_sensor_cm`: Altura sobre el canal (ej. 150.0)

2. **En el Firmware del ESP32 (`firmware_esp32/config.h`):**
   Verifica que los umbrales de alerta crítica y factores de divisores coincidan exactamente con tu hardware instalado.
