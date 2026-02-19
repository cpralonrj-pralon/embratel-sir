import urllib.request
import urllib.error

url = "http://172.30.130.133/navegacao/framesetNivel1Aplicacao.cfm"
print(f"Testing access to {url}...")

try:
    with urllib.request.urlopen(url, timeout=5) as response:
        print(f"Success! Status Code: {response.getcode()}")
        print(f"Content Length: {response.length}")
except urllib.error.URLError as e:
    print(f"Failed to connect: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
