import csv
import re
import os

def is_code(line):
    # Heuristic: Codes usually have "/" and are uppercased, e.g., RC/RJO/NO1/NET/FO
    # Or start with specific prefixes like DP, RC, RT
    return "/" in line or line.startswith(("DP", "RC", "RT", "CF"))

def parse_file(filepath, source_type):
    data = []
    current_region = "Unknown"
    current_cluster = "Unknown"
    
    # Regions/States commonly found in the text to help switch context
    known_regions = [
        "RIO", "NORDESTE", "FORTALEZA", "BAHIA", "CENTRO OESTE", "NORTE", "MINAS", 
        "MINAS GERAIS", "SUL", "SÃO PAULO", "ESPIRITO SANTO", "PARANÁ", "SANTA CATARINA",
        "RIO GRANDE DO SUL"
    ]

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]

    for line in lines:
        # Skip known non-data headers if they appear mid-file
        if line in ["CLUSTER", "SUBCLUSTER", "CF DESPACHO", "CF FIBRA - PRÓPRIO"]:
            continue
            
        if is_code(line):
            # It's a code, associate with current state
            # Determine type from code prefix
            code_type = "Unknown"
            if line.startswith("RC"): code_type = "Recuperação (RC)"
            elif line.startswith("RT"): code_type = "Retirada (RT)"
            elif line.startswith("DP"): code_type = "Despacho (DP)"
            
            data.append({
                "Code": line,
                "Cluster": current_cluster,
                "Region": current_region,
                "Type": code_type,
                "Source": source_type
            })
        else:
            # It's likely a Header (Region or Cluster)
            # Check if it matches a known region
            is_known_region = False
            for r in known_regions:
                if r in line.upper(): 
                    current_region = line
                    current_cluster = line # Reset cluster to region initially
                    is_known_region = True
                    break
            
            if not is_known_region:
                # If not a region, it's a Cluster/Subcluster
                current_cluster = line

    return data

def main():
    base_path = "src/data"
    files = [
        ("raw_clusters.txt", "FIBRA/NET"),
        ("raw_clusters_bsod.txt", "BSOD")
    ]
    
    all_data = []
    
    for fname, fsource in files:
        fpath = os.path.join(base_path, fname)
        if os.path.exists(fpath):
            print(f"Processing {fname}...")
            all_data.extend(parse_file(fpath, fsource))
        else:
            print(f"File not found: {fpath}")

    # Write to CSV
    output_file = os.path.join(base_path, "clusters.csv")
    keys = ["Code", "Cluster", "Region", "Type", "Source"]
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=keys, delimiter=';')
        writer.writeheader()
        writer.writerows(all_data)
        
    print(f"Successfully generated {output_file} with {len(all_data)} records.")

if __name__ == "__main__":
    main()
