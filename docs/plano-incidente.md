# Plano de Resposta a Incidentes de Segurança da Informação

**Pesquisa Sergipe 2026 · CDL Aracaju**
Versão 1.0 · 13 de maio de 2026

---

## Propósito

Este documento estabelece o **procedimento formal** que a CDL Aracaju adotará em caso de incidente de segurança envolvendo dados pessoais tratados pela Pesquisa Sergipe 2026, em conformidade com:

- Lei nº 13.709/2018 (LGPD), arts. 46 a 49
- Resolução CD/ANPD nº 15/2024 (notificação de incidentes)
- Resolução TSE nº 23.747/2026

---

## 1. Definição de incidente

Considera-se **incidente de segurança com dados pessoais** qualquer evento que cause:

| Tipo | Exemplos |
|---|---|
| **Confidencialidade** | Vazamento de banco; secret expostos; ataque que ganhou leitura indevida |
| **Integridade** | Adulteração de votos ou cadastros; SQL injection bem sucedida |
| **Disponibilidade** | DoS prolongado (> 1h); ransomware; perda de banco sem backup |
| **Autenticidade** | Comprometimento de OTP; phishing efetivo contra admin |

---

## 2. Comitê de Resposta a Incidente (CRI)

Composição **mínima** (todos com atribuições simultâneas):

| Papel | Função | Responsável |
|---|---|---|
| **Coordenador** | Decisão final, comunicação externa | Presidente da CDL ou suplente |
| **DPO** | Comunicação ANPD + titulares, atendimento jurídico | [NOME DPO] |
| **Tech Lead** | Diagnóstico técnico, contenção, mitigação | [NOME TÉCNICO] |
| **Jurídico** | Análise legal, comunicação com TRE/SE | Advogado eleitoralista da CDL |
| **Comunicação** | Notas oficiais para imprensa, redes sociais | Departamento de comunicação |

**Acionamento:** qualquer membro da equipe técnica que **suspeite** de incidente deve comunicar imediatamente o DPO. O DPO **decide em até 1 hora** se aciona o Comitê.

**Canais de acionamento (24/7):**
- WhatsApp do DPO: (79) _____-_____
- WhatsApp do Presidente: (79) _____-_____
- Email: dpo@cdlaju.com.br (monitorado nos dias úteis; em emergência usar WhatsApp)

---

## 3. Classificação de severidade

| Nível | Critério | Ação imediata |
|---|---|---|
| **CRÍTICA** | Vazamento de banco; admins comprometidos; pesquisa adulterada | Convoca CRI **imediatamente**; tira pesquisa do ar; notifica ANPD em 24h |
| **ALTA** | Acesso indevido sem confirmação de vazamento; DoS prolongado; CVE crítica de dependência | CRI em ≤ 6h; mitiga em ≤ 24h; avalia notificação ANPD |
| **MÉDIA** | Tentativa de ataque bloqueada com sinais de persistência; vulnerabilidade encontrada antes de exploração | CRI reunião próxima 24h; patch em ≤ 7 dias |
| **BAIXA** | Tentativas isoladas de bruteforce; logs anômalos sem efeito | Documenta no log de incidente; sem ação especial |

---

## 4. Procedimento (fases NIST 800-61 adaptadas)

### Fase 1 — Detecção e análise (T+0 a T+2h)

**Fontes de detecção:**
- Alertas automáticos (futuro: integração Supabase + Sentry)
- Reclamação de titular pelo canal DPO
- Notificação externa (ANPD, TRE/SE, pesquisador de segurança)
- Anomalia em logs (rate limit batendo muito; queries lentas; queda)

**Ações imediatas:**
1. DPO recebe a comunicação e abre **Ticket de Incidente** (planilha controlada).
2. Tech Lead coleta evidências **sem alterar o estado** do sistema:
   - Snapshot dos logs Vercel (últimas 24h)
   - Snapshot do Supabase (dump SQL via `pg_dump` se possível)
   - Capturas de tela das evidências externas
3. DPO classifica severidade (tabela seção 3).
4. Se CRÍTICA/ALTA → DPO aciona Comitê em até 1h.

