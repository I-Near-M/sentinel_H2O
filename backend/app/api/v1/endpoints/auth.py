import datetime
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.database.models import (
    Usuario, Entidad, TipoEntidad, CargoInstitucional, TipoRecursoHidrico, AuditoriaLog, ConfiguracionSistema
)
from backend.app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from backend.app.core.config import settings
from backend.app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse, UserCreate, UserUpdate, ProfileUpdate, AdminBootstrap, AuditLogResponse
)
from backend.app.schemas.system import SetupStatusOut, SystemConfigOut
from backend.app.api.deps import get_current_user, require_roles, register_audit_event
from backend.app.api.v1.endpoints.system import get_or_create_system_config, _to_system_config_out

router = APIRouter(prefix="/auth", tags=["Autenticación & Gobernanza RBAC"])


def _to_user_response(user: Usuario) -> UserResponse:
    try:
        nombre_entidad = user.entidad.nombre_entidad if user.entidad else None
    except Exception:
        nombre_entidad = None
    created_at = user.created_at or datetime.datetime.now(datetime.timezone.utc)
    return UserResponse(
        id_usuario=str(user.id_usuario),
        id_entidad=str(user.id_entidad) if user.id_entidad else None,
        id_cargo=str(user.id_cargo) if getattr(user, 'id_cargo', None) else None,
        nombre_entidad=nombre_entidad,
        email=user.email,
        nombres=user.nombres or "Usuario",
        apellidos=user.apellidos or "Sistema",
        nombre_completo=user.nombre_completo or f"{user.nombres} {user.apellidos}".strip(),
        telefono_contacto=user.telefono_contacto,
        cargo_institucional=user.cargo_institucional,
        rol=user.rol,
        activo=bool(user.activo),
        ultimo_login=user.ultimo_login,
        created_at=created_at
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
    try:
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
        
        # Actualizar último login de forma segura
        try:
            user.ultimo_login = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            print(f"[AUTH_WARNING] No se pudo actualizar ultimo_login: {e}")

        token_data = {
            "sub": str(user.id_usuario),
            "email": user.email,
            "rol": user.rol,
            "nombre_completo": user.nombre_completo,
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
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno en autenticación: {str(e)}"
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
    
    try:
        # 1. Resolver o Registrar la Entidad Administradora de la Cuenca
        entidad = None
        if payload.nombre_entidad and payload.nombre_entidad.strip():
            nombre_ent = payload.nombre_entidad.strip()
            entidad = db.query(Entidad).filter(Entidad.nombre_entidad == nombre_ent).first()
            if not entidad:
                cod_tipo = (payload.tipo_entidad or "JUNTA_USUARIOS").strip().upper()
                tipo_ent = db.query(TipoEntidad).filter(
                    (TipoEntidad.codigo == cod_tipo) | (TipoEntidad.id_tipo_entidad == cod_tipo)
                ).first()
                if not tipo_ent:
                    tipo_ent = db.query(TipoEntidad).first()
                
                id_tipo = tipo_ent.id_tipo_entidad if tipo_ent else "TE-02-JUNTA-USUARIOS"
                entidad = Entidad(
                    nombre_entidad=nombre_ent,
                    id_tipo_entidad=id_tipo,
                    telefono_contacto=payload.telefono_contacto,
                    email_contacto=payload.email.strip().lower(),
                    activo=True
                )
                db.add(entidad)
                db.flush()
        else:
            # Fallback: entidad raíz si no se especificó nombre
            entidad = db.query(Entidad).first()

        # 2. Resolver o Crear el Cargo Institucional
        cargo = None
        cargo_nombre = (payload.cargo_institucional or "Superadministrador de Plataforma").strip()
        if entidad and entidad.id_tipo_entidad:
            cargo = db.query(CargoInstitucional).filter(
                CargoInstitucional.id_tipo_entidad == entidad.id_tipo_entidad,
                CargoInstitucional.nombre_cargo == cargo_nombre
            ).first()
            if not cargo:
                codigo_cargo = re.sub(r'[^A-Z0-9_]', '_', cargo_nombre.upper().replace(' ', '_'))[:50]
                cargo = CargoInstitucional(
                    id_tipo_entidad=entidad.id_tipo_entidad,
                    codigo_cargo=codigo_cargo or "ADMIN_GRAL",
                    nombre_cargo=cargo_nombre,
                    nivel_jerarquia=1,
                    descripcion="Cargo institucional asignado al Superadministrador",
                    activo=True
                )
                db.add(cargo)
                db.flush()

        # 3. Registrar el Superadministrador vinculado
        new_user = Usuario(
            email=payload.email.strip().lower(),
            password_hash=hash_password(payload.password),
            nombres=payload.nombres or "Superadministrador",
            apellidos=payload.apellidos or "Principal",
            nombre_completo=payload.nombre_completo.strip(),
            telefono_contacto=payload.telefono_contacto,
            id_entidad=entidad.id_entidad if entidad else None,
            id_cargo=cargo.id_cargo if cargo else None,
            rol="ADMIN_SISTEMA",
            activo=True
        )
        db.add(new_user)
        db.flush()

        # 4. Actualizar o inicializar la configuración del recurso hídrico
        config = get_or_create_system_config(db)
        if payload.nombre_recurso and payload.nombre_recurso.strip():
            config.nombre_recurso = payload.nombre_recurso.strip()
        elif payload.nombre_cuenca and payload.nombre_cuenca.strip():
            config.nombre_recurso = payload.nombre_cuenca.strip()

        if payload.tipo_recurso and payload.tipo_recurso.strip():
            config.tipo_recurso = payload.tipo_recurso.strip().upper()
        if payload.pais and payload.pais.strip():
            config.pais = payload.pais.strip()
        if payload.region and payload.region.strip():
            config.region = payload.region.strip()

        if payload.ubicacion_detallada and payload.ubicacion_detallada.strip():
            config.ubicacion_detallada = payload.ubicacion_detallada.strip()
        elif payload.descripcion_cuenca and payload.descripcion_cuenca.strip():
            config.ubicacion_detallada = payload.descripcion_cuenca.strip()

        if payload.latitud_centro is not None:
            config.latitud_centro = payload.latitud_centro
        if payload.longitud_centro is not None:
            config.longitud_centro = payload.longitud_centro
        if payload.zoom_inicial is not None:
            config.zoom_inicial = payload.zoom_inicial

        # Vincular TipoRecursoHidrico si existe en catálogo
        tipo_rec = db.query(TipoRecursoHidrico).filter(TipoRecursoHidrico.codigo == config.tipo_recurso).first()
        if tipo_rec:
            config.id_tipo_recurso = tipo_rec.id_tipo_recurso

        if entidad:
            config.id_entidad_administradora = entidad.id_entidad
        config.personal_encargado = new_user.nombre_completo
        config.telefono_contacto_encargado = new_user.telefono_contacto
        config.email_contacto_encargado = new_user.email
        config.configuracion_inicial_completada = True
        config.id_superadmin_responsable = new_user.id_usuario
        config.actualizado_por_usuario_id = new_user.id_usuario
        config.updated_at = datetime.datetime.now(datetime.timezone.utc)

        db.commit()
        db.refresh(new_user)
        db.refresh(config)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante el aprovisionamiento atómico del sistema: {str(e)}"
        )

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
            "entidad": entidad.nombre_entidad if entidad else None,
            "recurso": config.nombre_recurso,
            "tipo": config.tipo_recurso,
            "pais": config.pais,
            "region": config.region
        },
        ip_origen=client_ip
    )

    return _to_user_response(new_user)


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_CENTRAL", "OPERADOR_JUNTA", "OPERADOR_AGRARIO"]))
):
    """Lista los usuarios registrados. Si es ADMIN o CENTRAL ve todos; si es de entidad ve solo los de su entidad."""
    if current_user.rol in ["ADMIN_SISTEMA", "OPERADOR_CENTRAL"]:
        users = db.query(Usuario).order_by(Usuario.created_at.desc()).all()
    else:
        users = db.query(Usuario).filter(Usuario.id_entidad == current_user.id_entidad).order_by(Usuario.created_at.desc()).all()
    
    return [_to_user_response(u) for u in users]


