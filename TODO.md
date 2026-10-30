# Dekolaê Sunset — Live Performance & Cortesias Tracker

## Status: Produção / Homologado ✅

- [x] Conexão com API REST Shotgun Live (organizador 256131, evento 590935)
- [x] Auditoria cirúrgica de cortesias por parceiro (Shopping Vitória, Rádio, Imprensa, Grupo SIM, Rede Tribuna, Café de La Musique, Marcos Lepaus, Hotel Ilha do Boi, Friends, Sorteio)
- [x] Ocupação física de cortesias por setor (Pista / Deck: 202 | Front Stage: 82 | Lounges: 60 | Camarote: 0)
- [x] Confirmação de blindagem de estoque: 100% das cotas institucionais zeradas (`quantity: 0`)
- [x] Termômetro de lotes comerciais e faturamento acumulado (R$ 100.836,00 em 693 vendas pagas)
- [x] Pacing diário e velocidade 24h / 7d
- [x] Exportação de CSV de titulares e busca em tempo real
- [x] Aplicação de Modern Web Guidance:
  - [x] LCP Hero Image: `fetchPriority="high"`, `decoding="async"`
  - [x] `same-document-transitions`: View Transitions API em abas com fallback
  - [x] `defer-rendering-heavy-content`: `content-visibility: auto; contain-intrinsic-size: auto none auto 400px;`
  - [x] `accessibility`: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-live="polite"`, `<caption>`, `th scope="col"`, `role="region"`
  - [x] `dark-mode`: `color-scheme: dark;` em `:root`
  - [x] Scrollbar padronizada: `scrollbar-color` e `scrollbar-width: thin`
  - [x] Tipografia: `text-wrap: balance` e `text-wrap: pretty`
- [x] Repositório publicado no GitHub: `versavisual-vinicius/dekolae-tracker`
- [x] Túnel Cloudflare público ativo para o cliente
