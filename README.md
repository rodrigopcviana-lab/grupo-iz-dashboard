# Portal dos Bares — Grupo IZ

Site estático (GitHub Pages) com informação útil para chefes de bar e equipes:
https://rodrigopcviana-lab.github.io/grupo-iz-dashboard/

## Estrutura

- `index.html`, `cocktails.html`, `rotinas.html`, `regras.html`, `contatos.html`,
  `contagem.html`, `curva-abc.html` — portal público, gerados por
  `portal_gen.py` (no projeto `~/Desktop/Code 1`). **Não editar à mão.**
- `vendas/*.html` e `curva-abc.html` (Ranking) — desde 2026-07-04 são cascas
  **sem dado nenhum embutido** (Regra Zero + segurança): o número real só
  chega depois de uma senha validada pelo Cloudflare Worker
  `contagem-bares` (mesmo Worker da Contagem), que lê o dado pré-computado de
  um KV — nunca um arquivo cifrado publicado que dê pra baixar e atacar
  offline (era assim com staticrypt/encrypt_dupla.js antes). Ver
  `contagem-worker/README.md` no projeto.
- `contatos.html` — pública desde 2026-07-04 (pedido do Rodrigo): telefone e
  WhatsApp de cada chefe saíram da página pra isso ser possível (regra do
  CLAUDE.md: sem telefone em página pública). Só nome+cargo por casa.
- `consumo.html` — RESTRITA, senha dupla (chefes OU vendas) via
  `encrypt_dupla.js`. Ainda é um arquivo cifrado publicado (não migrou pro
  esquema do Worker) — não é o mesmo nível de proteção de vendas/ranking.
- `.staticrypt.json` — não é mais usado (vendas não passa mais por
  staticrypt). Mantido só por segurança histórica; pode ser removido.

## Como republicar

```bash
cd ~/Desktop/"Code 1"

# 1. Regenerar dashboards, portal, JSON de vendas/ranking
for s in iz 1929 gra-bistro famu fulles nip; do .venv/bin/python dashboard_gen.py "$s"; done
.venv/bin/python dashboard_grupo.py
.venv/bin/python portal_gen.py

# 2. Subir o dado (vendas + ranking) pro Cloudflare KV do Worker
.venv/bin/python publicar_kv.py

# 3. Copiar as páginas públicas (incluem contatos.html, curva-abc.html — sem
#    dado nenhum, então não tem cifra nenhuma aqui)
cp dashboards/portal/*.html ~/Desktop/grupo-iz-dashboard-site/
rsync -a --delete "dashboards/../data/fotos_cocktails/fotos/" ~/Desktop/grupo-iz-dashboard-site/fotos/
# (fotos vêm dos cardápios Tagme via fotos_sync.py; mapa em data/fotos_cocktails/mapa.json)

# 4. Copiar as cascas de vendas — mesmo URL de sempre, SEM staticrypt (o
#    arquivo não carrega dado, então não há nada pra cifrar)
mkdir -p ~/Desktop/grupo-iz-dashboard-site/vendas
cp dashboards/grupo_dashboard.html      ~/Desktop/grupo-iz-dashboard-site/vendas/index.html
cp dashboards/iz_dashboard.html         ~/Desktop/grupo-iz-dashboard-site/vendas/iz.html
cp dashboards/1929_dashboard.html       ~/Desktop/grupo-iz-dashboard-site/vendas/1929.html
cp dashboards/gra-bistro_dashboard.html ~/Desktop/grupo-iz-dashboard-site/vendas/gra.html
cp dashboards/famu_dashboard.html       ~/Desktop/grupo-iz-dashboard-site/vendas/famu.html
cp dashboards/fulles_dashboard.html     ~/Desktop/grupo-iz-dashboard-site/vendas/fulles.html
cp dashboards/nip_dashboard.html        ~/Desktop/grupo-iz-dashboard-site/vendas/nip.html

# 5. consumo.html continua com senha dupla (chefes OU vendas) via
#    encrypt_dupla.js — sai em _restrito/ e NUNCA vai em claro pro site.
#    Material de chave em config/curva_chaves.json (mantê-lo preserva o
#    "lembrar neste aparelho").
SENHAS='<senha chefes>,<senha vendas>' node encrypt_dupla.js \
  dashboards/portal/_restrito/consumo.html ~/Desktop/grupo-iz-dashboard-site/consumo.html "Consumo semanal | Grupo IZ"

# 6. Publicar
cd ~/Desktop/grupo-iz-dashboard-site
git add -A && git commit -m "Atualiza portal, vendas e ranking" && git push
```

## Trocar senha de vendas/ranking/contagem

Não é mais aqui — as senhas ficam no Cloudflare Worker (`contagem-bares`),
como secret `SENHAS` (`_vendas`, `_chefes`, e uma por casa da contagem). Ver
`contagem-worker/README.md` no projeto: `wrangler secret put SENHAS` de novo,
sem precisar reimplantar nem tocar neste repo.

Só a senha de **consumo.html** ainda é trocada aqui (passo 5, `STATICRYPT`-like
via `encrypt_dupla.js` — rodar de novo com a senha nova e publicar).

O Bento tem site separado (bento-dashboard) — não entra aqui.
