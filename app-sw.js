/* Service worker só do app piloto (app.html) do Grupo IZ, separado do sw.js do site.
 *
 * Registrado pela casca com scope "app.html": o navegador escolhe o escopo
 * mais específico, então este cuida do app e o sw.js do site continua
 * cuidando das outras páginas. Publicar o app não exige republicar o site.
 *
 * Estratégia (26/11/2026, mesma ideia do portal de Medellín):
 *   - app.html: cópia primeiro. Abre na hora, com ou sem internet. A rede
 *     atualiza a cópia por trás, e a casca confere a versão em GET /api/app-iz (que ela já pede): versão
 *     nova é baixada e entra num momento seguro (ver confereVersao na casca).
 *   - app-versao.json: sempre rede, nunca guardado.
 *   - *.json do site: rede primeiro, cópia só sem internet.
 *   - O resto do mesmo endereço (scripts, ícones, manifesto): cópia primeiro,
 *     revalidando por trás.
 *   - Vídeo e outros domínios (o Worker, fontes): direto, sem passar aqui.
 * Nenhuma chamada a mais ao Worker: dado do Worker não passa por este arquivo.
 *
 * v2 (27/11/2026): a casca anterior ao "?nv=" conferia a versão pedindo o
 * app.html e recebia daqui a cópia velha, então nunca via a versão nova.
 * Trocar o nome do cache faz o activate apagar o v1 e, só se havia cache
 * velho, recarregar as telas abertas com a casca nova (guardada no install).
 * Na primeira instalação não recarrega nada.
 */
const CACHE = "iz-app-v2";
const PREFIXO = "iz-app-";
const CASCA = self.registration.scope; // .../app.html
const ATIVOS = ["app.webmanifest", "icon-192.png", "icon-512.png", "icon-512-maskable.png"];

function daRede(url) {
  return fetch(url, { cache: "no-store", credentials: "same-origin" }).then((res) =>
    res.redirected ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers }) : res
  );
}
// Lê só do cache desta versão: caches.match() sem nome procura em todos, e um
// iz-app-v1 recriado por uma casca velha devolveria a cópia antiga.
function daCopia(chave) {
  return caches.open(CACHE).then((c) => c.match(chave)).catch(() => undefined);
}
function guarda(chave, res) {
  if (res && res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(chave, copia)).catch(() => {});
  }
  return res;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all([CASCA].concat(ATIVOS.map((u) => new URL(u, CASCA).href)).map((u) =>
        daRede(u).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => {})
      ))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const velhos = (await caches.keys()).filter((k) => k.indexOf(PREFIXO) === 0 && k !== CACHE);
    await Promise.all(velhos.map((k) => caches.delete(k)));
    await self.clients.claim();
    if (!velhos.length) return;
    // Recarrega a tela aberta com a casca nova. "?sw=" muda o endereço de
    // propósito: navegar para o mesmo endereço com #hash só rola até o
    // trecho e não recarrega. A casca nova tira o "?sw=" e fica no mesmo #hash.
    const telas = await self.clients.matchAll({ type: "window" });
    await Promise.all(telas.map((c) => {
      const u = new URL(c.url);
      if (u.href.split("?")[0].split("#")[0] !== CASCA || !c.navigate) return null;
      u.searchParams.set("sw", CACHE);
      return c.navigate(u.href).catch(() => {});
    }));
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const ext = url.pathname.split(".").pop().toLowerCase();
  if (["mp4", "webm", "m4v", "mov"].includes(ext)) return;

  if (url.pathname.endsWith("app-versao.json")) {
    event.respondWith(daRede(req.url));
    return;
  }
  // app.html?nv=<versão> (27/11/2026): é a casca conferindo se a versão nova
  // já está no site. Vai direto à rede; pela regra da casca abaixo voltaria a
  // cópia velha e a versão nova só entrava ao fechar e abrir o app.
  if (url.searchParams.has("nv")) return;
  const ehCasca = req.mode === "navigate" || url.href.split("?")[0].split("#")[0] === CASCA;
  if (ehCasca) {
    event.respondWith((async () => {
      const rede = daRede(CASCA).then((r) => guarda(CASCA, r)).catch(() => null);
      const copia = await daCopia(CASCA);
      if (copia) { event.waitUntil(rede); return copia; }
      return (await rede) || new Response("<p style=\"font:16px sans-serif;padding:24px\">Sem internet e sem cópia do app neste aparelho. Abra de novo quando a internet voltar.</p>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
    })());
    return;
  }
  if (ext === "json") {
    event.respondWith(daRede(req.url).then((r) => guarda(req, r)).catch(() => daCopia(req)));
    return;
  }
  event.respondWith(
    daCopia(req).then((copia) => {
      const rede = daRede(req.url).then((r) => guarda(req, r)).catch(() => copia || Response.error());
      if (copia) { event.waitUntil(rede); return copia; }
      return rede;
    })
  );
});
