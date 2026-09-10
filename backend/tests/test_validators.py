import pytest
from backend.app.core.validators import (
    validate_phone_number,
    validate_strong_password,
    validate_email_address,
    validate_ruc_dni,
)


def test_validate_phone_number_success():
    # Formato local Perú (9 dígitos empezando en 9) normalizado con +51
    assert validate_phone_number("987654321") == "+51987654321"
    assert validate_phone_number("987 654 321") == "+51987654321"
    assert validate_phone_number("(987) 654-321") == "+51987654321"

    # Formato con prefijo internacional
    assert validate_phone_number("+51987654321") == "+51987654321"
    assert validate_phone_number("51987654321") == "+51987654321"
    assert validate_phone_number("+12025550143") == "+12025550143"


def test_validate_phone_number_failures():
    # Letras en el teléfono (el caso reportado por el usuario)
    with pytest.raises(ValueError, match="sin letras ni"):
        validate_phone_number("987654abc")

    with pytest.raises(ValueError, match="sin letras ni"):
        validate_phone_number("hola mundo")

    # Longitud insuficiente
    with pytest.raises(ValueError, match="9 y 15"):
        validate_phone_number("12345")

    # Longitud excesiva
    with pytest.raises(ValueError, match="9 y 15"):
        validate_phone_number("1234567890123456789")

    # Obligatorio vacío
    with pytest.raises(ValueError, match="obligatorio"):
        validate_phone_number(None, required=True)


def test_validate_strong_password_success():
    assert validate_strong_password("Admin@2026!") == "Admin@2026!"
    assert validate_strong_password("Chancay#Hydro9") == "Chancay#Hydro9"


def test_validate_strong_password_failures():
    # Longitud menor a 8
    with pytest.raises(ValueError, match="al menos 8"):
        validate_strong_password("Ad1@")

    # Falta mayúscula
    with pytest.raises(ValueError, match="A-Z"):
        validate_strong_password("admin@2026!")

    # Falta minúscula
    with pytest.raises(ValueError, match="a-z"):
        validate_strong_password("ADMIN@2026!")

    # Falta número
    with pytest.raises(ValueError, match="0-9"):
        validate_strong_password("Admin@Special!")

    # Falta carácter especial
    with pytest.raises(ValueError, match="especial"):
        validate_strong_password("Admin2026Password")


def test_validate_email_address_success_and_failure():
    assert validate_email_address("Operador@Junta.pe") == "operador@junta.pe"
    assert validate_email_address("ana.tecnico@gob.pe") == "ana.tecnico@gob.pe"

    with pytest.raises(ValueError, match="estructura"):
        validate_email_address("correo_invalido_sin_arroba")

    with pytest.raises(ValueError, match="estructura"):
        validate_email_address("correo@sin_dominio_valido")


def test_validate_ruc_dni():
    # DNI 8 dígitos
    assert validate_ruc_dni("45892147") == "45892147"
    assert validate_ruc_dni("45 89-2147") == "45892147"

    # RUC 11 dígitos válido (inicia con 10, 15, 17, 20)
    assert validate_ruc_dni("20123456789") == "20123456789"
    assert validate_ruc_dni("10458921471") == "10458921471"

    # RUC con prefijo no válido
    with pytest.raises(ValueError, match="10, 15, 17"):
        validate_ruc_dni("30123456789")

    # Longitud no estándar
    with pytest.raises(ValueError, match="DNI de 8"):
        validate_ruc_dni("12345")
