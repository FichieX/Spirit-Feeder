import urllib.request

url = "https://bereanbible.com/bsb.txt"
output_file = "bsb.txt"

print(f"⏳ Downloading {url}...")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        content = response.read()
        with open(output_file, "wb") as f:
            f.write(content)
    print(f"✅ Download complete! Saved as '{output_file}' in your project folder.")
except Exception as e:
    print(f"❌ Failed to download file: {e}")