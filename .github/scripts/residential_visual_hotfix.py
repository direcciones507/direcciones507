from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")
original = text

marker = "    async function ejecutarEnlaceResidencial(token) {"
helper = '''    function configurarVistaResidencial(telefono) {
      // Ajuste exclusivamente visual para fichas residenciales autorizadas.
      // No modifica PIN, QR, sesiones, tokens ni validación server-side.
      const directory = document.querySelector(".seo-directory-wrapper");
      if (directory) directory.style.display = "none";

      const footerSocials = document.querySelector("footer .footer-3col-grid");
      if (footerSocials) footerSocials.style.display = "none";

      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.marginTop = "22px";
        footer.style.paddingBottom = "24px";
      }

      const natalieLauncher = document.getElementById("natalieLauncher");
      const natalieChat = document.getElementById("natalieChat");
      if (natalieLauncher) natalieLauncher.style.display = "none";
      if (natalieChat) {
        natalieChat.classList.remove("open");
        natalieChat.style.display = "none";
      }

      const whatsappButton = document.getElementById("btnAvisoHome");
      if (!whatsappButton) return;

      let tel = String(telefono || "").replace(/\\D/g, "");
      if (tel.length === 8) tel = "507" + tel;
      if (tel.length >= 10) {
        const message = "Hola, te contacto desde tu Dirección Digital AD507";
        whatsappButton.href = `https://wa.me/${tel}?text=${encodeURIComponent(message)}`;
        whatsappButton.style.display = "flex";
        const subtitle = whatsappButton.querySelector("p");
        if (subtitle) subtitle.textContent = "Contactar residencia";
      } else {
        whatsappButton.style.display = "none";
      }
    }

'''

if helper.strip() not in text:
    if marker not in text:
        raise SystemExit("Marker ejecutarEnlaceResidencial not found")
    text = text.replace(marker, helper + marker, 1)

old_temp = '''        document.getElementById("seccionRedesSocialesCliente").style.display = "none";
        document.getElementById("btnStats").style.display = "none";
        document.getElementById("btnAvisoHome").style.display = "none";'''
new_temp = '''        document.getElementById("seccionRedesSocialesCliente").style.display = "none";
        document.getElementById("btnStats").style.display = "none";
        configurarVistaResidencial(data.telefono || data.whatsapp || "");'''
if old_temp in text:
    text = text.replace(old_temp, new_temp, 1)

old_perm = '''      document.getElementById("seccionRedesSocialesCliente").style.display = "none";
      document.getElementById("btnStats").style.display = "none";
      document.getElementById("btnAvisoHome").style.display = "none";'''
new_perm = '''      document.getElementById("seccionRedesSocialesCliente").style.display = "none";
      document.getElementById("btnStats").style.display = "none";
      configurarVistaResidencial(residence.telefono || residence.whatsapp || "");'''
if old_perm in text:
    text = text.replace(old_perm, new_perm, 1)

required = [
    "function configurarVistaResidencial(telefono)",
    'configurarVistaResidencial(data.telefono || data.whatsapp || "")',
    'configurarVistaResidencial(residence.telefono || residence.whatsapp || "")',
    'natalieLauncher.style.display = "none"',
    'footerSocials.style.display = "none"',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit("Validation failed: " + ", ".join(missing))
if text == original:
    raise SystemExit("No changes applied")

path.write_text(text, encoding="utf-8")
print("Residential visual patch prepared")
