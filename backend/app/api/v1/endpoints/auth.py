import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.database.models import Usuario, Entidad, AuditoriaLog, ConfiguracionSistema
from backend.app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from backend.app.core.config import settings
from backend.app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse, UserCreate, UserUpdate, ProfileUpdate, AdminBootstrap, AuditLogResponse
)
from backend.app.schemas.system import SetupStatusOut, SystemConfigOut, DashboardGrafanaItem, DEFAULT_GRAFANA_DASHBOARDS
from backend.app.api.deps import get_current_user, require_roles, register_audit_event
from backend.app.api.v1.endpoints.system import get_or_create_system_config, _to_system_config_out

router = APIRouter(prefix="/auth", tags=["Autenticación & Gobernanza RBAC"])


def _to_user_response(user: Usuario) -> UserResponse:
    nombre_entidad = user.entidad.nombre_entidad if user.entidad else None
    return UserResponse(
        id_usuario=user.id_usuario,
        id_entidad=user.id_entidad,
        nombre_entidad=nombre_entidad,
        email=user.email,
        nombre_completo=user.nombre_completo,
        telefono_contacto=user.telefono_contacto,
        cargo_institucional=user.cargo_institucional,
        rol=user.rol,
        activo=user.activo,
        ultimo_login=user.ultimo_login,
        created_at=user.created_at
    )


@router.get("/setup-status", response_model=SetupStatusOut)
def get_setup_status(db: Session = Depends(get_db)):
    """
    Verifica si el sistema requiere el aprovisionamiento del primer superadministrador
    o si la instalación ya ha sido completada.
    """
    users_count = db.query(Usuario).count()
    config = get_or_create_system_config(db)
    config_out = _to_system_config_out(config)

    return SetupStatusOut(
        is_first_setup=users_count == 0,
        setup_completed=users_count > 0,
        config=config_out
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Inicia sesión con email y contraseña, retornando el token JWT y el perfil."""
    user = db.query(Usuario).filter(Usuario.email == credentials.email.strip().lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (correo o contraseña no válidos)"
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario desactivada. Contacte al Administrador del Sistema."
        )
    
    # Actualizar último login
    user.ultimo_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(user)

    token_data = {
        "sub": str(user.id_usuario),
        "email": user.email,
        "rol": user.rol,
        "id_entidad": user.id_entidad
    }
    access_token = create_access_token(token_data)

    # Registrar evento de login en auditoría
    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=user,
        accion="LOGIN_SUCCESS",
        tabla_afectada="usuarios",
        id_registro_afectado=str(user.id_usuario),
        ip_origen=client_ip
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_to_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: Usuario = Depends(get_current_user)):
    """Retorna el perfil del usuario autenticado actual."""
    return _to_user_response(current_user)


@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    payload: ProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Permite al usuario autenticado actualizar sus datos personales o su contraseña."""
    old_values = {
        "nombre_completo": current_user.nombre_completo,
        "telefono_contacto": current_user.telefono_contacto,
        "cargo_institucional": current_user.cargo_institucional,
    }
    if payload.nombre_completo is not None and len(payload.nombre_completo.strip()) > 0:
        current_user.nombre_completo = payload.nombre_completo.strip()
    if payload.telefono_contacto is not None:
        current_user.telefono_contacto = payload.telefono_contacto.strip()
    if payload.cargo_institucional is not None:
        current_user.cargo_institucional = payload.cargo_institucional.strip()
    if payload.password is not None and len(payload.password.strip()) >= 6:
        current_user.password_hash = hash_password(payload.password.strip())
    
    db.commit()
    db.refresh(current_user)

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=current_user,
        accion="UPDATE_OWN_PROFILE",
        tabla_afectada="usuarios",
        id_registro_afectado=str(current_user.id_usuario),
        valores_previos=old_values,
        valores_nuevos={"nombre_completo": current_user.nombre_completo, "telefono": current_user.telefono_contacto},
        ip_origen=client_ip
    )

    return _to_user_response(current_user)


