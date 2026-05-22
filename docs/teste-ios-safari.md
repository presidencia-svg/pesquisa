# Roteiro de Testes — Safari iOS

**Pesquisa Sergipe 2026 · CDL Aracaju**
Versão 1.0 · Última atualização: 22 de maio de 2026

---

## Objetivo

Validar que o fluxo `/votar → /confirma → /otp` funciona corretamente em **Safari iOS** (iPhone e iPad), cobrindo:

- Modo normal (deve permitir cadastro)
- Modo privado (deve bloquear com mensagem iPhone-específica)
- Fingerprint estável dentro da sessão
- Mensagens de erro acessíveis
- Comportamento em diferentes versões do iOS

---

## Pré-requisitos

| Recurso | O que precisa |
|---|---|
| 1× iPhone com Safari (iOS 15+) | Ideal: 1 iPhone "antigo" (iOS 15/16) + 1 atual (iOS 17/18) |
| 1× iPad (opcional) | Validar layout em tela grande |
| 1× CPF válido para cadastro | Idealmente do testador ou autorizado |
| WhatsApp ativo no número informado | Receber OTP |
| Tela do desktop pra acompanhar logs Vercel | Filtro `[votar]` / `[spc]` / `[confirma]` |

---

## Bateria 1 — Safari iOS Modo Normal

### 1.1 — Carregamento da página `/votar`

**Passos:**
1. Abrir Safari no iPhone em **modo normal** (NÃO privado)
2. Navegar para `https://pesquisa.cdlaju.com.br/votar`
3. Aguardar carregamento completo

**Critérios de aceite:**
- [ ] Página carrega em < 3 segundos
- [ ] Cabeçalho "Identifique-se" visível
- [ ] Campo CPF aceita digitação numérica (teclado numérico abre)
- [ ] Widget Cloudflare Turnstile renderiza (aparece "Verificação")
- [ ] **NÃO aparece** o banner amarelo "Modo anônimo detectado"
- [ ] Botão "Continuar" inicia desabilitado (precisa do CPF + Turnstile + consentimento)

**Captura sugerida:** screenshot da tela completa.

### 1.2 — Cadastro completo

**Passos:**
1. Digitar CPF válido
2. Resolver Turnstile (se Cloudflare desafiar)
3. Marcar checkbox "Li e concordo com a Política de Privacidade"
4. Tocar em "Continuar"
5. Na tela `/confirma`, conferir prefill (município, sexo se vieram)
6. Preencher campos que faltam (escolaridade, WhatsApp se necessário)
7. Tocar em "Enviar código no WhatsApp"
8. Receber código no WhatsApp do número informado
9. Digitar OTP de 6 dígitos
10. Confirmar voto em pelo menos 1 cargo

**Critérios de aceite:**
- [ ] Transição entre páginas suave (sem flash branco prolongado)
- [ ] **Faixa etária NÃO é perguntada** (vem do SPC/cdl_base)
- [ ] WhatsApp aceita formato `(79) 99999-8888`
- [ ] OTP chega no WhatsApp em < 30 segundos
- [ ] Botão "Enviar código" mostra "Validando dispositivo…" enquanto o fingerprint é calculado
- [ ] Tela final confirma o voto

### 1.3 — Verificar fingerprint estável dentro da sessão

**Passos:**
1. No mesmo Safari, após terminar o fluxo, abrir DevTools remoto (Mac conectado por cabo → Safari → Desenvolver → \[seu iPhone\])
2. Verificar `localStorage.getItem('lgpd_training_v1')` se foi salvo
3. (Opcional) Inspecionar a aba Network, ver o POST do `/votar/confirma` e confirmar que `device_fingerprint` foi enviado com 64 chars hex

**Critérios de aceite:**
- [ ] `device_fingerprint` no body do POST tem 64 caracteres hex
- [ ] Mesmo CPF tentando de novo recebe "Esta pessoa já participou..."

---

## Bateria 2 — Safari iOS Modo Privado

### 2.1 — Detecção de modo privado

**Passos:**
1. No Safari iPhone, tocar no **botão de Abas** (ícone de dois quadrados, canto inferior direito)
2. Tocar em **"Privado"** no rodapé (vira azul quando ativo)
3. Tocar em **"+"** pra abrir nova aba privada
4. Navegar para `https://pesquisa.cdlaju.com.br/votar`

**Critérios de aceite:**
- [ ] Banner amarelo aparece com texto "Modo anônimo detectado"
- [ ] Lista numerada de instruções para sair do Modo Privado iOS aparece
- [ ] Botão "Continuar" fica desabilitado com texto "Não permitido em modo anônimo"
- [ ] Mesmo digitando CPF válido, o submit não dispara

