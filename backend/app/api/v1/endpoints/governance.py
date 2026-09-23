from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import (
    TipoEntidad, CargoInstitucional, Entidad, TipoUsoAgua, Usuario, RolSistema,
    TipoRecursoHidrico, AuditoriaLog, CultivoAgricola
)
from backend.app.schemas.governance import (
    TipoEntidadResponse, TipoEntidadCreate, TipoEntidadUpdate,
    CargoInstitucionalResponse, CargoInstitucionalCreate, CargoInstitucionalUpdate,
    EntidadCreate, EntidadUpdate, EntidadResponse,
    TipoUsoAguaResponse, TipoUsoAguaCreate, TipoUsoAguaUpdate,
    TipoRecursoHidricoResponse, TipoRecursoHidricoCreate, TipoRecursoHidricoUpdate,
    CultivoAgricolaResponse, CultivoAgricolaCreate, CultivoAgricolaUpdate,
    SystemRoleOut, AuditLogOut
)
from backend.app.api.deps import get_current_user, require_roles

router = APIRouter()


# ========================================================================================
# 1. TIPOS DE ENTIDAD
# ========================================================================================
@router.get("/entity-types", response_model=List[TipoEntidadResponse])
def list_entity_types(
    db: Session = Depends(get_db)
):
    """Retorna el catálogo abierto de tipos de entidades de gobernanza hídrica."""
    return db.query(TipoEntidad).filter(TipoEntidad.activo == True).order_by(TipoEntidad.nombre.asc()).all()


