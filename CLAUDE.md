# Portal dos Bares — Grupo IZ

Site estático (GitHub Pages): https://rodrigopcviana-lab.github.io/grupo-iz-dashboard/

**Este repositório é público.** Nada de senha, chave, telefone, dado de venda ou
avaliação de segurança entra aqui — nem em arquivo, nem em mensagem de commit. O que for
sensível vai para `CLAUDE.local.md`, que é ignorado pelo git.

O `README.md` explica a estrutura e como republicar. Este arquivo cobre o que não é
óbvio lendo o código.

## Como funciona o acesso

Páginas públicas: `index`, `cocktails`, `rotinas`, `regras`, `contagem`, `curva-abc`,
`contatos`.

Páginas com dado restrito (`vendas/*.html`, `curva-abc.html`, `contagem.html`) são
**cascas sem dado embutido**: o número só chega depois de uma senha validada por um
Worker do Cloudflare, que serve o valor pré-computado de um KV. O arquivo publicado nunca
carrega o dado real.

Casas: `iz`, `1929`, `gra-bistro`, `famu`, `fulles`, `nip`.
O Bento tem site separado (`bento-dashboard`) — não entra aqui.

## Senhas

Secret de Worker no Cloudflare é **write-only**: `wrangler secret put` grava e ninguém lê
de volta, nem o dono da conta. Não existe senha em arquivo neste Mac para procurar — elas
estão no gerenciador de senhas.

Para trocar sem nunca imprimir na tela:

```bash
op read "op://<cofre>/<item>/password" | wrangler secret put SENHAS
```

A senha sai do cofre e entra no Worker direto — não passa por tela, por scrollback do
terminal, por arquivo, nem pelo contexto de um agente. Achar a referência certa com
`op vault list` e `op item list --vault "<nome>"`, que listam nomes e não valores.

## Regras que já custaram caro

- **Sem telefone em página pública.** `contatos.html` virou pública em 2026-07-04 e o
  telefone/WhatsApp de cada chefe saiu da página para isso ser possível. Só nome + cargo.
- **Dado real nunca vai embutido numa página.** Desde 2026-07-04 `vendas/*` e `curva-abc`
  são cascas vazias, e o número chega do KV depois da senha validada.
- **Não editar à mão** `index.html`, `cocktails.html`, `rotinas.html`, `regras.html`,
  `contatos.html`, `contagem.html`, `curva-abc.html` — são gerados por `portal_gen.py` no
  projeto `Code 1`. Editar aqui é trabalho perdido no próximo deploy.
- `.staticrypt.json` não é mais usado. Mantido por histórico; pode sair.
