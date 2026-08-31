#!/usr/bin/env python3
"""
Script para convertir Excel AD507 a JSON automáticamente
VERSION SIMPLE (sin filtros estrictos)
"""

import pandas as pd
import json
import os
import re
from datetime import datetime


def limpiar_telefono(telefono):
    if pd.isna(telefono):
        return ""

    tel_str = str(telefono)
    solo_numeros = re.sub(r"\D", "", tel_str)

    if len(solo_numeros) > 8 and solo_numeros.startswith("507"):
        return solo_numeros[3:]

    return solo_numeros


def validar_coordenadas(coordenadas):
    if pd.isna(coordenadas):
        return ""

    coord_str = str(coordenadas).strip()
    coord_str = re.sub(r"\s+", "", coord_str)

    if re.match(r"^-?\d+\.?\d*,-?\d+\.?\d*$", coord_str):
        return coord_str

    return ""


def excel_to_json():
    print("🔄 Convirtiendo Excel AD507 Panamá a JSON...")

    try:
        excel_file = "AD507_MASTER_FINAL_PANAMA_CORREGIDO_v2.xlsx"

        print(f"📖 Leyendo archivo: {excel_file}")
        df = pd.read_excel(excel_file, sheet_name="direcciones", header=1)

        print(f"📊 Total filas en Excel: {len(df)}")

        clientes = []

        for index, row in df.iterrows():

            codigo = str(row["Código"]).strip() if pd.notna(row["Código"]) else ""

            if codigo and codigo.startswith("AD507-"):

                nombre = str(row["Nombre"]).strip() if pd.notna(row["Nombre"]) else ""
                telefono = limpiar_telefono(row["Teléfono (cliente)"])
                provincia = str(row["Provincia"]).strip() if pd.notna(row["Provincia"]) else "Panamá"
                referencia = str(row["Referencia"]).strip() if pd.notna(row["Referencia"]) else ""
                coordenadas = validar_coordenadas(row["Coordenada (LAT,LNG)"])
                fecha = str(row["Fecha"]).strip() if pd.notna(row["Fecha"]) else datetime.now().strftime("%Y-%m-%d")
                validacion = str(row["Validación"]).strip() if pd.notna(row["Validación"]) else ""

                cliente = {
                    "codigo": codigo,
                    "nombre": nombre if nombre else f"Cliente {codigo}",
                    "telefono": telefono,
                    "provincia": provincia,
                    "referencia": referencia,
                    "coordenadas": coordenadas,
                    "fecha_creacion": fecha,
                    "valido": validacion.upper() in [
                        "OK",
                        "VÁLIDO",
                        "VALIDO",
                        "SI",
                        "YES",
                        "TRUE",
                        "VERIFICADO",
                    ],
                    "notas": ""
                }

                clientes.append(cliente)
                print(f"  ✅ {codigo}: {nombre[:20]:20}")

        clientes.sort(key=lambda x: x["codigo"])

        data = {
            "version": "3.0",
            "ultima_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_clientes_excel": len(df),
            "total_clientes_json": len(clientes),
            "estructura_origen": {
                "archivo": excel_file,
                "hoja": "direcciones",
            },
            "clientes": clientes,
        }

        json_file = "datos/clientes.json"
        os.makedirs(os.path.dirname(json_file), exist_ok=True)

        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print("\n🎉 CONVERSIÓN EXITOSA")
        print(f"📁 JSON guardado en: {json_file}")
        print(f"👥 Clientes exportados: {len(clientes)}")

        return True

    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}")
        return False


if __name__ == "__main__":
    success = excel_to_json()
    exit(0 if success else 1)
