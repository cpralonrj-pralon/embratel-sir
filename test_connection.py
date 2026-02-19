from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

def test_connection():
    print("Configurando driver...")
    options = Options()
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    try:
        driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
        driver.maximize_window()
        
        target_url = "http://172.30.130.133/navegacao/framesetNivel1Aplicacao.cfm"
        print(f"Tentando acessar: {target_url}")
        driver.get(target_url)
        
        print("Página carregada (aguardando 5s)...")
        time.sleep(5)
        
        print(f"Título da página: {driver.title}")
        print("Teste concluído com sucesso!")
        
        driver.quit()
    except Exception as e:
        print(f"Erro ao conectar: {e}")

if __name__ == "__main__":
    test_connection()
