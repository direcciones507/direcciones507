#!/usr/bin/env python3
"""
Script para convertir Excel AD507 a JSON automáticamente
VERSION ESPECÍFICA para estructura AD507 Panamá
"""

import pandas as pd
import json
import os
import re
from datetime import datetime

def limpiar_telefono(telefono):
    """Limpia y formatea número de teléfono panameño"""
    if pd.isna(telefono):
        return ""
    
    # Convertir a string y quitar caracteres no numéricos
    tel_str = str(telefono)
    solo_numeros = re.sub(r'\D', '', tel_str)
    
    # Para Panamá: 8 dígitos (sin código de país)
    if len(solo_numeros) == 8:
        return solo_numeros
    elif len(solo_numeros) > 8:
        # Si tiene código de país +507, quitarlo
        if solo_numeros.startswith('507'):
            return solo_numeros[3:]
        return solo_numeros[-8:]  # Tomar últimos 8 dígitos
    
    return solo_numeros

def validar_coordenadas(coordenadas):
    """Valida que las coordenadas tengan formato correcto"""
    if pd.isna(coordenadas):
        return ""
    
    coord_str = str(coordenadas).strip()
    
    # Limpiar espacios extra
    coord_str = re.sub(r'\s+', '', coord_str)
    
    # Verificar formato básico: número,coma,número
    if re.match(r'^-?\d+\.?\d*,-?\d+\.?\d*$', coord_str):
        return coord_str
    
    return ""

def excel_to_json():
    print("🔄 Convirtiendo Excel AD507 Panamá a JSON...")
    
    try:
        # Leer el archivo Excel
        excel_file = 'AD507_MASTER_FINAL_PANAMA.xlsx'
        
        # Leer la hoja AD507
        print(f"📖 Leyendo archivo: {excel_file}")
        df = pd.read_excel(excel_file, sheet_name='AD507')
        
        print(f"📊 Total filas en Excel: {len(df)}")
        print("✅ Columnas detectadas (primeras 10):")
        for i, col in enumerate(df.columns[:10], 1):
            print(f"  {i:2}. {col}")
        
        if len(df.columns) > 10:
            print(f"  ... y {len(df.columns) - 10} columnas más")
        
        # Preparar lista de clientes
        clientes = []
        clientes_con_coordenadas = 0
        clientes_sin_coordenadas = 0
        
        for index, row in df.iterrows():
            # Obtener código (columna A)
            codigo = str(row['Código']).strip() if pd.notna(row['Código']) else ""
            
            # Solo procesar filas con código AD507 válido
            if codigo and codigo.startswith('AD507-'):
                
                # Obtener otros datos
                nombre = str(row['Nombre']).strip() if pd.notna(row['Nombre']) else ""
                telefono = limpiar_telefono(row['Teléfono (cliente)'])
                provincia = str(row['Provincia']).strip() if pd.notna(row['Provincia']) else "Panamá"
                referencia = str(row['Referencia']).strip() if pd.notna(row['Referencia']) else ""
                coordenadas = validar_coordenadas(row['Coordenada (LAT,LNG)'])
                fecha = str(row['Fecha']).strip() if pd.notna(row['Fecha']) else datetime.now().strftime('%Y-%m-%d')
                validacion = str(row['Validación']).strip() if pd.notna(row['Validación']) else ""
                
                # Crear objeto cliente
                cliente = {
                    "codigo": codigo,
                    "nombre": nombre if nombre else f"Cliente {codigo}",
                    "telefono": telefono,
                    "provincia": provincia,
                    "referencia": referencia,
                    "coordenadas": coordenadas,
                    "fecha_creacion": fecha,
                    "valido": validacion.upper() in ['OK', 'VÁLIDO', 'VALIDO', 'SI', 'YES', 'TRUE', 'VERIFICADO'],
                    "notas": ""
                }
                
                # Contar por coordenadas
                if coordenadas:
                    clientes_con_coordenadas += 1
                    clientes.append(cliente)
                    print(f"  ✅ {codigo}: {nombre[:20]:20} | 📍 {coordenadas}")
                else:
                    clientes_sin_coordenadas += 1
                    print(f"  ⚠️ {codigo}: {nombre[:20]:20} | SIN coordenadas")
        
        # Ordenar por código
        clientes.sort(key=lambda x: x['codigo'])
        
        print(f"\n📈 ESTADÍSTICAS:")
        print(f"   Total filas procesadas: {len(df)}")
        print(f"   Clientes con coordenadas: {clientes_con_coordenadas}")
        print(f"   Clientes sin coordenadas: {clientes_sin_coordenadas}")
        print(f"   Clientes válidos para JSON: {len(clientes)}")
        
        # Crear estructura final
        data = {
            "version": "3.0",
            "ultima_actualizacion": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "total_clientes_excel": len(df),
            "total_clientes_json": len(clientes),
            "estructura_origen": {
                "archivo": excel_file,
                "hoja": "AD507",
                "columnas_utilizadas": [
                    "Código", "Nombre", "Teléfono (cliente)", "Provincia",
                    "Referencia", "Coordenada (LAT,LNG)", "Fecha", "Validación"
                ]
            },
            "clientes": clientes
        }
        
        # Guardar JSON
        json_file = 'datos/clientes.json'
        os.makedirs(os.path.dirname(json_file), exist_ok=True)
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\n🎉 CONVERSIÓN EXITOSA!")
        print(f"📁 JSON guardado en: {json_file}")
        print(f"👥 Clientes exportados: {len(clientes)}")
        print(f"🕐 Actualizado: {data['ultima_actualizacion']}")
        
        # Mostrar primeros 5 clientes
        print("\n📋 MUESTRA DE CLIENTES EXPORTADOS:")
        for i, cliente in enumerate(clientes[:5], 1):
            print(f"{i}. {cliente['codigo']} - {cliente['nombre']}")
            print(f"   📞 {cliente['telefono']} | 📍 {cliente['coordenadas']}")
        
        if len(clientes) > 5:
            print(f"... y {len(clientes) - 5} clientes más")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Información de depuración
        print("\n🔧 INFORMACIÓN PARA DEPURACIÓN:")
        try:
            print(f"Archivo existe: {os.path.exists(excel_file)}")
            if os.path.exists(excel_file):
                xl = pd.ExcelFile(excel_file)
                print(f"Hojas disponibles: {xl.sheet_names}")
        except:
            pass
        
        return False

if __name__ == "__main__":
    success = excel_to_json()
    exit(0 if success else 1)