**Captura sugerida:** screenshot do banner amarelo + botão desabilitado.

### 2.2 — Defesa em profundidade (server-side)

**Passos:**
1. Em DevTools remoto, com a página /votar em modo privado:
2. Console: editar manualmente o hidden input
   ```js
   document.querySelector('[name=navegador_anonimo]').value = '0'
   ```
3. Tentar submeter o form manualmente:
   ```js
   document.querySelector('form').requestSubmit()
   ```
   (ignorando o botão desabilitado)

**Critérios de aceite:**
- [ ] Mesmo com o hidden manipulado, se o CPF é válido, o cadastro segue
  *(servidor não tem como detectar via apenas o flag client-side se for adulterado)*
- [ ] Entretanto, outras camadas (CPF único, WhatsApp único) ainda travam votos múltiplos
- [ ] Vercel logs mostram a tentativa para auditoria

**Observação:** este teste valida a **limitação reconhecida** do design — flag anonimato é apenas client-side. Documentado em `app/votar/actions.ts`.

---

## Bateria 3 — Chrome iOS (WebKit)

> No iOS, **todos** os browsers (Chrome, Firefox, Edge, Brave) usam WebKit por imposição da Apple. Comportamento similar ao Safari.

### 3.1 — Carregamento Chrome iOS

**Passos:**
1. Abrir Chrome no iPhone
2. Navegar para `https://pesquisa.cdlaju.com.br/votar`

**Critérios de aceite:**
- [ ] Comporta-se como Safari iOS normal
- [ ] User-Agent contém `CriOS` (não confunde com Safari)
- [ ] **Mensagem específica de iOS NÃO aparece** (porque não é Safari)
- [ ] Banner amarelo de anonimato aparece em modo navegação privada do Chrome

---

## Bateria 4 — Cenários de erro

Testar cada erro com CPFs específicos via stub (precisa `SPC_MOCK=true` em produção temporariamente OU rodar local `npm run dev` com `.env.local` setando `SPC_MOCK=true`).

### 4.1 — CPF menor de 16 anos

**Passos:**
1. CPF qualquer válido terminado em **`333`** (ex: `12345678333`)
2. Continuar

**Critérios de aceite:**
- [ ] Mensagem amarela: "...idade mínima de 16 anos (Constituição Federal, art. 14, §1º). Volte quando completar a idade mínima."
- [ ] Link para `/transparencia` no rodapé do aviso
- [ ] Sem botão "Continuar" — bloqueio definitivo

### 4.2 — CPF inativo

**Passos:**
1. CPF qualquer válido terminado em **`111`**
2. Continuar

**Critérios de aceite:**
- [ ] Mensagem amarela: "Seu CPF não está ativo na Receita Federal (suspenso, cancelado ou nulo)..."

### 4.3 — CPF irregular

**Passos:**
1. CPF qualquer válido terminado em **`222`**

**Critérios de aceite:**
- [ ] Mensagem amarela mencionando gov.br/receitafederal

### 4.4 — CPF falecido

**Passos:**
1. CPF qualquer válido terminado em **`000`**

**Critérios de aceite:**
- [ ] Mensagem amarela: "A Receita Federal indica óbito... Em respeito ao titular..."
- [ ] Tom respeitoso (não erro vermelho)

### 4.5 — Erro técnico do SPC

**Passos:**
1. Em produção sem `SPC_MOCK`, com SPC quebrado: CPF qualquer
2. (Ou simular setando `SPC_USER` inválido temporariamente)

**Critérios de aceite:**
- [ ] Mensagem **vermelha** (erro real, não bloqueio definitivo)
- [ ] Texto inclui "Se persistir, contate dpo@cdlaju.com.br informando o horário"
- [ ] Código técnico (`servico_indisponivel`) visível pro suporte rastrear
- [ ] Link mailto pré-preenchido com subject

---

## Bateria 5 — Multivoto

### 5.1 — Mesmo CPF, segundo cadastro

**Passos:**
1. Cadastrar e votar com CPF X (Bateria 1.2)
2. Sair da página, abrir nova aba (mesmo Safari)
3. Tentar entrar com CPF X de novo

**Critérios de aceite:**
- [ ] Mensagem vermelha: "Esta pessoa já participou desta edição da pesquisa."

### 5.2 — Mesmo WhatsApp, CPFs diferentes

**Passos:**
1. CPF Y diferente de X, mesmo WhatsApp do passo 1
2. Avançar até `/confirma`

