import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import process_dashboard_data

# ================= CONFIGURAÇÃO =================
LOGIN_URL = "http://172.30.130.133/"
REC_URL = "http://172.30.130.133/generico/NOVAlistaDeTarefasItensRecebidos.cfm"
# URL do Frameset que contém o Filtro e a Lista
RAL_FRAMESET_URL = "http://172.30.130.133/navegacao/NOVAframesetNivel2ListaDeTarefas.cfm"

USUARIO = "SOARESM"
SENHA = "123"

from selenium.webdriver.support.ui import Select

# Seletores confirmados
SELECTORS = {
    "user_name": "usuario",
    "pass_name": "senha",
    "btn_name": "Entrar",
    
    # Frames
    "frame_filtro": "frameFiltro",
    "frame_lista": "framesetNivel2ListaDeTarefas",
    
    # Filtro RAL
    "dropdown_tipo": "indic_tipo_recup",
    "btn_exibir": "confirma"
}

# ================= FUNÇÕES =================

def setup_driver():
    print("Configurando navegador...")
    options = Options()
    # options.add_argument("--headless=new") # Retire o comentário para rodar em background
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
    driver.maximize_window()
    return driver

def fazer_login(driver):
    print(f"Acessando página de login: {LOGIN_URL}")
    driver.get(LOGIN_URL)
    time.sleep(3)
    
    try:
        print("Preenchendo credenciais...")
        # Localiza e preenche Usuário
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, SELECTORS["user_name"])))
        driver.find_element(By.NAME, SELECTORS["user_name"]).clear()
        driver.find_element(By.NAME, SELECTORS["user_name"]).send_keys(USUARIO)

        # Localiza e preenche Senha
        driver.find_element(By.NAME, SELECTORS["pass_name"]).clear()
        driver.find_element(By.NAME, SELECTORS["pass_name"]).send_keys(SENHA)

        # Clica no botão Entrar
        print("Clicando em Entrar...")
        driver.find_element(By.NAME, SELECTORS["btn_name"]).click()
        
        # Espera carregar a próxima página
        time.sleep(5)
        print("Login efetuado (provavelmente).")
        
    except Exception as e:
        print(f"Erro ao tentar login: {e}")
        # Se der erro no login, pode ser que já esteja logado ou erro de rede
        # Segue o fluxo

def extrair_dados_tabela(html_source, nome_arquivo):
    print(f"Extraindo dados para {nome_arquivo}...")
    soup = BeautifulSoup(html_source, 'html.parser')
    
    tabelas = soup.find_all("table")
    if not tabelas:
        print("Nenhuma tabela encontrada.")
        return
        
    # Pega a tabela com mais texto (assumindo ser a de dados)
    # Ajuste: A tabela de dados costuma ter classe 'listaTable' ou similar, mas vamos manter a lógica de max texto por enquanto
    tabela_principal = max(tabelas, key=lambda t: len(t.get_text()))
    
    # Identifica o número de colunas mais comum (moda)
    # if not dados: pass # Removido pois dados não existe mais aqui

    linhas = tabela_principal.find_all("tr")
    rows_data = []
    for tr in linhas:
        cols = tr.find_all(["td", "th"])
        cols_text = [ele.get_text(strip=True) for ele in cols]
        if cols_text:
            rows_data.append(cols_text)

    if not rows_data:
        print("Nenhuma linha de dados encontrada.")
        return

    # Descobre o número de colunas mais frequente
    from collections import Counter
    col_counts = [len(r) for r in rows_data]
    if not col_counts:
        return
        
    most_common_col_count = Counter(col_counts).most_common(1)[0][0]
    print(f"Colunas detectadas: {most_common_col_count}")
    
    # Separa dados e tenta achar header
    dados_finais = [r for r in rows_data if len(r) == most_common_col_count]
    
    # Definição Explícita de Headers (Baseado na análise)
    headers = []
    if most_common_col_count == 13: # RAL
        headers = ['Designação', 'Tipo Ral', 'Anorm.', 'Num.Recup.', 'Abertura', 'Duração', 'Item', 'CF Exec.', 'Ass.', 'Técn.', 'Resp.', 'Anatel', 'Prejuízo']
    elif most_common_col_count == 9: # REC
        headers = ['ID', 'Prioridade', 'Num.Recup.', 'Cliente', 'Designação', 'Abertura', 'CF Exec.', 'Resp.', 'Técnico']
    else:
        headers = [f"col_{j}" for j in range(most_common_col_count)]

    if dados_finais:
        try:
            # Se a primeira linha dos dados for igual ao header (ex: texto repetido), removemos
            # Mas como vimos, no CSV atual a primeira linha já é dado.
            
            df = pd.DataFrame(dados_finais, columns=headers)
            df.to_csv(nome_arquivo, index=False, encoding='utf-8-sig', sep=';')
            print(f"Sucesso! {len(df)} linhas salvas em {nome_arquivo}")
        except Exception as e:
            print(f"Erro ao salvar CSV: {e}")
            # Fallback sem header
            try:
                df = pd.DataFrame(dados_finais)
                df.to_csv(nome_arquivo, index=False, encoding='utf-8-sig', sep=';', header=False)
                print(f"Salvo sem headers devido a erro.")
            except:
                pass
    else:
        print("Nenhum dado extraído após filtro de colunas.")

