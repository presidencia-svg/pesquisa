# Política de Segurança

**Pesquisa Sergipe 2026 — CDL Aracaju**

Última atualização: 18 de maio de 2026

---

## Por que este arquivo existe

Este projeto é **público para auditoria** (ver `LICENSE`), e a postura
de segurança da CDL Aracaju inclui receber e tratar relatórios de
vulnerabilidade de pesquisadores externos. Este documento descreve
como reportar de forma responsável.

---

## Como reportar uma vulnerabilidade

**Canal preferencial:** envie e-mail criptografado ou em texto simples para:

📧 **dpo@cdlaju.com.br**

Inclua, se possível:

- Descrição da vulnerabilidade (em português ou inglês)
- Passos para reprodução
- Impacto potencial (qualitativo)
- Sugestão de correção, se houver
- Sua identificação e canal de contato (opcional, mas facilita o agradecimento público)

**Canal alternativo (urgência alta):** WhatsApp 24/7 da DPO (Encarregada de Dados):

📱 **(79) 98115-5558** — Claudimara Fontes Carvalho

---

## Compromisso de resposta

| Severidade | Resposta inicial | Mitigação | Comunicação ao reportante |
|---|---|---|---|
| **Crítica** (RCE, vazamento de dados, fraude eleitoral) | 4 horas | 24 horas | Atualizações a cada 24 h |
| **Alta** | 24 horas | 7 dias | Atualizações semanais |
| **Média** | 3 dias úteis | 30 dias | Status na resolução |
| **Baixa** | 7 dias úteis | Próxima janela | Status na resolução |

Os critérios de severidade seguem o detalhamento do `docs/plano-incidente.md`.

---

## Disclosure responsável

Solicitamos que pesquisadores:

1. **Não divulguem publicamente** a vulnerabilidade antes de termos
   ao menos contido o risco (90 dias de embargo padrão, conforme
   prática internacional);
2. **Não acessem dados pessoais reais** durante a verificação — use
   o ambiente de homologação ou solicite acesso controlado;
3. **Não realizem DoS** ou ataques que degradem o serviço durante
   o período de testes;
4. **Não tentem persistir** acesso ou movimentar-se lateralmente
   após confirmar a vulnerabilidade.

Em contrapartida, comprometemo-nos a:

1. **Agradecer publicamente** o reportante (a menos que prefira anonimato);
2. **Não tomar medidas legais** contra reportes feitos em boa-fé,
   dentro deste escopo;
3. **Manter o reportante informado** durante toda a resolução;
4. **Publicar um post-mortem** sumarizado, com crédito ao reportante,
   após o fechamento do incidente.

---

## Escopo

### Em escopo

- Aplicação web em `https://pesquisa.cdlaju.com.br` e subdomínios
- API em `https://pesquisa.cdlaju.com.br/api/*`
- Banco de dados Supabase (acesso indireto pela aplicação)
- Código-fonte neste repositório

### Fora de escopo

- Infraestrutura da Vercel, Supabase, Cloudflare ou outros provedores
  (reporte diretamente a eles);
- Serviços de terceiros (SPC Brasil, Meta WhatsApp Cloud API);
- Sites institucionais da CDL Aracaju não-pesquisa
  (`cdlaju.com.br`, `inet.cdlaju.com.br`, etc.);
- Engenharia social contra funcionários ou diretores;
- Ataques físicos (escritório, dispositivos);
- DoS volumétrico (use rate limit do CDN para testar);
- Spam de OTP ou abuso intencional do canal de WhatsApp.

---

## Recompensa

Este programa **não oferece recompensa monetária** (bug bounty) no
momento. Reconhecimento é exclusivamente público (com permissão do
reportante), por meio de:

- Citação em `docs/security-credits.md` (a ser criado);
- Menção pública em comunicado da CDL Aracaju.

A CDL Aracaju se reserva o direito de oferecer reconhecimento
adicional (ex: agradecimento institucional, certificado, doação a
ONG) caso a contribuição seja particularmente impactante.

---

## Histórico

| Data | Reportante | Severidade | Status |
|---|---|---|---|
| (vazio) | — | — | — |

---

## Conformidade

Este programa de divulgação responsável é compatível com:

- [RFC 9116 — A File Format to Aid in Security Vulnerability Disclosure](https://datatracker.ietf.org/doc/html/rfc9116)
- [ISO/IEC 29147:2018 — Vulnerability disclosure](https://www.iso.org/standard/72311.html)
- Diretrizes da Autoridade Nacional de Proteção de Dados (ANPD)
  sobre comunicação de incidentes

O arquivo `/.well-known/security.txt` deste site fornece versão
machine-readable destas informações.
