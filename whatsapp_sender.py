import requests
import json
import os
from datetime import datetime

# Evolution API Configuration
API_URL = "http://localhost:8081"
API_TOKEN = "4BC23141CFAD-48EC-A88C-4874A6305C2B"
INSTANCE_NAME = "coprede_api"
DEFAULT_PHONE = "120363423786613991@g.us"

def send_whatsapp_summary(stats, target_phone=None):
    """
    Sends a summary message of RAL and REC stats via WhatsApp in the requested format.
    """
    phone = target_phone or DEFAULT_PHONE
    
    # 1. Filter and Basic Stats
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    # FILTER: Exclude 'QUALIDADE' from RAL items for the message
    raw_ral_items = stats.get("RAL", {}).get("items", [])
    ral_items = [i for i in raw_ral_items if "QUALIDADE" not in str(i.get("ralType", "")).upper()]
    
    ral_total = len(ral_items) # Total filtered
    rec_total = stats.get("REC", {}).get("total", 0)
    
    # 2. Cluster Breakdowns (Recalculated for RAL to exclude Quality)
    def get_cluster_text(items):
        counts = {}
        for item in items:
            c = item.get("cluster", "Unknown")
            counts[c] = counts.get(c, 0) + 1
        
        sorted_clusters = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return "\n".join([f"• {c}: {n}" for c, n in sorted_clusters[:10]]) # Top 10 clusters

    ral_clusters_text = get_cluster_text(ral_items)
    # REC remains pre-aggregated as it has no Quality type to filter? 
    # Actually safer to recalculate from items if items exist.
    rec_items = stats.get("REC", {}).get("items", [])
    rec_clusters_text = get_cluster_text(rec_items)

    # 3. RAL Type Counts (using filtered list)
    type_counts = {
        "FOTÔNICA": 0,
        "BACKBONE": 0,
        "COLETOR": 0,
        "PPC": 0,
        "ACESSO CLIENTE": 0,
        "QUALIDADE": 0 # Will stay 0
    }
    
    for item in ral_items:
        t = str(item.get("ralType", "")).upper()
        if "FOTÔNICA" in t or "FOTONICA" in t: type_counts["FOTÔNICA"] += 1
        elif "BACKBONE" in t: type_counts["BACKBONE"] += 1
        elif "COLETOR" in t: type_counts["COLETOR"] += 1
        elif "PPC" in t: type_counts["PPC"] += 1
        elif "ACESSO" in t or "CLIENTE" in t: type_counts["ACESSO CLIENTE"] += 1
        # QUALIDADE is already excluded from ral_items

    # 4. Oldest Items (Top 5)
    def get_oldest_items(items, limit=5):
        # Parse date and sort
        def parse_sir_date(date_str):
            try:
                # Format: "12/01/2026 - 11:15"
                return datetime.strptime(date_str, "%d/%m/%Y - %H:%M")
            except:
                return datetime.max
        
        valid_items = [i for i in items if i.get("date") and i.get("date") != "N/A"]
        sorted_items = sorted(valid_items, key=lambda x: parse_sir_date(x["date"]))
        return sorted_items[:limit]

    oldest_rals = get_oldest_items(ral_items)
    oldest_recs = get_oldest_items(rec_items)

    def format_duration(dur_str):
        # From "31d.04h12m" to "31d 4h"
        try:
            if not dur_str or dur_str == "N/A": return "N/A"
            parts = dur_str.replace(".", " ").split()
            day = parts[0] if len(parts) > 0 else "0d"
            hour = parts[1][:3] if len(parts) > 1 else "0h" # Takes "04h" 
            return f"{day} {hour.lstrip('0') or '0h'}"
        except:
            return dur_str

    def format_date_short(date_str):
        # From "12/01/2026 - 11:15" to "12/01 11:15"
        try:
            dt = datetime.strptime(date_str, "%d/%m/%Y - %H:%M")
            return dt.strftime("%d/%m %H:%M")
        except:
            return date_str

    def format_oldest_list_visual(items, label="RAL"):
        if not items: return "Nenhum registro encontrado."
        blocks = []
        for idx, i in enumerate(items, 1):
            num = i.get("num", "N/A")
            dur = format_duration(i.get("duration", "N/A"))
            date = format_date_short(i.get("date", "N/A"))
            city = i.get("cidade", "Unknown")
            ral_type = i.get("ralType", "Unknown")
            desc = i.get("description", "")
            
            suffix = f" - DESIGNAÇÃO: {desc}" if label == "REC" and desc else ""
            
            block = (
                f"#{idx} ▓▓▓▓▓▓▓▓▓ ⏳ {dur}\n"
                f"🪪 {label} {num}{suffix}\n"
                f"🌐 {ral_type} • 🗺️ {city}\n"
                f"📅 {date}"
            )
            blocks.append(block)
        return "\n\n".join(blocks)

    # 5. Build Final Message
    message = (
        "💎 *COP REDE INF:*\n"
        "📡 *SIR MONITORAMENTO*\n\n"
        f"📅 *ATUALIZADO:* {timestamp}\n\n"
        "📊 *TOTAL DE ATIVIDADES*\n"
        f"🔴 *RAL:* {ral_total}\n"
        "*POR CLUSTERS:*\n"
        f"{ral_clusters_text}\n\n"
        f"🟢 *REC:* {rec_total}\n"
        "*POR CLUSTERS:*\n"
        f"{rec_clusters_text}\n\n"
        "🏷️ *TIPO DE RAL*\n"
        f"🔹 FOTÔNICA: {type_counts['FOTÔNICA']}\n"
        f"🔹 BACKBONE: {type_counts['BACKBONE']}\n"
        f"🔹 COLETOR: {type_counts['COLETOR']}\n"
        f"🔹 PPC: {type_counts['PPC']}\n"
        f"🔹 ACESSO CLIENTE: {type_counts['ACESSO CLIENTE']}\n"
        f"🔹 QUALIDADE: {type_counts['QUALIDADE']}\n\n"
        "🏁 *Top 5 RALS mais antigos:*\n"
        f"{format_oldest_list_visual(oldest_rals, 'RAL')}\n\n"
        "🏁 *Top 5 REC mais antigos:*\n"
        f"{format_oldest_list_visual(oldest_recs, 'REC')}\n\n"
        "🔗 [Dashboard](http://localhost:5173/dashboard)"
    )

    headers = {
        "Content-Type": "application/json",
        "apikey": API_TOKEN
    }

    payload = {
        "number": phone,
        "text": message
    }

    try:
        endpoint = f"{API_URL.rstrip('/')}/message/sendText/{INSTANCE_NAME}"
        response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        
        if response.status_code in [200, 201]:
            print(f"✓ WhatsApp enviado com sucesso para {phone}")
            return True
        else:
            print(f"✗ Erro ao enviar WhatsApp (HTTP {response.status_code}): {response.text}")
            return False
    except Exception as e:
        print(f"✗ Falha crítica no envio de WhatsApp: {e}")
        return False

if __name__ == "__main__":
    # Test call
    test_stats = {
        "RAL": {"total": 123, "clusters": {"RIO DE JANEIRO / ESPIRITO SANTO": 45}},
        "REC": {"total": 12}
    }
    send_whatsapp_summary(test_stats)