def main(skip_whatsapp=False):
    driver = setup_driver()
    try:
        fazer_login(driver)
        
        # === REC (Mantido método direto pois funciona) ===
        print("--- INICIANDO EXTRAÇÃO REC ---")
        print(f"Navegando para REC: {REC_URL}")
        driver.get(REC_URL)
        time.sleep(5)
        extrair_dados_tabela(driver.page_source, "dados_rec.csv")
        
        # === RAL (Método Interativo) ===
        print("\n--- INICIANDO EXTRAÇÃO RAL ---")
        print(f"Navegando para Frameset RAL: {RAL_FRAMESET_URL}")
        driver.get(RAL_FRAMESET_URL)
        time.sleep(5)
        
        # 1. Mudar para o Frame de Filtro
        try:
            print("Mudando para frame de filtro...")
            driver.switch_to.frame(SELECTORS["frame_filtro"])
            
            # 2. Selecionar RAL no dropdown
            print("Selecionando RAL...")
            select_element = driver.find_element(By.NAME, SELECTORS["dropdown_tipo"])
            select = Select(select_element)
            select.select_by_value("RAL")
            time.sleep(1)
            
            # 3. Clicar em Exibir
            print("Clicando em Exibir...")
            driver.find_element(By.NAME, SELECTORS["btn_exibir"]).click()
            
            # 4. Voltar para contexto principal
            driver.switch_to.default_content()
            time.sleep(5) # Espera carregar os dados
            
            # 5. Mudar para o Frame de Lista (Resultado)
            print("Mudando para frame de lista (Nivel 2)...")
            driver.switch_to.frame(SELECTORS["frame_lista"])
            
            # Dentro do Nivel 2, tem o Nivel 3 (que é outro Frameset)
            print("Mudando para frame de lista (Nivel 3)...")
            driver.switch_to.frame("frameNivel3ItensRecebidos")
            
            # Dentro do Nivel 3, tem o Principal (Onde está a tabela)
            print("Mudando para frame de lista (Principal)...")
            # O ID é duplicado no HTML, então usamos NAME explicitamente ou índice
            # frame_titulo = driver.switch_to.frame("frameNivel2ItensRecebidosTitulo") # Frame 0
            # frame_principal = driver.switch_to.frame("frameNivel2ItensRecebidosPrincipal") # Frame 1
            
            # Usando find_element para garantir que pegamos pelo NAME e não pelo ID duplicado
            frame_principal = driver.find_element(By.NAME, "frameNivel2ItensRecebidosPrincipal")
            driver.switch_to.frame(frame_principal)

            # DEBUG: Salvar HTML final para verificação
            with open("debug_ral_final.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            print("HTML final RAL salvo em debug_ral_final.html")
            
            # 6. Extrair
            extrair_dados_tabela(driver.page_source, "dados_ral.csv")
            
        except Exception as e:
            print(f"Erro na interação RAL: {e}")
            # Tenta tirar screenshot se der erro
            driver.save_screenshot("erro_ral.png")

        print("\nProcesso concluído!")
        
        # Executa processamento do Dashboard
        print("\n--- ATUALIZANDO DASHBOARD ---")
        process_dashboard_data.main(skip_whatsapp=skip_whatsapp)
        
    except Exception as e:
        print(f"Erro fatal: {e}")
    finally:
        # Mantém aberto um pouco antes de fechar ou fecha direto
        # time.sleep(5)
        driver.quit()

if __name__ == "__main__":
    import sys
    skip_whatsapp = "--no-whatsapp" in sys.argv
    main(skip_whatsapp=skip_whatsapp)
