# Instruções para o Scraper REC/RAL

## 1. Instalação
Abra o terminal na pasta deste arquivo e execute:
```bash
pip install -r requirements.txt
```

## 2. Configurando o Login
**Importante:** Como o acesso é interno, você precisa fornecer os "IDs" dos campos de login para o script funcionar.

1. Abra o site `http://172.30.130.133/` no seu Chrome normal.
2. Na tela de login, clique com o botão direito no campo **Usuário** e escolha **Inspecionar**.
3. Uma janelinha vai abrir com o código HTML. Procure por `id="..."` ou `name="..."` (ex: `id="txtUsuario"`).
4. Faça o mesmo para o campo **Senha** e para o **Botão de Entrar**.
5. Abra o arquivo `scraper.py` (pode ser no Bloco de Notas) e edite as linhas 20 a 22:

```python
SELECTORS = {
    "login_user_input_id": "COLOQUE_O_ID_DO_USUARIO_AQUI", 
    "login_pass_input_id": "COLOQUE_O_ID_DA_SENHA_AQUI",
    "login_button_id": "COLOQUE_O_ID_DO_BOTAO_AQUI",
}
```

## 3. Executando
No terminal, execute:
```bash
python scraper.py
```

O navegador vai abrir sozinho, fazer login, e salvar dois arquivos:
- `dados_rec.csv`
- `dados_ral.csv`
