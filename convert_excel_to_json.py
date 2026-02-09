#!/usr/bin/env python3
"""
Script para convertir Excel AD507 a JSON automáticamente
"""

import pandas as pd
import json
import os
from datetime import datetime

def excel_to_json():
    print("🔄 Convirtiendo Excel a JSON...")
    
    try:
        # Leer el archivo Excel
        excel_file = 'AD507_MASTER_FINAL_PANAMA.xlsx'
        df = pd.read_excel(excel_file, sheet_name='AD507')
        
        print(f"📊 Excel cargado: {len(df)} filas encontradas")
        print("📋 Columnas disponibles:", list(df.columns))
        
        # Preparar lista de clientes
        clientes = []
        
        for index, row in df.iterrows():
            # Verificar que tenga código
            codigo = str(row.get('Código', '')).strip()
            if codigo and codigo != 'nan' and codigo.startswith('AD507-'):
                
                # Procesar coordenadas
                coordenadas = str(row.get('Coordenada (LAT,LNG)', '')).strip()
                if coordenadas == 'nan':
                    coordenadas = ''
                
                # Crear objeto cliente
                cliente = {
                    "codigo": codigo,
                    "nombre": str(row.get('Nombre', '')).strip(),
                    "telefono": str(row.get('Teléfono (cliente)', '')).replace('-', '').strip(),
                    "provincia": str(row.get('Provincia', '')).strip(),
                    "referencia": str(row.get('Referencia', '')).strip(),
                    "coordenadas": coordenadas,
                    "fecha_creacion": str(row.get('Fecha', datetime.now().strftime('%Y-%m-%d'))),
                    "valido": str(row.get('Validación', '')).strip() == "OK",
                    "notas": ""
                }
                
                clientes.append(cliente)
                print(f"  ✓ {codigo}: {cliente['nombre'][:20]}...")
        
        # Crear estructura final
        data = {
            "version": "2.0",
            "ultima_actualizacion": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "total_clientes": len(clientes),
            "clientes": clientes
        }
        
        # Guardar JSON
        json_file = 'datos/clientes.json'
        os.makedirs(os.path.dirname(json_file), exist_ok=True)
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ CONVERSIÓN EXITOSA!")
        print(f"📁 JSON guardado en: {json_file}")
        print(f"👥 Total clientes: {len(clientes)}")
        print(f"🕐 Actualizado: {data['ultima_actualizacion']}")
        
        # Mostrar primeros 3 clientes
        print("\n📋 Primeros 3 clientes:")
        for i, cliente in enumerate(clientes[:3], 1):
            print(f"{i}. {cliente['codigo']} - {cliente['nombre']}")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        print("Posibles soluciones:")
        print("1. Verifica que el archivo Excel exista")
        print("2. Verifica que la hoja se llame 'AD507'")
        print("3. Verifica los nombres de las columnas")
        return False

if __name__ == "__main__":
    excel_to_json()
