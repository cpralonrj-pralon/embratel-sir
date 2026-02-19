import time
import subprocess
import os
from datetime import datetime

# Intervalo de atualização dos dados (em segundos)
DATA_UPDATE_INTERVAL = 5 * 60  # 5 minutos

# Intervalo de envio de WhatsApp (em segundos)
WHATSAPP_INTERVAL = 1 * 60 * 60  # 1 hora

last_whatsapp_time = None

def run_scraper():
    """Executa o scraper completo (baixa dados + processa + enriquece CSVs)"""
    timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    print(f"\n[{timestamp}] Iniciando coleta de dados (scraper)...")
    try:
        result = subprocess.run(
            ["python", "scraper.py", "--no-whatsapp"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✓ Dados atualizados com sucesso.")
            if result.stdout:
                lines = result.stdout.strip().split('\n')
                for line in lines[-5:]:
                    print(f"    {line}")
        else:
            print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✗ Erro na atualização:")
            if result.stderr:
                print(f"    {result.stderr[:500]}")
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✗ Timeout: scraper demorou mais de 120s")
        return False
    except Exception as e:
        print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✗ Falha crítica: {e}")
        return False

def git_push_data():
    """Faz commit e push dos dados atualizados para o GitHub"""
    timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    try:
        # Arquivos que devem ser sincronizados
        data_files = [
            "public/data/dashboard.json",
            "dados_ral_enriched.csv",
            "dados_rec_enriched.csv"
        ]
        
        # Verifica se há mudanças nos arquivos de dados
        status = subprocess.run(
            ["git", "status", "--porcelain"] + data_files,
            capture_output=True, text=True
        )
        
        if not status.stdout.strip():
            print(f"[{timestamp}] Sem alterações nos dados. Push ignorado.")
            return True
        
        print(f"[{timestamp}] Alterações detectadas, iniciando sync...")
        
        # Stage dos arquivos de dados
        for f in data_files:
            if os.path.exists(f):
                subprocess.run(["git", "add", f], check=True)
        
        # Commit com timestamp
        commit_msg = f"📊 Dados atualizados - {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        subprocess.run(["git", "commit", "-m", commit_msg], check=True, capture_output=True)
        
        # Pull com rebase antes do push para evitar conflitos
        pull_result = subprocess.run(
            ["git", "pull", "--rebase", "origin", "main"],
            capture_output=True, text=True, timeout=30
        )
        if pull_result.returncode != 0:
            print(f"[{timestamp}] ⚠ Pull rebase falhou, tentando push direto...")
        
        # Push
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            capture_output=True, text=True, timeout=60
        )
        
        if result.returncode == 0:
            print(f"[{timestamp}] ✓ Push para GitHub realizado com sucesso.")
            return True
        else:
            print(f"[{timestamp}] ✗ Erro no push: {result.stderr[:300]}")
            return False
            
    except Exception as e:
        print(f"[{timestamp}] ✗ Falha no git push: {e}")
        return False

def send_whatsapp():
    """Envia notificação WhatsApp com os dados atuais"""
    global last_whatsapp_time
    timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    print(f"[{timestamp}] Enviando WhatsApp...")
    try:
        result = subprocess.run(
            ["python", "-c", 
             "import json; from whatsapp_sender import send_whatsapp_summary; "
             "stats=json.load(open('public/data/dashboard.json','r',encoding='utf-8')); "
             "send_whatsapp_summary(stats)"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            last_whatsapp_time = datetime.now()
            print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✓ WhatsApp enviado!")
        else:
            print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✗ Erro WhatsApp: {result.stderr[:300]}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] ✗ Falha WhatsApp: {e}")

def should_send_whatsapp():
    """Verifica se já passou tempo suficiente para enviar WhatsApp"""
    global last_whatsapp_time
    if last_whatsapp_time is None:
        return True
    elapsed = (datetime.now() - last_whatsapp_time).total_seconds()
    return elapsed >= WHATSAPP_INTERVAL

if __name__ == "__main__":
    print("=" * 50)
    print("  SIR Scheduler")
    print(f"  Atualização de dados: a cada {DATA_UPDATE_INTERVAL // 60} minutos")
    print(f"  Envio de WhatsApp: a cada {WHATSAPP_INTERVAL // 3600} horas")
    print(f"  Git push: a cada atualização")
    print("=" * 50)
    
    while True:
        success = run_scraper()
        
        if success:
            git_push_data()
            
            if should_send_whatsapp():
                send_whatsapp()
        
        next_run = datetime.now().strftime('%H:%M:%S')
        mins = DATA_UPDATE_INTERVAL // 60
        print(f"\n⏳ Próxima atualização em {mins} minutos... (última: {next_run})")
        time.sleep(DATA_UPDATE_INTERVAL)