### Fase 2 — Contenção (T+2h a T+24h)

**Ações de contenção possíveis (escala conforme severidade):**

#### Nível 1 — Reativo
- Rotacionar secrets (`CPF_HASH_SECRET`, `JWT_SECRET`, `TOKEN_VOTO_SECRET`, `ADMIN_PASSWORD`, `ADMIN_TOTP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) na Vercel.
- Forçar logout de todas as sessões admin: revogar cookie via mudança do `JWT_SECRET`.
- Resetar `ADMIN_TOTP_SECRET` e re-cadastrar Authenticator.

#### Nível 2 — Isolamento
- Retirar divulgação dos resultados via `/admin/edicoes` → "Retirar divulgação". Site mostra "Em breve aqui" enquanto investiga.
- Desativar edição ativa (mesmo admin) → bloqueia novos cadastros e votos.

#### Nível 3 — Modo de manutenção
- Adicionar `MAINTENANCE_MODE=true` na Vercel → app retorna 503 em todas as rotas (precisa implementar middleware, ver TODO).
- Substituir homepage por nota institucional.

#### Nível 4 — Tirar do ar completamente
- Pausar deploy na Vercel.
- Restaurar backup do Supabase (point-in-time, último estado válido).

### Fase 3 — Erradicação (T+24h a T+72h)

- Tech Lead identifica **causa raiz**:
  - Que vulnerabilidade foi explorada?
  - Quando começou?
  - Quantos titulares afetados?
  - Quais dados foram comprometidos?
- Aplica fix (commit + deploy).
- Roda **novo pentest** ou solicita externo se a vulnerabilidade for grave.
- Audita outras superfícies para garantir que o mesmo padrão de bug não existe.

### Fase 4 — Recuperação (T+72h a T+1 semana)

- Restaura serviços por etapa:
  1. Banco (com snapshot antes do incidente)
  2. App em modo somente leitura → testa
  3. Reabilita escrita (cadastros + votos)
  4. Reabilita divulgação dos resultados (apenas se não houver adulteração)
- Monitora intensivamente nos primeiros 7 dias (logs, métricas, reclamações).

### Fase 5 — Pós-incidente (T+1 semana a T+30 dias)

- Reunião do CRI para **retrospectiva**:
  - O que funcionou
  - O que falhou
  - O que precisa mudar
- Atualiza este plano com lições aprendidas → nova versão.
- Atualiza `docs/security.md` e `docs/pentest-*.md`.
- Comunica titulares e ANPD do **fechamento** do incidente.

---

## 5. Comunicação à ANPD

**Base legal:** Art. 48 LGPD + Res. CD/ANPD 15/2024.

### Quando notificar

Obrigatório quando o incidente **pode** acarretar risco ou dano relevante aos titulares. Em dúvida, **notificar**.

**Prazo:** **3 dias úteis** após o conhecimento (Res. 15/2024 art. 7).

**Não notificar se:** o vazamento foi de dados não-pessoais OU os dados estavam efetivamente anônimos (Art. 12 LGPD).

### Como notificar

1. Acessar https://www.gov.br/anpd/pt-br
2. Procurar "Comunicação de incidente"
3. Preencher formulário oficial (`SEI` do ANPD)

### Conteúdo da comunicação (Art. 48 §1º LGPD)

1. **Descrição** da natureza dos dados afetados
2. **Informações sobre os titulares** envolvidos (categorias, número aproximado)
3. **Indicação das medidas técnicas** e de segurança utilizadas
4. **Riscos** relacionados ao incidente
5. **Motivos da demora**, no caso em que a comunicação não foi imediata
6. **Medidas que foram ou serão adotadas** para reverter ou mitigar os efeitos do prejuízo

### Quem comunica

**Apenas o DPO**, com aprovação prévia do Coordenador (Presidente).

---

## 6. Comunicação aos titulares

Obrigatória quando o risco for **relevante** (Art. 48 LGPD).

### Canais
1. **Email** (se tivermos email do titular — só do admin/parceiros)
2. **WhatsApp** (mensagem direta aos números cadastrados)
3. **Nota no site** `/incidente` (página criada ad hoc)
4. **Comunicado público** se incidente afetar > 10.000 titulares

### Conteúdo
- O que aconteceu (em linguagem simples)
- Quais dados podem ter sido afetados
- O que estamos fazendo
- O que o titular deve fazer (mudar senha, etc)
- Como entrar em contato com o DPO
- Direitos do titular (Art. 18 LGPD)

### Prazo
**Sem demora injustificada** após conhecimento (Art. 48 LGPD). Recomendação prática: até 7 dias.

---

## 7. Comunicação ao TRE/SE

Se o incidente afetar:
- Integridade dos resultados publicados
- Anonimato dos votos
- Cumprimento da Resolução TSE 23.747/2026

→ Comunicação ao **TRE/SE** em até **48 horas** via:
- Email pesqele@tre-se.jus.br
- Petição formal no sistema PesqEle

---

## 8. Comunicação à imprensa

**Princípio:** transparência ativa, sem alarmismo.

- Comunicado oficial **apenas após** o Comitê ter o diagnóstico técnico básico.
- Departamento de Comunicação redige, DPO e Jurídico revisam, Presidente aprova.
- Canal: nota oficial no site + redes sociais da CDL.
- **Não** dar entrevistas individuais até comunicado oficial estar publicado.

---

## 9. Tabela-resumo de prazos

| Ação | Prazo a partir do conhecimento |
|---|---|
| Acionamento DPO | Imediato |
| Decisão do DPO (acionar Comitê ou não) | 1 hora |
| Reunião do CRI (CRÍTICA/ALTA) | 6 horas |
| Contenção inicial | 24 horas |
| Notificação ANPD (se necessário) | 3 dias úteis |
| Notificação TRE/SE (se incidente eleitoral) | 48 horas |
| Comunicação aos titulares (se risco relevante) | 7 dias |
| Causa raiz identificada | 72 horas |
| Comunicado público (se necessário) | Após contenção; idealmente em 7 dias |
| Retrospectiva e plano de melhorias | 30 dias após resolução |

---

## 10. Registro de incidentes

Todo incidente — mesmo BAIXA ou tentado-e-bloqueado — é registrado em planilha controlada pelo DPO contendo:

- ID do incidente
- Data/hora da detecção
- Detector (humano/automático)
- Severidade classificada
- Descrição
- Ações tomadas (timeline)
- Notificações enviadas (ANPD, titulares, TRE/SE, imprensa)
- Causa raiz
- Lições aprendidas
- Status (Aberto / Em andamento / Resolvido / Encerrado)

### Localização da planilha

[A definir antes do lançamento — sugestão: Google Sheets compartilhado entre membros do CRI, com versionamento ativo]

---

## 11. Testes do plano (drill)

O plano será testado **simulação completa** em:

- **Pré-lançamento (agosto/2026):** simulação de vazamento de banco. Mede TTR (Time To Respond) de cada papel.
- **Trimestralmente após divulgação:** simulação mais leve (1 papel ausente, descoberta inesperada, etc).

Resultados dos drills atualizam este documento.

---

## 12. Limitações conhecidas

- **Não temos hoje** monitoramento ativo 24/7 (Sentry, PagerDuty, etc). Detecção depende de admin ver alerta ou titular comunicar. **Pendente**: instalar Sentry pra `app/votar/**` antes do lançamento.
- **Backup off-site não implementado** (apenas Supabase 7 dias). Em caso de ransomware do Supabase, perda de até 7 dias.
- **CRI não tem ainda nomes preenchidos** — pendência administrativa.

---

## 13. Aprovação e revisão

**Aprovado pela Diretoria em:** ____ / ____ / 2026 — Ata nº _____

| Versão | Data | Mudanças |
|---|---|---|
| 1.0 | 13/05/2026 | Versão inicial |

---

## Anexos

- `docs/lgpd.md` — Conformidade LGPD operacional
- `docs/ata-dpo.md` — Designação do DPO
- `docs/ripd.md` — Relatório de Impacto à Proteção de Dados
- `docs/security.md` — Modelo de ameaças
- `docs/pentest-2026-05.md` — Pentest interno