@router.post("/users", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_CENTRAL", "OPERADOR_JUNTA", "OPERADOR_AGRARIO"]))
):
    """Crea un nuevo usuario con rol asignado."""
    # Operador agrario o de junta solo puede crear roles de campo/lectura para su misma entidad
    if current_user.rol in ["OPERADOR_JUNTA", "OPERADOR_AGRARIO"]:
        if payload.rol in ["ADMIN_SISTEMA", "OPERADOR_CENTRAL", "OPERADOR_JUNTA", "OPERADOR_AGRARIO"]:
            raise HTTPException(status_code=403, detail="No tiene permisos para crear usuarios con rol administrativo o central.")
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
    user_id: str,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_CENTRAL", "OPERADOR_JUNTA", "OPERADOR_AGRARIO"]))
):
    """Actualiza la información de un usuario."""
    user = db.query(Usuario).filter(Usuario.id_usuario == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if current_user.rol in ["OPERADOR_JUNTA", "OPERADOR_AGRARIO"] and user.id_entidad != current_user.id_entidad:
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
        user.telefono_contacto = payload.telefono_contacto.strip() if payload.telefono_contacto else None
    if payload.cargo_institucional is not None:
        user.cargo_institucional = payload.cargo_institucional
    if payload.email is not None and payload.email.strip().lower() != user.email:
        # Validar duplicados
        exist_mail = db.query(Usuario).filter(Usuario.email == payload.email.strip().lower()).first()
        if exist_mail:
            raise HTTPException(status_code=400, detail="El correo ya se encuentra en uso.")
        user.email = payload.email.strip().lower()
    if payload.rol is not None and current_user.rol in ["ADMIN_SISTEMA", "OPERADOR_CENTRAL"]:
        user.rol = payload.rol
    if payload.id_entidad is not None and current_user.rol in ["ADMIN_SISTEMA", "OPERADOR_CENTRAL"]:
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
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_CENTRAL"]))
):
    """Desactiva lógicamente un usuario."""
    if str(current_user.id_usuario) == str(user_id):
        raise HTTPException(status_code=400, detail="No puede desactivar su propia cuenta de superadministrador.")

    user = db.query(Usuario).filter(Usuario.id_usuario == str(user_id)).first()
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


