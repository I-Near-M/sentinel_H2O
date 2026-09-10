import re
from typing import Optional


def validate_phone_number(val: Optional[str], required: bool = False) -> Optional[str]:
    """
    Valida y normaliza un número de teléfono celular o WhatsApp.
    - Rechaza letras, palabras o símbolos extraños.
    - Exige entre 9 y 15 dígitos numéricos (estándar internacional E.164).
    - Para números peruanos de 9 dígitos que inician con 9 (ej: 987654321), normaliza a +51987654321.
    """
    if val is None:
        if required:
            raise ValueError("El número de teléfono es obligatorio.")
        return None

    cleaned = val.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not cleaned:
        if required:
            raise ValueError("El número de teléfono no puede estar vacío.")
        return None

    # Verificar que solo contenga dígitos y un opcional '+' inicial
    if not re.match(r"^\+?[0-9]{9,15}$", cleaned):
        raise ValueError(
            "Número de teléfono inválido. Debe contener únicamente entre 9 y 15 dígitos numéricos (ej: 987654321 o +51987654321) sin letras ni símbolos."
        )

    # Si es un número peruano de 9 dígitos que empieza en 9, normalizar con prefijo +51
    if len(cleaned) == 9 and cleaned.startswith("9"):
        cleaned = f"+51{cleaned}"
    elif len(cleaned) == 11 and cleaned.startswith("519"):
        cleaned = f"+{cleaned}"

    return cleaned


def validate_strong_password(val: Optional[str]) -> Optional[str]:
    """
    Valida la robustez y calidad de la contraseña:
    - Mínimo 8 caracteres.
    - Al menos una letra mayúscula (A-Z).
    - Al menos una letra minúscula (a-z).
    - Al menos un número (0-9).
    - Al menos un carácter especial (@, #, $, %, etc.).
    """
    if val is None:
        return None

    pwd = val.strip()
    if len(pwd) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres de longitud.")

    if not re.search(r"[A-Z]", pwd):
        raise ValueError("La contraseña debe incluir al menos una letra mayúscula (A-Z).")

    if not re.search(r"[a-z]", pwd):
        raise ValueError("La contraseña debe incluir al menos una letra minúscula (a-z).")

    if not re.search(r"[0-9]", pwd):
        raise ValueError("La contraseña debe incluir al menos un número (0-9).")

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]\\/`~]", pwd):
        raise ValueError("La contraseña debe incluir al menos un carácter especial (ej: ! @ # $ % * - _).")

    return pwd


def validate_email_address(val: Optional[str], required: bool = False) -> Optional[str]:
    """
    Valida formato de correo electrónico.
    """
    if val is None:
        if required:
            raise ValueError("El correo electrónico es obligatorio.")
        return None

    email = val.strip().lower()
    if not email:
        if required:
            raise ValueError("El correo electrónico no puede estar vacío.")
        return None

    if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
        raise ValueError(f"El correo electrónico '{email}' no tiene una estructura válida (ejemplo: usuario@dominio.com).")

    return email


def validate_ruc_dni(val: Optional[str]) -> Optional[str]:
    """
    Valida DNI (8 dígitos) o RUC peruano (11 dígitos).
    """
    if val is None:
        return None

    doc = val.strip().replace(" ", "").replace("-", "")
    if not doc:
        return None

    if len(doc) == 8:
        if not doc.isdigit():
            raise ValueError("El DNI debe contener exactamente 8 dígitos numéricos.")
    elif len(doc) == 11:
        if not doc.isdigit():
            raise ValueError("El RUC debe contener exactamente 11 dígitos numéricos.")
        if not (doc.startswith("10") or doc.startswith("15") or doc.startswith("17") or doc.startswith("20")):
            raise ValueError("El RUC debe comenzar con 10, 15, 17 o 20.")
    else:
        raise ValueError("El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos.")

    return doc