@router.post("/bootstrap-admin", response_model=UserResponse)
def bootstrap_first_admin(payload: AdminBootstrap, request: Request, db: Session = Depends(get_db)):
    """
    Permite inicializar el PRIMER superadministrador del sistema y la identidad de la cuenca
    si la base de datos está limpia. Si ya existen usuarios, este endpoint queda bloqueado.
    """
    users_count = db.query(Usuario).count()
    if users_count > 0:
        # Si ya existen usuarios, bloquear estrictamente el endpoint
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El sistema ya ha sido inicializado con un Superadministrador. Inicie sesión para continuar."
        )
    
    # Validar que no exista el correo
    existing = db.query(Usuario).filter(Usuario.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado.")
    
    new_user = Usuario(
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        nombre_completo=payload.nombre_completo.strip(),
        telefono_contacto=payload.telefono_contacto,
        cargo_institucional=payload.cargo_institucional or "Superadministrador de Sistema",
        rol="ADMIN_SISTEMA",
        activo=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Actualizar o inicializar la configuración de la cuenca en el mismo paso
    config = get_or_create_system_config(db)
    if payload.nombre_cuenca and payload.nombre_cuenca.strip():
        config.nombre_cuenca = payload.nombre_cuenca.strip()
    if payload.pais_region and payload.pais_region.strip():
        config.pais_region = payload.pais_region.strip()
    if payload.descripcion_cuenca and payload.descripcion_cuenca.strip():
        config.descripcion_cuenca = payload.descripcion_cuenca.strip()
    if payload.latitud_centro is not None:
        config.latitud_centro = payload.latitud_centro
    if payload.longitud_centro is not None:
        config.longitud_centro = payload.longitud_centro
    if payload.zoom_inicial is not None:
        config.zoom_inicial = payload.zoom_inicial
    config.actualizado_por_usuario_id = new_user.id_usuario
    config.updated_at = datetime.datetime.now(datetime.timezone.utc)

    db.commit()
    db.refresh(config)

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=new_user,
        accion="BOOTSTRAP_ADMIN_CREATED",
        tabla_afectada="usuarios",
        id_registro_afectado=str(new_user.id_usuario),
        valores_nuevos={
            "email": new_user.email,
            "rol": new_user.rol,
            "cuenca": config.nombre_cuenca,
            "pais": config.pais_region
        },
        ip_origen=client_ip
    )

    return _to_user_response(new_user)


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_JUNTA"]))
):
    """Lista los usuarios registrados. Si es ADMIN ve todos; si es OPERADOR ve solo los de su entidad."""
    if current_user.rol == "ADMIN_SISTEMA":
        users = db.query(Usuario).order_by(Usuario.created_at.desc()).all()
    else:
        users = db.query(Usuario).filter(Usuario.id_entidad == current_user.id_entidad).order_by(Usuario.created_at.desc()).all()
    
    return [_to_user_response(u) for u in users]