**Critérios de aceite:**
- [ ] Mensagem: "Este número de WhatsApp já foi usado para votar nesta pesquisa por outro CPF."

### 5.3 — Mesmo aparelho iPhone, CPFs diferentes

**Passos:**
1. CPF Z diferente, WhatsApp Z diferente, mesmo iPhone
2. Avançar até `/confirma`

**Critérios de aceite:**
- [ ] Mensagem: "Este dispositivo já foi usado para votar nesta pesquisa por outro CPF."

**Limitação iOS:** se o iPhone tiver atualizado iOS entre as tentativas, o fingerprint pode ter mudado e o bloqueio por dispositivo pode falhar. Caso ocorra, o CPF e o WhatsApp continuam como travas.

---

## Bateria 6 — Acessibilidade e UX

### 6.1 — Tamanho de toque (HIG iOS = 44pt mínimo)

- [ ] Botão "Continuar" tem altura ≥ 44pt (medir no Inspector)
- [ ] Checkboxes têm área clicável adequada (incluindo label)
- [ ] Links no rodapé têm espaçamento suficiente entre si

### 6.2 — Leitor de tela (VoiceOver)

**Passos:**
1. Ativar VoiceOver (Configurações → Acessibilidade)
2. Navegar pelos elementos da página `/votar`

**Critérios de aceite:**
- [ ] Cada campo tem label adequado lido
- [ ] Botão "Continuar" lê o estado (habilitado/desabilitado/validando)
- [ ] Banner de erro tem `role="alert"` e é anunciado quando aparece
- [ ] Banner de anonimato lê instruções iPhone passo a passo

### 6.3 — Dark mode

**Passos:**
1. Configurações iPhone → Tela e Brilho → Modo Escuro
2. Recarregar a página

**Critérios de aceite:**
- [ ] Cores se adaptam (texto não fica ilegível)
- [ ] Banners de erro/aviso mantêm contraste adequado
- [ ] Botões continuam visíveis e clicáveis

---

## Bateria 7 — Edge cases iOS específicos

### 7.1 — Bateria fraca / modo de baixo consumo

**Passos:**
1. Ativar Modo de Baixo Consumo no iPhone
2. Realizar fluxo completo

**Critérios de aceite:**
- [ ] Página carrega sem timeout
- [ ] Fingerprint é gerado dentro de 5 segundos
- [ ] OTP é entregue normalmente

### 7.2 — Conexão instável (3G ou simulada)

**Passos:**
1. Configurações → Celular → Dados Celulares Móveis → 3G (se disponível)
2. Ou usar Network Link Conditioner (Mac, conectado por cabo)
3. Fluxo completo

**Critérios de aceite:**
- [ ] Páginas carregam (pode ser lento mas sem erro)
- [ ] Botão "Validando…" mostra estado durante chamadas server
- [ ] Sem duplicate POST por toque duplo (botão desabilita)

### 7.3 — Rotação de tela (iPad / iPhone landscape)

- [ ] Layout adapta sem cortes
- [ ] Campos continuam acessíveis
- [ ] Banners mantém legibilidade

---

## Bateria 8 — Versões iOS testar

| iOS | Safari version | Status esperado |
|---|---|---|
| 15.x | 15.x | ✅ Funcional (suporte mínimo) |
| 16.x | 16.x | ✅ Funcional |
| 17.x | 17.x | ✅ Funcional, anti-fingerprint canvas ativo (mitigado) |
| 18.x | 18.x | ✅ Funcional |
| < 15 | — | ⚠️ Não suportado (storage.estimate ausente) |

---

## Como reportar achados

Quando algum item falhar:

1. **Screenshot ou screen recording** (Botão Liga/Desliga + Volume Aumentar)
2. **Versão exata do iOS** e Safari (Configurações → Geral → Sobre)
3. **Modelo do iPhone** (Configurações → Geral → Sobre → Modelo)
4. **Horário UTC da tentativa** (pra correlacionar com logs Vercel)
5. **Conexão** (Wi-Fi, 4G, 5G)
6. Enviar para **dpo@cdlaju.com.br** com subject "Teste iOS Safari — Pesquisa Sergipe 2026"

---

## Histórico de execuções

| Data | Testador | iPhone | iOS | Resultado | Achados |
|---|---|---|---|---|---|
| | | | | | |

---

## Anexos

- `docs/pentest-2026-05-segunda-rodada.md` — testes gerais de segurança
- `docs/stress-test-2026-05-22.md` — testes de carga
- `app/votar/cpf-form.tsx:39-103` — código do detector de anônimo
- `app/votar/confirma/dados-form.tsx:18-95` — código do fingerprint
