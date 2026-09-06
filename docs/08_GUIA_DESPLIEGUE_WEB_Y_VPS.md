# ☁️ Sentinel-H2O — Guía de Despliegue en Producción y Servidores VPS

## 1. Requisitos del Servidor (VPS / Cloud)

* **Sistema Operativo**: Ubuntu 22.04 / 24.04 LTS o Debian 12 (Linux x86_64).
* **Hardware Mínimo**: 2 vCPU, 4 GB RAM, 25 GB SSD.
* **Hardware Recomendado**: 4 vCPU, 8 GB RAM, 50 GB SSD (para histórico multi-año y entrenamiento GRU continuo).
* **Puertos de Red Abiertos**:
  * `80/TCP` (HTTP - Aplicación Web y Redirección SSL)
  * `443/TCP` (HTTPS - Tráfico Seguro de Producción)
  * `3000/TCP` (Grafana Dashboards - Opcional tras proxy inverso)
  * `8000/TCP` (FastAPI Core API - Opcional tras proxy inverso)

---

## 2. Instalación de Docker y Docker Compose

En una máquina Ubuntu limpia, ejecuta:

```bash
# 1. Actualizar repositorios
sudo apt-get update && sudo apt-get upgrade -y

# 2. Instalar utilidades y Docker
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Permitir ejecución sin sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Despliegue de Sentinel-H2O

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/sentinel-h2o.git
cd sentinel-h2o

# 2. Configurar variables de entorno de producción
cp .env.example .env

# 3. Editar credenciales seguras
nano .env
# (Configura contraseñas fuertes para MYSQL_PASSWORD, GRAFANA_ADMIN_PASSWORD y MASTER_API_KEY)

# 4. Levantar el stack completo
docker compose up -d --build
```

---

## 4. Verificación del Despliegue

```bash
# Inspeccionar estado de los contenedores
docker compose ps

# Verificar logs en tiempo real
docker compose logs -f sentinel-backend
docker compose logs -f sentinel-frontend
```

---

## 5. Configuración de Dominio y Certificados SSL (HTTPS) con Let's Encrypt

Para exponer el sistema bajo un dominio público (ej. `sentinel.tudominio.org`):

1. **Instalar Certbot**:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   ```
2. **Generar Certificado**:
   ```bash
   sudo certbot certonly --standalone -d sentinel.tudominio.org
   ```
3. Vincular los certificados `/etc/letsencrypt/live/sentinel.tudominio.org/` en `frontend/nginx.conf`.