@router.post("/users", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_JUNTA"]))
):
    """Crea un nuevo usuario con rol asignado."""
    # Operador de junta solo puede crear Tomeros o Auditores para su misma entidad
    if current_user.rol == "OPERADOR_JUNTA":
        if payload.rol in ["ADMIN_SISTEMA", "OPERADOR_JUNTA"]:
            raise HTTPException(status_code=403, detail="No tiene permisos para crear usuarios con rol administrativo.")
        payload.id_entidad = current_user.id_entidad

    existing = db.query(Usuario).filter(Usuario.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    new_user = Usuario(
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        nombre_completo=payload.nombre_completo.strip(),
        telefono_contacto=payload.telefono_contacto,
        cargo_institucional=payload.cargo_institucional,
        rol=payload.rol,
        id_entidad=payload.id_entidad,
        activo=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=current_user,
        accion="CREATE_USER",
        tabla_afectada="usuarios",
        id_registro_afectado=str(new_user.id_usuario),
        valores_nuevos={"email": new_user.email, "rol": new_user.rol, "nombre": new_user.nombre_completo},
        ip_origen=client_ip
    )

    return _to_user_response(new_user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_JUNTA"]))
):
    """Actualiza la información de un usuario."""
    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if current_user.rol == "OPERADOR_JUNTA" and user.id_entidad != current_user.id_entidad:
        raise HTTPException(status_code=403, detail="No puede editar usuarios de otra entidad.")

    old_values = {
        "nombre_completo": user.nombre_completo,
        "rol": user.rol,
        "activo": user.activo,
        "id_entidad": user.id_entidad
    }

    if payload.nombre_completo is not None:
        user.nombre_completo = payload.nombre_completo.strip()
    if payload.telefono_contacto is not None:
        user.telefono_contacto = payload.telefono_contacto
    if payload.cargo_institucional is not None:
        user.cargo_institucional = payload.cargo_institucional
    if payload.email is not None and payload.email.strip().lower() != user.email:
        # Validar duplicados
        exist_mail = db.query(Usuario).filter(Usuario.email == payload.email.strip().lower()).first()
        if exist_mail:
            raise HTTPException(status_code=400, detail="El correo ya se encuentra en uso.")
        user.email = payload.email.strip().lower()
    if payload.rol is not None and current_user.rol == "ADMIN_SISTEMA":
        user.rol = payload.rol
    if payload.id_entidad is not None and current_user.rol == "ADMIN_SISTEMA":
        user.id_entidad = payload.id_entidad
    if payload.activo is not None:
        user.activo = payload.activo
    if payload.password is not None and len(payload.password.strip()) > 0:
        user.password_hash = hash_password(payload.password.strip())

    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=current_user,
        accion="UPDATE_USER",
        tabla_afectada="usuarios",
        id_registro_afectado=str(user.id_usuario),
        valores_previos=old_values,
        valores_nuevos={"nombre_completo": user.nombre_completo, "rol": user.rol, "activo": user.activo},
        ip_origen=client_ip
    )

    return _to_user_response(user)


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Desactiva lógicamente un usuario."""
    if current_user.id_usuario == user_id:
        raise HTTPException(status_code=400, detail="No puede desactivar su propia cuenta de superadministrador.")

    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.activo = False
    db.commit()

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=current_user,
        accion="DEACTIVATE_USER",
        tabla_afectada="usuarios",
        id_registro_afectado=str(user.id_usuario),
        ip_origen=client_ip
    )

    return {"message": "Usuario desactivado correctamente", "id_usuario": user_id}


@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    tabla: Optional[str] = None,
    accion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Consulta los registros inmutables de auditoría forense."""
    query = db.query(AuditoriaLog)
    if tabla:
        query = query.filter(AuditoriaLog.tabla_afectada == tabla)
    if accion:
        query = query.filter(AuditoriaLog.accion == accion)
    
    logs = query.order_by(AuditoriaLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs


# -------------------------------------------------------------------------------------------------
# SINGLE SIGN-ON (SSO) & AUTH PROXY INTEGRATION CON GRAFANA
# -------------------------------------------------------------------------------------------------
@router.get("/grafana-sso")
def grafana_sso_launcher(
    token: Optional[str] = Query(None),
    redirect_to: Optional[str] = Query("/grafana/"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Punto de entrada SSO para acceder a Grafana con un solo clic.
    Establece la cookie segura 'sentinel_sso_token' y redirige a la interfaz de Grafana.
    """
    target_token = token
    if not target_token and request:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            target_token = auth_header.replace("Bearer ", "").strip()
        elif "sentinel_sso_token" in request.cookies:
            target_token = request.cookies.get("sentinel_sso_token")

    response = RedirectResponse(url=redirect_to, status_code=status.HTTP_302_FOUND)
    
    # Limpiar cookies de sesión antiguas de Grafana para evitar conflictos de rotación de tokens
    response.delete_cookie(key="grafana_session", path="/")
    response.delete_cookie(key="grafana_session", path="/grafana/")
    response.delete_cookie(key="grafana_session_expiry", path="/")
    response.delete_cookie(key="grafana_session_expiry", path="/grafana/")

    if target_token:
        # Validar que el token sea legítimo antes de setear la cookie
        payload = decode_access_token(target_token)
        if payload and ("sub" in payload or "email" in payload):
            response.set_cookie(
                key="sentinel_sso_token",
                value=target_token,
                httponly=True,
                samesite="lax",
                max_age=86400 * 7,
                path="/"
            )
    return response


@router.get("/auth-proxy-verify")
def auth_proxy_verify(request: Request, db: Session = Depends(get_db)):
    """
    Subconsulta de autenticación invocada por Nginx (auth_request).
    Lee la cookie 'sentinel_sso_token' o la cabecera 'Authorization',
    valida la sesión activa y retorna las cabeceras de identidad X-WEBAUTH-*
    para que Grafana auto-cree/autentique al usuario con su rol real (Admin/Editor/Viewer).
    """
    token = None
    if "sentinel_sso_token" in request.cookies:
        token = request.cookies.get("sentinel_sso_token")
    elif "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
    elif "token" in request.query_params:
        token = request.query_params.get("token")

    if not token:
        # Retornar 200 sin cabeceras para que Grafana active el usuario anónimo (Viewer)
        return Response(status_code=status.HTTP_200_OK)

    payload = decode_access_token(token)
    if not payload or ("sub" not in payload and "email" not in payload):
        return Response(status_code=status.HTTP_200_OK)

    user_id = payload.get("sub")
    user = None
    if user_id:
        try:
            user_id_int = int(user_id)
            user = db.query(Usuario).filter(Usuario.id_usuario == user_id_int, Usuario.activo == True).first()
        except (ValueError, TypeError):
            user = db.query(Usuario).filter(Usuario.email == str(user_id), Usuario.activo == True).first()

    # Si no se encuentra por id, buscar por email en payload
    if not user and payload.get("email"):
        user = db.query(Usuario).filter(Usuario.email == payload.get("email"), Usuario.activo == True).first()

    # Si no está en BD pero el JWT está firmado legítimamente por nuestro servidor (ej. persistencia tras reinicio)
    email = user.email if user else payload.get("email")
    nombre = user.nombre_completo if user else (payload.get("nombre_completo") or email)
    rol = user.rol if user else payload.get("rol", "ADMIN_SISTEMA")

    if not email:
        return Response(status_code=status.HTTP_200_OK)

    # Mapeo de roles de Sentinel-H2O a Grafana
    # ADMIN_SISTEMA -> Admin
    # OPERADOR_JUNTA -> Editor
    # TOMERO_COMISION, AUDITOR_VISOR -> Viewer
    if rol == "ADMIN_SISTEMA":
        grafana_role = "Admin"
    elif rol == "OPERADOR_JUNTA":
        grafana_role = "Editor"
    else:
        grafana_role = "Viewer"

    headers = {
        "X-WEBAUTH-USER": email,
        "X-WEBAUTH-NAME": nombre or email,
        "X-WEBAUTH-EMAIL": email,
        "X-WEBAUTH-ROLE": grafana_role,
    }
    return Response(status_code=status.HTTP_200_OK, headers=headers)

