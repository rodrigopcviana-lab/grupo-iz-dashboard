# Portal dos Bares — Grupo IZ

Site estático (GitHub Pages) com informação útil para chefes de bar e equipes:
https://rodrigopcviana-lab.github.io/grupo-iz-dashboard/

## Estrutura

- `index.html`, `cocktails.html`, `rotinas.html`, `regras.html` — portal
  público, gerados por `portal_gen.py` (no projeto `~/Desktop/Code 1`).
  **Não editar à mão.** As rotinas vêm de `data/rotinas/rotinas.json`
  (refresh: `rotinas_sync.py`, requer a página "Gestão de Equipe - Grupo IZ"
  compartilhada com a integração do Notion).
- `vendas/*.html` — dashboards de vendas **criptografados com senha**
  (staticrypt, AES-256). O conteúdo só é legível com a senha; o repo pode ser
  público sem expor os dados.
- `.staticrypt.json` — salt da criptografia (não é segredo; manter para que o
  "lembrar neste aparelho" continue válido entre republicações).

## Como republicar

```bash
cd ~/Desktop/"Code 1"

# 1. Regenerar dashboards e portal
for s in iz 1929 gra-bistro famu fulles nip; do .venv/bin/python dashboard_gen.py "$s"; done
.venv/bin/python dashboard_grupo.py
.venv/bin/python portal_gen.py

# 2. Copiar portal público
cp dashboards/portal/*.html ~/Desktop/grupo-iz-dashboard-site/

# 2b. Ranking de produtos (curva-abc.html) — RESTRITO, duas senhas
# (sai em _restrito/ e NUNCA vai em claro para o site; o encrypt_dupla.js
#  cifra aceitando a senha dos chefes de bar OU a senha de vendas.
#  Material de chave em config/curva_chaves.json — apagar = revogar
#  todos os "lembrar neste aparelho")
SENHAS='<senha chefes>,<senha vendas>' node encrypt_dupla.js \
  dashboards/portal/_restrito/curva-abc.html \
  ~/Desktop/grupo-iz-dashboard-site/curva-abc.html \
  "Ranking de produtos | Grupo IZ"

# 3. Criptografar vendas (staging com nomes finais; senha via env)
STAGE=$(mktemp -d); cd "$STAGE"
cp ~/Desktop/"Code 1"/dashboards/grupo_dashboard.html      index.html
cp ~/Desktop/"Code 1"/dashboards/iz_dashboard.html         iz.html
cp ~/Desktop/"Code 1"/dashboards/1929_dashboard.html       1929.html
cp ~/Desktop/"Code 1"/dashboards/gra-bistro_dashboard.html gra.html
cp ~/Desktop/"Code 1"/dashboards/famu_dashboard.html       famu.html
cp ~/Desktop/"Code 1"/dashboards/fulles_dashboard.html     fulles.html
cp ~/Desktop/"Code 1"/dashboards/nip_dashboard.html        nip.html
cp ~/Desktop/grupo-iz-dashboard-site/.staticrypt.json .    # reusa o salt
export STATICRYPT_PASSWORD='<senha atual>'
npx --yes staticrypt *.html -d encrypted --short --remember 90 \
  --template-title "Vendas | Grupo IZ" \
  --template-instructions "Área restrita da coordenação e chefes de bar. Digite a senha para ver o dashboard." \
  --template-button "Entrar" --template-placeholder "Senha" \
  --template-error "Senha incorreta — tente de novo" \
  --template-remember "Lembrar neste aparelho" \
  --template-color-primary "#2a78d6" --template-color-secondary "#faf9f5"
cp encrypted/*.html ~/Desktop/grupo-iz-dashboard-site/vendas/

# 3b. Páginas restritas de senha dupla (chefes OU vendas)
# curva-abc.html e contatos.html saem de portal_gen.py em dashboards/portal/_restrito/
# (nunca em claro no site). Cifrar com encrypt_dupla.js — material de chave em
# config/curva_chaves.json (mantê-lo preserva o "lembrar neste aparelho"):
cd ~/Desktop/"Code 1"
SENHAS='<senha chefes>,<senha vendas>' node encrypt_dupla.js \
  dashboards/portal/_restrito/curva-abc.html ~/Desktop/grupo-iz-dashboard-site/curva-abc.html "Ranking de produtos | Grupo IZ"
SENHAS='<senha chefes>,<senha vendas>' node encrypt_dupla.js \
  dashboards/portal/_restrito/contatos.html ~/Desktop/grupo-iz-dashboard-site/contatos.html "Contatos | Grupo IZ"

# 4. Publicar
cd ~/Desktop/grupo-iz-dashboard-site
git add -A && git commit -m "Atualiza portal e vendas" && git push
```

Para **trocar a senha**: rodar o passo 3 com outro `STATICRYPT_PASSWORD` e
fazer push. Sessões "lembradas" com a senha antiga deixam de funcionar.

O Bento tem site separado (bento-dashboard) — não entra aqui.
