import pandas as pd
import json
import os
import re
from datetime import datetime

def normalize_code(code):
    if not isinstance(code, str): return None
    # Remove all spaces and uppercase for robust matching
    return code.replace(" ", "").upper().strip()

def main(skip_whatsapp=False):
    base_path = "src/data"
    output_path = "public/data"
    ral_file = "dados_ral.csv"
    rec_file = "dados_rec.csv"
    cluster_file = os.path.join(base_path, "clusters.csv")
    output_file = os.path.join(output_path, "dashboard.json")

    # Ensure output directory exists
    os.makedirs(output_path, exist_ok=True)

    print("Loading clusters...")
    clusters_df = pd.read_csv(cluster_file, sep=";")
    
    # Create lookup dict: NormalizedCode -> {Cluster, Region, Type}
    mapping = {}
    prefix_mapping = {} # To match by CITY code if full code fails (e.g., MNS, CBA)
    
    for _, row in clusters_df.iterrows():
        raw_code_orig = str(row['Code'])
        norm_code = normalize_code(raw_code_orig)
        
        if norm_code:
            cluster_name = str(row['Cluster']).strip()
            region_name = str(row['Region']).strip()
            item_info = {
                'Cluster': cluster_name,
                'Region': region_name,
                'Type': row.get('Type', 'Unknown'),
                'City': region_name
            }
            mapping[norm_code] = item_info
            
            # Map by split parts for fallback (e.g., RC/MNS/NO -> MNS)
            parts = norm_code.split('/')
            if len(parts) > 1:
                city_code = parts[1] # Usually the second part
                if city_code not in prefix_mapping:
                    prefix_mapping[city_code] = item_info

    # Initialize Stats
    stats = {
        "updatedAt": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "RAL": {"total": 0, "clusters": {}, "items": []},
        "REC": {"total": 0, "clusters": {}, "items": []}
    }
    
    # Helper to process datasets
    def process_dataset(filepath, dataset_name):
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            return

        try:
            df = pd.read_csv(filepath, sep=';', on_bad_lines='skip')
            stats[dataset_name]["total"] = len(df)
            
            # Prepare columns for enrichment
            df['Cluster'] = 'Unknown'
            df['Cidade'] = 'Unknown'
            df['Region'] = 'Unknown'
            df['Type'] = 'Unknown'
            
            # Identify Columns (Dynamic lookup or fallback)
            col_map = {
                "code": "CF Exec.",
                "type": "Tipo Ral",
                "desc": "Designação",
                "date": "Abertura",
                "duration": "Duração",
                "num": "Num.Recup."
            }
            
            # Fallback for REC or slightly different names
            if dataset_name == "REC":
                 col_map["type"] = "Cliente" # Map Client to Type for REC
                 col_map["duration"] = "Rec_Duration_Placeholder" # Not present 

            # Helper to safely get value
            def get_val(row, col_name):
                if col_name in row:
                    return str(row[col_name]).strip()
                # Fallback by index if headers are known but names mismatch slightly? 
                # For now rely on names.
                return "N/A"

            if col_map["code"] in df.columns:
                for index, row in df.iterrows():
                    val = row[col_map["code"]]
                    norm_val = normalize_code(val)
                    
                    
                    info = mapping.get(norm_val)
                    
                    # Fallback matching
                    if not info and norm_val:
                        # 1. Try SG <-> FO swap
                        alt_val = None
                        if norm_val.endswith('/SG'): alt_val = norm_val.replace('/SG', '/FO')
                        elif norm_val.endswith('/FO'): alt_val = norm_val.replace('/FO', '/SG')
                        if alt_val: info = mapping.get(alt_val)
                        
                        # 2. Try matching by the 2nd part (City Code)
                        if not info:
                            parts = norm_val.split('/')
                            if len(parts) > 1:
                                city_code = parts[1]
                                info = prefix_mapping.get(city_code)
                        
                        # 3. Try matching by prefix (Original fallback)
                        if not info and '/' in norm_val:
                            parts = norm_val.split('/')
                            prefix = '/'.join(parts[:-1])
                            for key, m_info in mapping.items():
                                if key.startswith(prefix):
                                    info = m_info
                                    break

                    if info:
                        cluster = info['Cluster']
                        df.at[index, 'Cluster'] = cluster
                        df.at[index, 'Cidade'] = info['City']
                        df.at[index, 'Region'] = info['Region']
                        df.at[index, 'Type'] = info['Type']
                        city = info['City']
                    else:
                        cluster = "Unknown"
                        city = "Unknown"
                    
                    if cluster not in stats[dataset_name]["clusters"]:
                        stats[dataset_name]["clusters"][cluster] = 0
                    stats[dataset_name]["clusters"][cluster] += 1

                    # Add City Stats
                    if "cities" not in stats[dataset_name]:
                        stats[dataset_name]["cities"] = {}
                    if city not in stats[dataset_name]["cities"]:
                        stats[dataset_name]["cities"][city] = 0
                    stats[dataset_name]["cities"][city] += 1
                    
                    # Add to items list with FULL DETAILS
                    # Ensure no NaN values for JSON safety and REMOVE NEWLINES
                    def safe_str(v):
                        if pd.isna(v): return "N/A"
                        s = str(v).strip().replace('\n', ' ').replace('\r', ' ')
                        # Remove extra spaces inside
                        return ' '.join(s.split())

                    item_data = {
                        "cluster": cluster,
                        "cidade": safe_str(city),
                        "code": safe_str(val),
                        "ralType": safe_str(row.get(col_map["type"])),
                        "description": safe_str(row.get(col_map["desc"])),
                        "date": safe_str(row.get(col_map["date"])),
                        "duration": safe_str(row.get(col_map["duration"])),
                        "num": safe_str(row.get(col_map["num"]))
                    }
                    stats[dataset_name]["items"].append(item_data)
                
                # Export Enriched CSV
                enriched_filename = f"{os.path.splitext(filepath)[0]}_enriched.csv"
                df.to_csv(enriched_filename, sep=';', index=False, encoding='utf-8-sig')
                print(f"Enriched data saved to {enriched_filename}")
                
            else:
                 print(f"Could not identify code column for {dataset_name}. Found: {df.columns.tolist()}")
        except Exception as e:
            print(f"Error processing {dataset_name}: {e}")

    print("Processing RAL...")
    process_dataset(ral_file, "RAL")
    
    print("Processing REC...")
    process_dataset(rec_file, "REC")

    print(f"RAL Total: {stats['RAL']['total']}")
    print(f"REC Total: {stats['REC']['total']}")

    print("Saving dashboard data...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    print(f"Dashboard data saved to {output_file}")

    # --- WhatsApp Notification ---
    if skip_whatsapp:
        print("WhatsApp: ignorado (--no-whatsapp)")
    else:
        try:
            from whatsapp_sender import send_whatsapp_summary
            send_whatsapp_summary(stats)
        except Exception as e:
            print(f"Erro ao disparar WhatsApp: {e}")

if __name__ == "__main__":
    import sys
    skip_whatsapp = "--no-whatsapp" in sys.argv
    main(skip_whatsapp=skip_whatsapp)
