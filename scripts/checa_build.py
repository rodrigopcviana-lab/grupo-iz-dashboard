#!/usr/bin/env python3
"""Um build id só em todo o portal publicado.

Cada página embute `var BUILD = '<id>'` e compara com versao.json 4s depois de
carregar, a cada 10 min e quando a janela volta ao foco. Diferente => banner
"Nova versão disponível".

O portal_gen.py carimba TUDO com o mesmo id de uma vez (páginas, portal.css?v=,
sw.js, versao.json) — ele está certo. O que quebra é publicar pela metade: em
6ecad0c (19/08/2026) subiram só cocktails.html e versao.json, e as outras 79
páginas ficaram com o id anterior. O banner passou 5 semanas no ar e clicar em
"Atualizar" não resolvia: a página recarregava com o mesmo id velho, o
versao.json continuava com o novo, e o aviso voltava em 4 segundos.

Este teste varre quem carrega o id e exige um valor único.

    python3 scripts/checa_build.py            # árvore de trabalho
    python3 scripts/checa_build.py --index    # o que o commit vai gravar

Sai 0 se houver um id só; 1 listando quem discorda.
"""
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

# Cada padrão é ancorado no texto que só aparece junto do id — nada de casar
# 12 hex soltos, senão um hash qualquer do changelog entraria na conta.
PADROES = [
    ("var BUILD",      re.compile(r"var BUILD = '([0-9a-f]{12})'")),
    ("portal.css?v=",  re.compile(r"portal\.css\?v=([0-9a-f]{12})")),
    ("versao.json",    re.compile(r'"build"\s*:\s*"([0-9a-f]{12})"')),
    ("sw.js CACHE",    re.compile(r'const CACHE\s*=\s*"iz-portal-([0-9a-f]{12})"')),
    ("sw.js subapp",   re.compile(r'const C\s*=\s*"[a-z-]+-([0-9a-f]{12})"')),
]


def interessa(caminho: str) -> bool:
    nome = caminho.rsplit("/", 1)[-1]
    return caminho.endswith(".html") or nome == "sw.js" or nome == "versao.json"


def arquivos_e_texto(do_index: bool):
    """No modo --index lê do índice (`git show :arq`), não do disco: é o que o
    commit vai gravar de verdade — é justamente aí que mora o erro de publicar
    versao.json sozinho com as páginas velhas intactas."""
    saida = subprocess.run(
        ["git", "ls-files"], capture_output=True, text=True, check=True
    ).stdout.splitlines()
    for caminho in saida:
        if not interessa(caminho):
            continue
        if do_index:
            r = subprocess.run(
                ["git", "show", f":{caminho}"], capture_output=True, text=True
            )
            if r.returncode:            # arquivo removido no índice
                continue
            yield caminho, r.stdout
        else:
            p = Path(caminho)
            if p.exists():
                yield caminho, p.read_text(encoding="utf-8", errors="replace")


def main() -> int:
    do_index = "--index" in sys.argv
    onde = "no índice (o que o commit grava)" if do_index else "na árvore de trabalho"

    por_id = defaultdict(list)
    for caminho, texto in arquivos_e_texto(do_index):
        for rotulo, rx in PADROES:
            for achado in set(rx.findall(texto)):
                por_id[achado].append(f"{caminho} ({rotulo})")

    if not por_id:
        print(f"checa_build: nenhum build id encontrado {onde} — nada a conferir.")
        return 0

    if len(por_id) == 1:
        build = next(iter(por_id))
        print(f"ok  build id único {onde}: {build} "
              f"({len(por_id[build])} ocorrências)")
        return 0

    # Maioria = o id que as páginas realmente têm; a minoria é quem está fora.
    ordem = sorted(por_id.items(), key=lambda kv: len(kv[1]), reverse=True)
    maioria, _ = ordem[0]
    print(f"FALHOU: {len(por_id)} build ids diferentes {onde}.", file=sys.stderr)
    print(f"        A equipe veria o banner 'Nova versão disponível' sem fim.\n",
          file=sys.stderr)
    for build, locais in ordem:
        marca = "maioria" if build == maioria else "FORA"
        print(f"  {build}  [{marca}]  {len(locais)} ocorrência(s)", file=sys.stderr)
        if build != maioria:
            for l in sorted(locais):
                print(f"      {l}", file=sys.stderr)
    print("\n  Causa quase sempre: publicação parcial. Republique o portal inteiro",
          file=sys.stderr)
    print("  (README, 'Como republicar') em vez de commitar alguns arquivos soltos.",
          file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
