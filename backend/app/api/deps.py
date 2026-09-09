from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.database.models import Usuario, AuditoriaLog
from backend.app.core.security import decode_access_token

security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    token_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Usuario:
    """Valida el JWT y retorna el usuario autenticado activo."""
    token = None
    if token_header:
        token = token_header.credentials
    elif "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
        user = db.query(Usuario).filter(Usuario.id_usuario == user_id_int, Usuario.activo == True).first()
    except (ValueError, TypeError):
        user = db.query(Usuario).filter(Usuario.email == str(user_id), Usuario.activo == True).first()
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


def require_roles(allowed_roles: List[str]):
    """Generador de dependencias RBAC para verificar roles de usuario."""
    def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in allowed_roles:
            roles_str = ", ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Se requiere uno de los roles: {roles_str}"
            )
        return current_user
    return role_checker


def register_audit_event(
    db: Session,
    usuario: Optional[Usuario],
    accion: str,
    tabla_afectada: str,
    id_registro_afectado: Optional[str] = None,
    valores_previos: Optional[Dict[str, Any]] = None,
    valores_nuevos: Optional[Dict[str, Any]] = None,
    ip_origen: Optional[str] = None
) -> Optional[AuditoriaLog]:
    """Registra una entrada en la tabla de auditoria_logs para trazabilidad forense."""
    try:
        log_entry = AuditoriaLog(
            id_usuario=usuario.id_usuario if usuario else None,
            email_usuario=usuario.email if usuario else "SISTEMA",
            accion=accion,
            tabla_afectada=tabla_afectada,
            id_registro_afectado=str(id_registro_afectado) if id_registro_afectado is not None else None,
            valores_previos_json=valores_previos,
            valores_nuevos_json=valores_nuevos,
            ip_origen=ip_origen
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        db.rollback()
        print(f"[AUDIT_ERROR] Error al registrar auditoria: {e}")
        return None
