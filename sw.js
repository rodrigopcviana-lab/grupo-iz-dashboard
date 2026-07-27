/* Service worker do Portal dos Bares — Grupo IZ (PLANO_APP_PWA.md, Fase 2).
 * rede-primeiro p/ HTML e *.json (fresco online, cache como reserva offline);
 * cache-primeiro p/ a casca (css/ícones/manifesto), revalidando por trás.
 * Só GET — escrita (contagem/turno/registro) NÃO passa por aqui; a fila
 * offline durável entra na Fase 3. Caminhos relativos: funciona em localhost
 * e em /grupo-iz-dashboard/ (Pages). */
/* O nome do cache carrega o id do build (trocado em main(), mesma marca das
 * páginas). Assim toda publicação nova nasce com um cache NOVO e o `activate`
 * abaixo apaga o anterior — a casca (ícones, manifesto) fica fresca sozinha,
 * sem custar uma ida à rede a cada carregamento como o rede-primeiro custaria
 * num stylesheet, que bloqueia a renderização.
 *
 * O CSS ainda assim é pedido como `portal.css?v=<build>` pelas páginas: a
 * troca de service worker não é instantânea — na PRIMEIRA navegação depois de
 * uma publicação quem responde ainda é o worker anterior, que serviria o CSS
 * velho do cache dele. Com o ?v= no endereço, a busca no cache antigo erra
 * (endereço novo) e o CSS novo vem da rede já nessa primeira carga. */
const CACHE = "iz-portal-00e30d6c689d";
const CORE = [
  "index.html",
  /* com o ?v= do build, igual ao <link> das páginas — precisa bater byte a
     byte, senão a busca no cache erra e o offline fica sem CSS. */
  "portal.css?v=00e30d6c689d",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png",
  "apple-touch-icon.png",
];

/* Busca da REDE de verdade, furando o cache HTTP do navegador (ver comentário
 * do gerador: o Pages manda max-age=600 e não dá pra desligar lá). Resposta
 * que veio de redirecionamento é reembalada — o navegador recusa atender uma
 * navegação com uma Response `redirected`. */
function daRede(req) {
  return fetch(req.url, { cache: "no-store", credentials: "same-origin" }).then((res) =>
    res.redirected
      ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers })
      : res
  );
}

function guarda(req, res) {
  if (res && res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
  }
  return res;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // um a um (não addAll): addAll é tudo-ou-nada, então um único 404 abortava
  // o precache inteiro. E cada um vai de no-store, senão o precache nasce com
  // a cópia velha do cache HTTP.
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        CORE.map((u) =>
          fetch(u, { cache: "no-store" })
            .then((r) => (r.ok ? c.put(u, r) : null))
            .catch(() => {})
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;              // escrita não passa pelo SW
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Worker/KV externos: rede direta

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
  // versao.json é consultado a cada poucos minutos com um ?t= diferente pra
  // furar proxy — cada consulta viraria uma entrada nova e eterna no cache.
  // Vai direto pra rede e não é guardado; offline a consulta simplesmente
  // falha, que é o certo (não há como saber de versão nova sem rede).
  if (url.pathname.endsWith("versao.json")) {
    event.respondWith(daRede(req));
    return;
  }

  // *.json é dado buscado por fetch (changelog, receitas_idx) — nunca casca.
  // `.webmanifest` não casa aqui de propósito: esse é casca.
  const isDado = url.pathname.endsWith(".json");

  if (isHTML || isDado) {
    event.respondWith(
      daRede(req)
        .then((res) => guarda(req, res))
        .catch(() => caches.match(req).then((r) => r || (isHTML ? caches.match("index.html") : undefined)))
    );
  } else {
    event.respondWith(
      caches.match(req).then((cacheado) => {
        const rede = daRede(req).then((res) => guarda(req, res)).catch(() => cacheado);
        return cacheado || rede;
      })
    );
  }
});

// Push (Central de Demandas) — só dispara em quem assinou pelo botão
// "Ativar notificações" de demandas.html; não muda a estratégia de cache
// acima, por isso não precisa bump de CACHE.
self.addEventListener("push", (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; } catch (e) {}
  const titulo = dados.title || "Central de Demandas";
  const opcoes = {
    body: dados.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: dados.url || "demandas.html" },
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = (event.notification.data && event.notification.data.url) || "demandas.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if (c.url.indexOf(alvo) >= 0 && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(alvo);
    })
  );
});