@router.post("/entity-types", response_model=TipoEntidadResponse, status_code=status.HTTP_201_CREATED)
def create_entity_type(
    payload: TipoEntidadCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Crea una nueva clasificación tipológica institucional."""
    existente = db.query(TipoEntidad).filter(TipoEntidad.codigo == payload.codigo.strip().upper()).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El tipo de entidad '{payload.codigo}' ya existe.")
    
    nuevo = TipoEntidad(
        codigo=payload.codigo.strip().upper(),
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        permite_gestion_riego=payload.permite_gestion_riego,
        permite_gestion_piscicultura=payload.permite_gestion_piscicultura,
        activo=payload.activo
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/entity-types/{id_tipo_entidad}", response_model=TipoEntidadResponse)
def update_entity_type(
    id_tipo_entidad: str,
    payload: TipoEntidadUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Actualiza una clasificación institucional."""
    item = db.query(TipoEntidad).filter(TipoEntidad.id_tipo_entidad == id_tipo_entidad).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de entidad no encontrado.")
    
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item


# ========================================================================================
# 1.1 TIPOS DE RECURSO HÍDRICO (Para Setup Wizard y Gemelo 3D)
# ========================================================================================
@router.get("/resource-types", response_model=List[TipoRecursoHidricoResponse])
def list_resource_types(
    db: Session = Depends(get_db)
):
    """Retorna el catálogo de tipos de recurso hídrico para el Gemelo 3D y configuración."""
    return db.query(TipoRecursoHidrico).filter(TipoRecursoHidrico.activo == True).order_by(TipoRecursoHidrico.nombre.asc()).all()


# ========================================================================================
# 2. CARGOS INSTITUCIONALES
# ========================================================================================
@router.get("/roles", response_model=List[CargoInstitucionalResponse])
def list_institutional_roles(
    entity_type_id: Optional[str] = Query(None, description="Filtrar por ID o código de tipo de entidad"),
    db: Session = Depends(get_db)
):
    """Retorna los cargos institucionales tipificados por organización gestora."""
    query = db.query(CargoInstitucional).filter(CargoInstitucional.activo == True)
    if entity_type_id:
        query = query.join(TipoEntidad, CargoInstitucional.id_tipo_entidad == TipoEntidad.id_tipo_entidad).filter(
            (CargoInstitucional.id_tipo_entidad == entity_type_id) | (TipoEntidad.codigo == entity_type_id)
        )
    return query.order_by(CargoInstitucional.nivel_jerarquia.asc(), CargoInstitucional.nombre_cargo.asc()).all()


@router.post("/roles", response_model=CargoInstitucionalResponse, status_code=status.HTTP_201_CREATED)
def create_institutional_role(
    payload: CargoInstitucionalCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Registra un nuevo cargo o función institucional."""
    tipo = db.query(TipoEntidad).filter(TipoEntidad.id_tipo_entidad == payload.id_tipo_entidad).first()
    if not tipo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de entidad no existe.")

    nuevo = CargoInstitucional(
        id_tipo_entidad=payload.id_tipo_entidad,
        codigo_cargo=payload.codigo_cargo.strip().upper(),
        nombre_cargo=payload.nombre_cargo,
        nivel_jerarquia=payload.nivel_jerarquia,
        descripcion=payload.descripcion,
        activo=payload.activo
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/roles/{id_cargo}", response_model=CargoInstitucionalResponse)
def update_institutional_role(
    id_cargo: str,
    payload: CargoInstitucionalUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Actualiza un cargo institucional."""
    cargo = db.query(CargoInstitucional).filter(CargoInstitucional.id_cargo == id_cargo).first()
    if not cargo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cargo no encontrado.")
    
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(cargo, field, val)
    db.commit()
    db.refresh(cargo)
    return cargo


@router.delete("/roles/{id_cargo}", status_code=status.HTTP_200_OK)
def delete_institutional_role(
    id_cargo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Desactiva lógicamente un cargo institucional."""
    cargo = db.query(CargoInstitucional).filter(CargoInstitucional.id_cargo == id_cargo).first()
    if not cargo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cargo no encontrado.")
    cargo.activo = False
    db.commit()
    return {"status": "SUCCESS", "message": f"Cargo '{cargo.nombre_cargo}' desactivado."}


# ========================================================================================
# 3. TIPOS DE USO DE AGUA
# ========================================================================================
@router.get("/water-uses", response_model=List[TipoUsoAguaResponse])
def list_water_uses(
    db: Session = Depends(get_db)
):
    """Retorna los tipos normativos de uso de agua (riego, truchas, poblacional, ecológico)."""
    return db.query(TipoUsoAgua).filter(TipoUsoAgua.activo == True).order_by(TipoUsoAgua.nombre.asc()).all()


@router.post("/water-uses", response_model=TipoUsoAguaResponse, status_code=status.HTTP_201_CREATED)
def create_water_use(
    payload: TipoUsoAguaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Crea una nueva categoría normativa de uso de agua."""
    nuevo = TipoUsoAgua(
        codigo=payload.codigo.strip().upper(),
        nombre=payload.nombre,
        unidad_medida_demanda=payload.unidad_medida_demanda,
        parametros_optimos_json=payload.parametros_optimos_json,
        activo=payload.activo
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/water-uses/{id_tipo_uso}", response_model=TipoUsoAguaResponse)
def update_water_use(
    id_tipo_uso: str,
    payload: TipoUsoAguaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Actualiza una categoría de uso de agua."""
    item = db.query(TipoUsoAgua).filter(TipoUsoAgua.id_tipo_uso == id_tipo_uso).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de uso no encontrado.")
    
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item


# ========================================================================================
# 4. ENTIDADES / ORGANIZACIONES GESTORAS
# ========================================================================================
@router.get("/entities", response_model=List[EntidadResponse])
def list_entities(
    db: Session = Depends(get_db)
):
    """Lista las instituciones y organizaciones registradas en la cuenca."""
    entities = db.query(Entidad).filter(Entidad.activo == True).order_by(Entidad.nombre_entidad.asc()).all()
    res = []
    for e in entities:
        te_nombre = e.tipo_entidad_rel.nombre if e.tipo_entidad_rel else None
        permite_riego = e.tipo_entidad_rel.permite_gestion_riego if e.tipo_entidad_rel else False
        res.append(
            EntidadResponse(
                id_entidad=e.id_entidad,
                id_tipo_entidad=e.id_tipo_entidad,
                nombre_entidad=e.nombre_entidad,
                ruc=e.ruc,
                telefono_contacto=e.telefono_contacto,
                email_contacto=e.email_contacto,
                direccion=e.direccion,
                activo=e.activo,
                tipo_entidad_nombre=te_nombre,
                permite_riego=permite_riego,
                created_at=e.created_at
            )
        )
    return res


@router.post("/entities", response_model=EntidadResponse, status_code=status.HTTP_201_CREATED)
def create_entity(
    payload: EntidadCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Registra una nueva entidad en la plataforma (requiere rol directivo/admin)."""
    tipo = db.query(TipoEntidad).filter(TipoEntidad.id_tipo_entidad == payload.id_tipo_entidad).first()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de entidad '{payload.id_tipo_entidad}' no existe."
        )

    nueva = Entidad(
        id_tipo_entidad=payload.id_tipo_entidad,
        nombre_entidad=payload.nombre_entidad,
        ruc=payload.ruc,
        telefono_contacto=payload.telefono_contacto,
        email_contacto=payload.email_contacto,
        direccion=payload.direccion,
        activo=payload.activo
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return EntidadResponse(
        id_entidad=nueva.id_entidad,
        id_tipo_entidad=nueva.id_tipo_entidad,
        nombre_entidad=nueva.nombre_entidad,
        ruc=nueva.ruc,
        telefono_contacto=nueva.telefono_contacto,
        email_contacto=nueva.email_contacto,
        direccion=nueva.direccion,
        activo=nueva.activo,
        tipo_entidad_nombre=tipo.nombre,
        permite_riego=tipo.permite_gestion_riego,
        created_at=nueva.created_at
    )


@router.get("/entities/{id_entidad}", response_model=EntidadResponse)
def get_entity_detail(
    id_entidad: str,
    db: Session = Depends(get_db)
):
    """Obtiene el detalle de una entidad gestora."""
    e = db.query(Entidad).filter(Entidad.id_entidad == id_entidad, Entidad.activo == True).first()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad no encontrada.")

    te_nombre = e.tipo_entidad_rel.nombre if e.tipo_entidad_rel else None
    permite_riego = e.tipo_entidad_rel.permite_gestion_riego if e.tipo_entidad_rel else False

    return EntidadResponse(
        id_entidad=e.id_entidad,
        id_tipo_entidad=e.id_tipo_entidad,
        nombre_entidad=e.nombre_entidad,
        ruc=e.ruc,
        telefono_contacto=e.telefono_contacto,
        email_contacto=e.email_contacto,
        direccion=e.direccion,
        activo=e.activo,
        tipo_entidad_nombre=te_nombre,
        permite_riego=permite_riego,
        created_at=e.created_at
    )


@router.put("/entities/{id_entidad}", response_model=EntidadResponse)
def update_entity(
    id_entidad: str,
    payload: EntidadUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Actualiza los datos de una entidad institucional."""
    e = db.query(Entidad).filter(Entidad.id_entidad == id_entidad, Entidad.activo == True).first()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad no encontrada.")

    if payload.id_tipo_entidad:
        tipo = db.query(TipoEntidad).filter(TipoEntidad.id_tipo_entidad == payload.id_tipo_entidad).first()
        if not tipo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de entidad no existe.")
        e.id_tipo_entidad = payload.id_tipo_entidad

    if payload.nombre_entidad is not None:
        e.nombre_entidad = payload.nombre_entidad
    if payload.ruc is not None:
        e.ruc = payload.ruc
    if payload.telefono_contacto is not None:
        e.telefono_contacto = payload.telefono_contacto
    if payload.email_contacto is not None:
        e.email_contacto = payload.email_contacto
    if payload.direccion is not None:
        e.direccion = payload.direccion
    if payload.activo is not None:
        e.activo = payload.activo

    db.commit()
    db.refresh(e)

    te_nombre = e.tipo_entidad_rel.nombre if e.tipo_entidad_rel else None
    permite_riego = e.tipo_entidad_rel.permite_gestion_riego if e.tipo_entidad_rel else False

    return EntidadResponse(
        id_entidad=e.id_entidad,
        id_tipo_entidad=e.id_tipo_entidad,
        nombre_entidad=e.nombre_entidad,
        ruc=e.ruc,
        telefono_contacto=e.telefono_contacto,
        email_contacto=e.email_contacto,
        direccion=e.direccion,
        activo=e.activo,
        tipo_entidad_nombre=te_nombre,
        permite_riego=permite_riego,
        created_at=e.created_at
    )


@router.delete("/entities/{id_entidad}", status_code=status.HTTP_200_OK)
def delete_entity(
    id_entidad: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Soft-delete de una entidad."""
    e = db.query(Entidad).filter(Entidad.id_entidad == id_entidad).first()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad no encontrada.")

    e.activo = False
    db.commit()
    return {"message": f"Entidad '{e.nombre_entidad}' desactivada correctamente."}


# ========================================================================================
# 5. TIPOS DE RECURSO HÍDRICO (Catálogo para Digital Twin 3D)
# ========================================================================================
@router.get("/water-resource-types", response_model=List[TipoRecursoHidricoResponse])
def list_water_resource_types(
    db: Session = Depends(get_db)
):
    """Retorna los tipos de recurso hídrico (río, laguna, canal, embalse, acuífero)."""
    return db.query(TipoRecursoHidrico).filter(TipoRecursoHidrico.activo == True).order_by(TipoRecursoHidrico.nombre.asc()).all()


@router.post("/water-resource-types", response_model=TipoRecursoHidricoResponse, status_code=status.HTTP_201_CREATED)
def create_water_resource_type(
    payload: TipoRecursoHidricoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Registra una nueva tipología de fuente o cuerpo de agua."""
    nuevo = TipoRecursoHidrico(
        codigo=payload.codigo.strip().upper(),
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        permite_riego_defecto=payload.permite_riego_defecto,
        permite_piscicultura_defecto=payload.permite_piscicultura_defecto,
        geometria_3d_tipo=payload.geometria_3d_tipo,
        activo=payload.activo
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/water-resource-types/{id_tipo_recurso}", response_model=TipoRecursoHidricoResponse)
def update_water_resource_type(
    id_tipo_recurso: str,
    payload: TipoRecursoHidricoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """Actualiza una tipología de recurso hídrico."""
    item = db.query(TipoRecursoHidrico).filter(TipoRecursoHidrico.id_tipo_recurso == id_tipo_recurso).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de recurso no encontrado.")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item


# ========================================================================================
# 6. CULTIVOS AGRÍCOLAS (Catálogo Agro-Hídrico)
# ========================================================================================
@router.get("/crops", response_model=List[CultivoAgricolaResponse])
def list_crops(
    region_natural: Optional[str] = Query(None, description="Filtrar por Costa, Sierra, Selva"),
    categoria: Optional[str] = Query(None, description="Filtrar por Frutales, Hortalizas, etc."),
    db: Session = Depends(get_db)
):
    """Retorna los cultivos agrícolas registrados en la cuenca y sus parámetros biofísicos."""
    query = db.query(CultivoAgricola).filter(CultivoAgricola.activo == True)
    if region_natural:
        query = query.filter(CultivoAgricola.region_natural == region_natural)
    if categoria:
        query = query.filter(CultivoAgricola.categoria == categoria)
    return query.order_by(CultivoAgricola.nombre.asc()).all()


@router.post("/crops", response_model=CultivoAgricolaResponse, status_code=status.HTTP_201_CREATED)
def create_crop(
    payload: CultivoAgricolaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_JUNTA"]))
):
    """Registra un nuevo cultivo y sus umbrales hídricos."""
    cultivo_id = payload.id_cultivo or f"CULT-{payload.nombre.strip().upper().replace(' ', '_')[:20]}"
    nuevo = CultivoAgricola(
        id_cultivo=cultivo_id,
        codigo_catalogo=payload.codigo_catalogo,
        pais_origen=payload.pais_origen,
        region_natural=payload.region_natural,
        nombre=payload.nombre,
        categoria=payload.categoria,
        demanda_hidrica_m3_ha=payload.demanda_hidrica_m3_ha,
        ec_umbral_us_cm=payload.ec_umbral_us_cm,
        salinidad_pendiente_pct=payload.salinidad_pendiente_pct,
        ph_min=payload.ph_min,
        ph_max=payload.ph_max,
        turbidez_max_ntu=payload.turbidez_max_ntu,
        temp_agua_min_c=payload.temp_agua_min_c,
        temp_agua_max_c=payload.temp_agua_max_c,
        wqi_min=payload.wqi_min,
        dias_ciclo_vegetativo=payload.dias_ciclo_vegetativo,
        rendimiento_base_kg_ha=payload.rendimiento_base_kg_ha,
        precio_base_moneda_kg=payload.precio_base_moneda_kg,
        moneda_codigo=payload.moneda_codigo,
        nivel_resiliencia=payload.nivel_resiliencia,
        descripcion=payload.descripcion,
        activo=payload.activo
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/crops/{id_cultivo}", response_model=CultivoAgricolaResponse)
def update_crop(
    id_cultivo: str,
    payload: CultivoAgricolaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA", "OPERADOR_JUNTA"]))
):
    """Actualiza los parámetros agronómicos de un cultivo."""
    item = db.query(CultivoAgricola).filter(CultivoAgricola.id_cultivo == id_cultivo).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cultivo no encontrado.")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item


# ========================================================================================
# 7. MATRIZ DE ROLES Y PERMISOS RBAC DEL SISTEMA
# ========================================================================================
@router.get("/system-roles", response_model=List[SystemRoleOut])
def list_system_roles(
    db: Session = Depends(get_db)
):
    """
    Retorna el catálogo y matriz de control de acceso basada en roles (RBAC) de cuenca multiuso.
    """
    roles_db = db.query(RolSistema).filter(RolSistema.activo == True).order_by(RolSistema.nivel_jerarquia.asc(), RolSistema.codigo_rol.asc()).all()
    
    resultado = []
    for r in roles_db:
        count = db.query(Usuario).filter(Usuario.rol == r.codigo_rol, Usuario.activo == True).count()
        resultado.append(SystemRoleOut(
            codigo=r.codigo_rol,
            nombre=r.nombre_amigable,
            descripcion=r.descripcion,
            nivel_jerarquia=r.nivel_jerarquia,
            grupo_multiuso=r.grupo_multiuso,
            permisos=r.permisos_json if isinstance(r.permisos_json, list) else [],
            usuarios_activos_count=count,
            activo=r.activo
        ))
    return resultado


# ========================================================================================
# 8. LOGS DE AUDITORÍA FORENSE
# ========================================================================================
@router.get("/audit-logs", response_model=List[AuditLogOut])
def list_audit_logs(
    accion: Optional[str] = Query(None, description="Filtrar por acción: INSERT, UPDATE, DELETE, etc."),
    tabla: Optional[str] = Query(None, description="Filtrar por tabla afectada"),
    id_usuario: Optional[str] = Query(None, description="Filtrar por usuario ejecutor"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista el registro inmutable de auditoría forense para fiscalización del sistema.
    """
    query = db.query(AuditoriaLog)
    if accion:
        query = query.filter(AuditoriaLog.accion == accion)
    if tabla:
        query = query.filter(AuditoriaLog.tabla_afectada == tabla)
    if id_usuario:
        query = query.filter(AuditoriaLog.id_usuario == id_usuario)

    return query.order_by(AuditoriaLog.timestamp.desc()).offset(skip).limit(limit).all()

